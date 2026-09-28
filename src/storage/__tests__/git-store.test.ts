import { vi, describe, test, expect, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks before vi.mock is called
const { mockExecFn, mockExecSyncFn } = vi.hoisted(() => {
  return {
    mockExecFn: vi.fn(),
    mockExecSyncFn: vi.fn().mockReturnValue(''),
  };
});

vi.mock('../../storage/exec.js', () => ({
  exec: mockExecFn,
  execSync: mockExecSyncFn,
}));

// Import after mocks are set up
import { GitStore } from '../index.js';

describe('GitStore', () => {
  let store: GitStore;

  const createMockAPI = (name: string = 'test-api') => ({
    name,
    version: '1.0.0',
    baseUrl: 'https://api.example.com',
    endpoints: [
      {
        path: '/users',
        method: 'GET' as const,
        responses: { '200': { statusCode: 200 } },
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    store = new GitStore('/test/base/path');
    mockExecFn.mockReset();
    mockExecSyncFn.mockReset();
    mockExecSyncFn.mockReturnValue('');
    mockExecFn.mockResolvedValue('');
  });

  // Core Flows
  describe('Core', () => {
    test('[Core] saveAPI writes API and commits', async () => {
      const api = createMockAPI('github');
      mockExecFn.mockResolvedValue('');
      mockExecSyncFn.mockReturnValue('');

      await store.saveAPI(api);

      // Verify commit was called
      const commitCall = mockExecFn.mock.calls.find(
        call => call[0] === 'git' && call[1].includes('commit')
      );
      expect(commitCall).toBeDefined();
    });

    test('[Core] loadAPI returns null when file not found', async () => {
      mockExecSyncFn.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = await store.loadAPI('nonexistent.yaml');
      expect(result).toBeNull();
    });

    test('[Core] listAPIs returns empty array when git ls-tree fails', async () => {
      mockExecSyncFn.mockImplementation(() => {
        throw new Error('Git error');
      });

      const apis = await store.listAPIs();
      expect(apis).toEqual([]);
    });

    test('[Core] deleteAPI calls git rm', async () => {
      mockExecFn.mockResolvedValue('');

      await store.deleteAPI('github');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['rm']),
        '/test/base/path'
      );
    });
  });

  // Git Operations
  describe('Git Operations', () => {
    test('getHistory returns commit list', async () => {
      mockExecFn.mockResolvedValue('abc123|abc123|feat: add api|Test User|test@example.com|1700000000|');

      const history = await store.getHistory('github', 10);
      expect(history).toHaveLength(1);
      expect(history[0].shortHash).toBe('abc123');
    });

    test('getHistory with no API name returns commits', async () => {
      mockExecFn.mockResolvedValue('abc123|abc123|Initial commit|Test User|test@example.com|1700000000|');

      const history = await store.getHistory(undefined, 10);
      expect(history).toHaveLength(1);
    });

    test('diff returns parsed diff result', async () => {
      mockExecFn.mockResolvedValue(`diff --git a/.flare/apis/github.yaml b/.flare/apis/github.yaml
index 1234567..abcdefg 100644
--- a/.flare/apis/github.yaml
+++ b/.flare/apis/github.yaml
@@ -1,3 +1,4 @@
 name: github
-version: "1.0.0"
+version: "2.0.0"
 baseUrl: https://api.github.com`);

      const diff = await store.diff('github', 'abc123', 'def456');
      expect(diff.files.length).toBeGreaterThan(0);
    });

    test('status returns repo status', async () => {
      mockExecFn.mockResolvedValue('M  .flare/apis/github.yaml\n??  .flare/apis/new.yaml');

      const status = await store.status();
      expect(status.clean).toBe(false);
      expect(status.staged).toContain('.flare/apis/github.yaml');
      // Untracked files may have leading space due to porcelain format
      expect(status.untracked.some(f => f.trim() === '.flare/apis/new.yaml')).toBe(true);
    });

    test('status parses clean repo', async () => {
      mockExecFn.mockResolvedValue('');

      const status = await store.status();
      expect(status.clean).toBe(true);
    });

    test('stage adds files to index', async () => {
      mockExecFn.mockResolvedValue('');

      await store.stage(['.flare/apis/github.yaml']);

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['add']),
        '/test/base/path'
      );
    });

    test('commit creates commit with message', async () => {
      mockExecFn.mockResolvedValue('');

      await store.commit('feat: test commit');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        ['commit', '-m', 'feat: test commit'],
        '/test/base/path'
      );
    });
  });

  // Branch Operations
  describe('Branch Operations', () => {
    test('listBranches returns branch list', async () => {
      mockExecFn.mockResolvedValue('* main\n  develop');

      const branches = await store.listBranches();
      expect(branches.length).toBe(2);
      expect(branches.find(b => b.current)?.name).toBe('main');
    });

    test('listBranches parses remote branches', async () => {
      mockExecFn.mockResolvedValue('* main\n  remotes/origin/main');

      const branches = await store.listBranches();
      expect(branches.some(b => b.name === 'main' && b.current)).toBe(true);
    });

    test('checkout switches branch', async () => {
      mockExecFn.mockResolvedValue('');

      await store.checkout('develop');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        ['checkout', 'develop'],
        '/test/base/path'
      );
    });

    test('merge merges branch', async () => {
      mockExecFn.mockResolvedValue('');

      await store.merge('feature-branch');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        ['merge', 'feature-branch'],
        '/test/base/path'
      );
    });

    test('branch creates new branch', async () => {
      mockExecFn.mockResolvedValue('');

      await store.branch('new-feature');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        ['branch', 'new-feature'],
        '/test/base/path'
      );
    });
  });

  // Tag Operations
  describe('Tag Operations', () => {
    test('tag creates simple tag', async () => {
      mockExecFn.mockResolvedValue('');

      await store.tag('v1.0.0');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['tag', 'v1.0.0']),
        '/test/base/path'
      );
    });

    test('tag creates annotated tag with message', async () => {
      mockExecFn.mockResolvedValue('');

      await store.tag('v1.0.0', 'Release version 1.0.0');

      const call = mockExecFn.mock.calls.find(c => c[0] === 'git' && c[1].includes('tag'));
      expect(call).toBeDefined();
      expect(call![1]).toContain('-a');
    });

    test('listTags returns tag list', async () => {
      mockExecFn.mockResolvedValue('v1.0.0|Release 1.0.0|abc123\nv0.9.0|Beta release|def456');

      const tags = await store.listTags();
      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe('v1.0.0');
    });
  });

  // Staging Operations
  describe('Staging Operations', () => {
    test('unstage resets files from index', async () => {
      mockExecFn.mockResolvedValue('');

      await store.unstage(['.flare/apis/github.yaml']);

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['reset']),
        '/test/base/path'
      );
    });

    test('unstagedFiles returns list of unstaged files', async () => {
      mockExecFn.mockResolvedValue('.flare/apis/github.yaml\n.fLARE/APIS/STRIPE.YAML');

      const files = await store.unstagedFiles();
      expect(files).toHaveLength(2);
    });

    test('stagedFiles returns list of staged files', async () => {
      mockExecFn.mockResolvedValue('.flare/apis/github.yaml');

      const files = await store.stagedFiles();
      expect(files).toHaveLength(1);
    });

    test('discard reverts file changes', async () => {
      mockExecFn.mockResolvedValue('');

      await store.discard('.flare/apis/github.yaml');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        ['checkout', '--', '.flare/apis/github.yaml'],
        '/test/base/path'
      );
    });

    test('reset reverts file with mode', async () => {
      mockExecFn.mockResolvedValue('');

      await store.reset('.flare/apis/github.yaml', 'hard');

      expect(mockExecFn).toHaveBeenCalledWith(
        'git',
        ['reset', '--hard', '.flare/apis/github.yaml'],
        '/test/base/path'
      );
    });
  });
});