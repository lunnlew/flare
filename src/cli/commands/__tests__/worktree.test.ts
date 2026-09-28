import { vi, describe, test, expect, beforeEach } from 'vitest';

const mockWorktreeManager = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  switch: vi.fn(),
  merge: vi.fn(),
  cleanup: vi.fn(),
}));

vi.mock('../../../storage/worktree.js', () => ({
  worktreeManager: mockWorktreeManager,
}));

import { worktreeCommand } from '../worktree.js';

describe('worktree', () => {
  beforeEach(() => {
    // Reset individual mocks
    mockWorktreeManager.list.mockReset();
    mockWorktreeManager.create.mockReset();
    mockWorktreeManager.remove.mockReset();
    mockWorktreeManager.switch.mockReset();
    mockWorktreeManager.merge.mockReset();
    mockWorktreeManager.cleanup.mockReset();

    // Set defaults
    mockWorktreeManager.list.mockResolvedValue([]);
  });

  describe('主体', () => {
    test('[主体] no arguments shows help', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand([]);

      expect(consoleLogSpy).toHaveBeenCalled();
      const helpText = consoleLogSpy.mock.calls.join('');
      expect(helpText).toContain('Worktree Management Commands');
      expect(helpText).toContain('flare-api worktree list');
      expect(helpText).toContain('flare-api worktree create');

      consoleLogSpy.mockRestore();
    });

    test('[主体] list shows worktrees', async () => {
      mockWorktreeManager.list.mockResolvedValue([
        { name: 'feature-1', path: '/path/to/feature-1', branch: 'worktree/feature-1', isMain: false },
        { name: 'feature-2', path: '/path/to/feature-2', branch: 'worktree/feature-2', isMain: false },
      ]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['list']);

      expect(mockWorktreeManager.list).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 worktree(s)'));

      consoleLogSpy.mockRestore();
    });

    test('[主体] list with empty shows message', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['list']);

      expect(consoleLogSpy).toHaveBeenCalledWith('No worktrees found.');

      consoleLogSpy.mockRestore();
    });

    test('[主体] create success shows output', async () => {
      mockWorktreeManager.create.mockResolvedValue({
        name: 'my-feature',
        path: '/path/to/my-feature',
        branch: 'worktree/my-feature',
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['create', 'my-feature']);

      expect(mockWorktreeManager.create).toHaveBeenCalledWith({
        name: 'my-feature',
        branch: undefined,
      });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Worktree created successfully'));

      consoleLogSpy.mockRestore();
    });

    test('[主体] create with branch name', async () => {
      mockWorktreeManager.create.mockResolvedValue({
        name: 'my-feature',
        path: '/path/to/my-feature',
        branch: 'custom-branch',
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['create', 'my-feature', 'custom-branch']);

      expect(mockWorktreeManager.create).toHaveBeenCalledWith({
        name: 'my-feature',
        branch: 'custom-branch',
      });

      consoleLogSpy.mockRestore();
    });

    test('[主体] remove success', async () => {
      mockWorktreeManager.remove.mockResolvedValue(true);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['remove', 'old-feature']);

      expect(mockWorktreeManager.remove).toHaveBeenCalledWith('old-feature');
      expect(consoleLogSpy).toHaveBeenCalledWith('Worktree removed successfully');

      consoleLogSpy.mockRestore();
    });

    test('[主体] switch success', async () => {
      mockWorktreeManager.switch.mockResolvedValue(true);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['switch', 'my-feature']);

      expect(mockWorktreeManager.switch).toHaveBeenCalledWith('my-feature');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Switched to worktree'));

      consoleLogSpy.mockRestore();
    });

    test('[主体] merge success', async () => {
      mockWorktreeManager.merge.mockResolvedValue(true);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['merge', 'my-feature']);

      expect(mockWorktreeManager.merge).toHaveBeenCalledWith('my-feature', 'main');
      expect(consoleLogSpy).toHaveBeenCalledWith('Merge completed successfully');

      consoleLogSpy.mockRestore();
    });

    test('[主体] merge with target branch', async () => {
      mockWorktreeManager.merge.mockResolvedValue(true);

      await worktreeCommand(['merge', 'my-feature', 'develop']);

      expect(mockWorktreeManager.merge).toHaveBeenCalledWith('my-feature', 'develop');
    });

    test('[主体] cleanup success', async () => {
      mockWorktreeManager.cleanup.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['cleanup']);

      expect(mockWorktreeManager.cleanup).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Cleanup completed');

      consoleLogSpy.mockRestore();
    });
  });

  describe('边界', () => {
    test('[边界] create without name shows error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['create']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Worktree name is required');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] create failure shows error', async () => {
      mockWorktreeManager.create.mockResolvedValue(null);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['create', 'failing-feature']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create worktree');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] remove without name shows error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['remove']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Worktree name is required');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] remove failure shows error', async () => {
      mockWorktreeManager.remove.mockResolvedValue(false);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['remove', 'nonexistent']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to remove worktree');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] switch without name shows error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['switch']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Worktree name is required');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] switch failure shows error', async () => {
      mockWorktreeManager.switch.mockResolvedValue(false);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['switch', 'nonexistent']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to switch worktree');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] merge without name shows error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['merge']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Worktree name is required');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] merge failure shows error', async () => {
      mockWorktreeManager.merge.mockResolvedValue(false);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['merge', 'nonexistent']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to merge worktree');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] unknown action shows error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await worktreeCommand(['unknown-action']);
      } catch (e) {
        // Expected - process.exit throws
      }

      // Verify error was logged - process.exit behavior is implementation detail
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown action: unknown-action');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('流程', () => {
    test('[流程] create then list shows new worktree', async () => {
      mockWorktreeManager.create.mockResolvedValue({
        name: 'new-feature',
        path: '/path/to/new-feature',
        branch: 'worktree/new-feature',
      });
      mockWorktreeManager.list.mockResolvedValue([
        { name: 'new-feature', path: '/path/to/new-feature', branch: 'worktree/new-feature', isMain: false },
      ]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await worktreeCommand(['create', 'new-feature']);
      await worktreeCommand(['list']);

      expect(mockWorktreeManager.create).toHaveBeenCalled();
      expect(mockWorktreeManager.list).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    test('[流程] create then remove removes worktree', async () => {
      mockWorktreeManager.create.mockResolvedValue({
        name: 'temp-feature',
        path: '/path/to/temp-feature',
        branch: 'worktree/temp-feature',
      });
      mockWorktreeManager.remove.mockResolvedValue(true);

      await worktreeCommand(['create', 'temp-feature']);
      await worktreeCommand(['remove', 'temp-feature']);

      expect(mockWorktreeManager.create).toHaveBeenCalled();
      expect(mockWorktreeManager.remove).toHaveBeenCalledWith('temp-feature');
    });
  });
});