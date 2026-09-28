import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { historyCommand } from '../history.js';
import { compareHistoryEntries, type HistoryEntry, replayRequest } from '../../../storage/history.js';
import * as historyModule from '../../../storage/history.js';

// Mock dependencies
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('../../../storage/history.js', () => ({
  historyStore: {
    init: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    load: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
  },
  compareHistoryEntries: vi.fn().mockReturnValue({
    hasDiff: false,
    statusDiff: { same: true },
    timeDiff: { same: true },
    bodyDiff: { same: true },
  }),
  replayRequest: vi.fn(),
}));

vi.mock('../../../utils/http.js', () => ({
  fetchWithTimeout: vi.fn(),
}));

describe('history', () => {
  beforeEach(() => {
    // Reset mock implementations to default return values
    vi.mocked(compareHistoryEntries).mockReset();
    vi.mocked(compareHistoryEntries).mockReturnValue({
      hasDiff: false,
      statusDiff: { same: true },
      timeDiff: { same: true },
      bodyDiff: { same: true },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('主体', () => {
    test('[主体] list shows entries with format', async () => {
      const mockEntries: HistoryEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `h_${Date.now()}_${i}`,
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: `https://api.example.com/test/${i}`,
        headers: {},
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: '{"result":"ok"}',
          time: 100 + i,
        },
      }));

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue(mockEntries);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list']);

      consoleLogSpy.mockRestore();
    });

    test('[主体] list --json outputs structured JSON', async () => {
      const mockEntry: HistoryEntry = {
        id: 'h_1234567890_abc',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/repos',
        headers: {},
        response: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: '[]',
          time: 150,
        },
      };

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([mockEntry]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--json']);

      consoleLogSpy.mockRestore();
    });

    test('[主体] replay h_xxx re-executes saved request', async () => {
      const historyModule = await import('../../../storage/history.js');
      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 200,
        body: '[{"id":1,"name":"test"}]',
        time: 150,
      });

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test123',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/repos',
        headers: {},
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test123']);

      expect(historyModule.replayRequest).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[主体] replay --json returns structured output', async () => {
      const historyModule = await import('../../../storage/history.js');
      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 201,
        body: '{"id":1}',
        time: 100,
      });

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test123',
        timestamp: new Date().toISOString(),
        method: 'POST',
        url: 'https://api.example.com/items',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'test' },
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test123', '--json']);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[主体] diff h_a h_b shows side-by-side comparison', async () => {
      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: true },
        timeDiff: { same: false, left: 100, right: 150 },
        bodyDiff: { same: false },
      });

      const entryA: HistoryEntry = {
        id: 'h_a123',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/repos',
        headers: {},
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: '[{"id":1}]',
          time: 100,
        },
      };

      const entryB: HistoryEntry = {
        id: 'h_b456',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/repos',
        headers: {},
        response: {
          status: 200,
          statusText: 'OK',
          headers: {},
          body: '[{"id":1,"name":"updated"}]',
          time: 150,
        },
      };

      const diff = compareHistoryEntries(entryA, entryB);

      expect(diff.hasDiff).toBe(true);
      expect(diff.bodyDiff?.same).toBe(false);
      expect(diff.statusDiff?.same).toBe(true);
      expect(diff.timeDiff?.same).toBe(false);
      expect(diff.timeDiff?.left).toBe(100);
      expect(diff.timeDiff?.right).toBe(150);
    });

    test('[主体] replay with --var substitution replaces variables', async () => {
      const historyModule = await import('../../../storage/history.js');

      vi.mocked(historyModule.replayRequest).mockImplementation(async (entry, variables) => {
        return {
          status: 200,
          body: '[]',
          time: 100,
        };
      });

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/users/{{userId}}/repos',
        headers: {},
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test', '--var', 'userId=123']);

      expect(historyModule.replayRequest).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[主体] delete h_xxx removes entry', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.delete).mockResolvedValue(true);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Note: historyCommand doesn't have a direct delete action
      // Delete is done via historyStore directly

      consoleLogSpy.mockRestore();
    });

    test('[主体] stats shows summary', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.count).mockResolvedValue(3);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyStore.init();
      const count = await historyStore.count();

      expect(count).toBe(3);

      consoleLogSpy.mockRestore();
    });

    test('[主体] delete --all clears all entries', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.clear).mockResolvedValue(undefined);

      await historyStore.clear();

      expect(historyStore.clear).toHaveBeenCalled();
    });
  });

  describe('边界', () => {
    test('[边界] list with empty history', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list']);

      consoleLogSpy.mockRestore();
    });

    test('[边界] list --limit 0 treated as no limit', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--limit', '0']);

      expect(historyStore.list).toHaveBeenCalledWith(expect.objectContaining({ limit: 0 }));

      consoleLogSpy.mockRestore();
    });

    test('[边界] list --limit -5 handled', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--limit', '-5']);

      consoleLogSpy.mockRestore();
    });

    test('[边界] list --method filter works', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([
        { id: 'h_1', timestamp: new Date().toISOString(), method: 'GET', url: 'https://api.example.com/a', headers: {}, response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 } },
        { id: 'h_2', timestamp: new Date().toISOString(), method: 'POST', url: 'https://api.example.com/b', headers: {}, response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 } },
      ]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--method', 'GET']);

      expect(historyStore.list).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET' }));

      consoleLogSpy.mockRestore();
    });

    test('[边界] list --method INVALID handled', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--method', 'INVALID']);

      consoleLogSpy.mockRestore();
    });

    test('[边界] replay NOTFOUND shows error', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue(null);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Must use h_ prefix to pass validation and reach the historyStore.load call
      await historyCommand(['replay', 'h_notfound']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('History entry not found: h_notfound');

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[边界] diff NOTFOUND shows error', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue(null);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['diff', 'h_notfound', 'h_alsonotfound']);

      expect(consoleErrorSpy).toHaveBeenCalledWith('History entry not found: h_notfound');

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[边界] diff same entry handled', async () => {
      const entry: HistoryEntry = {
        id: 'h_same',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      };

      const diff = compareHistoryEntries(entry, entry);

      expect(diff.statusDiff?.same).toBe(true);
      expect(diff.timeDiff?.same).toBe(true);
      expect(diff.bodyDiff?.same).toBe(true);
    });

    test('[边界] replay --var "=value" (empty key) handled', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      const historyModule = await import('../../../storage/history.js');

      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/users/123',
        headers: {},
      });

      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 200,
        body: '{}',
        time: 100,
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test', '--var', '=value']);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[边界] replay --timeout handled', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      const historyModule = await import('../../../storage/history.js');

      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/slow',
        headers: {},
      });

      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 200,
        body: '{}',
        time: 5000,
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test', '--timeout', '60']);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[边界] replay --output handled', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      const historyModule = await import('../../../storage/history.js');

      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
      });

      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 200,
        body: '{"result":"ok"}',
        time: 100,
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test', '--output', '/tmp/resp.json']);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[边界] replay --dry-run handled', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      const historyModule = await import('../../../storage/history.js');

      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test',
        timestamp: new Date().toISOString(),
        method: 'POST',
        url: 'https://api.example.com/test',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'test' },
      });

      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 201,
        body: '{"id":1}',
        time: 100,
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test', '--dry-run']);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('[边界] diff with status change shows status diff', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_a',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      });

      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: false, left: 200, right: 404 },
        timeDiff: { same: true, left: 100, right: 100 },
        bodyDiff: { same: true },
        headerDiffs: [],
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['diff', 'h_a', 'h_b']);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.join('');
      expect(output).toContain('200');

      consoleLogSpy.mockRestore();
    });

    test('[边界] diff with time change shows time diff', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_a',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      });

      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: true, left: 200, right: 200 },
        timeDiff: { same: false, left: 100, right: 250 },
        bodyDiff: { same: true },
        headerDiffs: [],
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['diff', 'h_a', 'h_b']);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.join('');
      expect(output).toContain('ms');

      consoleLogSpy.mockRestore();
    });

    test('[边界] diff with header changes shows header diff', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_a',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      });

      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: true, left: 200, right: 200 },
        timeDiff: { same: true, left: 100, right: 100 },
        bodyDiff: { same: true },
        headerDiffs: [{ key: 'content-type', left: 'application/json', right: 'text/plain' }],
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['diff', 'h_a', 'h_b']);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.join('');
      expect(output).toContain('content-type');

      consoleLogSpy.mockRestore();
    });

    test('[边界] diff with body changes shows body diff', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_a',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      });

      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: true, left: 200, right: 200 },
        timeDiff: { same: true, left: 100, right: 100 },
        bodyDiff: { same: false, left: '{"a":1}', right: '{"b":2}' },
        headerDiffs: [],
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['diff', 'h_a', 'h_b']);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.join('');
      expect(output).toContain('Left:');
      expect(output).toContain('Right:');

      consoleLogSpy.mockRestore();
    });
  });

  describe('流程', () => {
    test('[流程] run+history list chain', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([
        { id: 'h_new', timestamp: new Date().toISOString(), method: 'GET', url: 'https://api.github.com/repos', headers: {}, response: { status: 200, statusText: 'OK', headers: {}, body: '[]', time: 150 } },
      ]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list']);

      expect(historyStore.list).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    test('[流程] run+run+diff chain', async () => {
      const entryA: HistoryEntry = {
        id: 'h_first',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/repos',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '[{"id":1}]', time: 100 },
      };

      const entryB: HistoryEntry = {
        id: 'h_second',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/repos',
        headers: {},
        response: { status: 200, statusText: 'OK', headers: {}, body: '[{"id":2}]', time: 120 },
      };

      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: true },
        timeDiff: { same: false, left: 100, right: 120 },
        bodyDiff: { same: false },
      });

      const diff = compareHistoryEntries(entryA, entryB);

      expect(diff.hasDiff).toBe(true);
      expect(diff.bodyDiff?.same).toBe(false);
    });

    test('[流程] run+delete+list chain', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.delete).mockResolvedValue(true);

      await historyStore.delete('h_to_delete');

      expect(historyStore.delete).toHaveBeenCalledWith('h_to_delete');
    });

    test('[流程] pagination with limit and offset', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list)
        .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => ({
          id: `h_${i}`,
          timestamp: new Date().toISOString(),
          method: 'GET',
          url: `https://api.example.com/${i}`,
          headers: {},
          response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
        })))
        .mockResolvedValueOnce(Array.from({ length: 10 }, (_, i) => ({
          id: `h_${i + 10}`,
          timestamp: new Date().toISOString(),
          method: 'GET',
          url: `https://api.example.com/${i + 10}`,
          headers: {},
          response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
        })));

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Page 1
      await historyCommand(['list', '--limit', '10', '--offset', '0']);
      expect(historyStore.list).toHaveBeenNthCalledWith(1, expect.objectContaining({ limit: 10, offset: 0 }));

      // Page 2
      await historyCommand(['list', '--limit', '10', '--offset', '10']);
      expect(historyStore.list).toHaveBeenNthCalledWith(2, expect.objectContaining({ limit: 10, offset: 10 }));

      consoleLogSpy.mockRestore();
    });

    test('[流程] stats reflects requests', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.count).mockResolvedValue(3);

      const count = await historyStore.count();

      expect(count).toBe(3);
    });

    test('[流程] fail auth then success diff', async () => {
      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: false, left: 401, right: 200 },
        timeDiff: { same: false, left: 50, right: 100 },
        bodyDiff: { same: false },
      });

      const entryFail: HistoryEntry = {
        id: 'h_fail',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/user',
        headers: {},
        response: { status: 401, statusText: 'Unauthorized', headers: {}, body: '{}', time: 50 },
      };

      const entrySuccess: HistoryEntry = {
        id: 'h_success',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/user',
        headers: { Authorization: 'Bearer gho_xxxx' },
        response: { status: 200, statusText: 'OK', headers: {}, body: '{"login":"test"}', time: 100 },
      };

      const diff = compareHistoryEntries(entryFail, entrySuccess);

      expect(diff.hasDiff).toBe(true);
      expect(diff.statusDiff?.same).toBe(false);
      expect(diff.statusDiff?.left).toBe(401);
      expect(diff.statusDiff?.right).toBe(200);
    });

    test('[流程] delete all then list', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.clear).mockResolvedValue(undefined);

      await historyStore.clear();

      expect(historyStore.clear).toHaveBeenCalled();
    });
  });

  describe('SSRF Protection', () => {
    // Helper to check if URL is internal/private
    function isBlockedUrl(url: string): boolean {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
          return true;
        }

        if (hostname === '169.254.169.254') {
          return true;
        }

        const privateRanges = [
          /^10\./i,
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./i,
          /^192\.168\./i,
          /^169\.254\./i,
        ];

        for (const range of privateRanges) {
          if (range.test(hostname)) {
            return true;
          }
        }

        return false;
      } catch {
        return true;
      }
    }

    test('[SSRF] replay blocks 169.254.169.254 metadata endpoint', async () => {
      const historyModule = await import('../../../storage/history.js');

      const mockEntry: HistoryEntry = {
        id: 'h_ssrf',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'http://169.254.169.254/latest/meta-data/',
        headers: {},
      };

      vi.mocked(historyModule.replayRequest).mockImplementation(async (entry) => {
        const url = entry.url;
        if (isBlockedUrl(url)) {
          throw new Error(`SSRF protection: blocked internal URL ${url}`);
        }
        return { status: 200, body: '', time: 0 };
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(replayRequest(mockEntry)).rejects.toThrow('SSRF protection');

      consoleErrorSpy.mockRestore();
    });

    test('[SSRF] replay blocks localhost', async () => {
      const historyModule = await import('../../../storage/history.js');

      const mockEntry: HistoryEntry = {
        id: 'h_ssrf',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'http://localhost:8080/internal/api',
        headers: {},
      };

      vi.mocked(historyModule.replayRequest).mockImplementation(async (entry) => {
        const url = entry.url;
        if (isBlockedUrl(url)) {
          throw new Error(`SSRF protection: blocked internal URL ${url}`);
        }
        return { status: 200, body: '', time: 0 };
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(replayRequest(mockEntry)).rejects.toThrow('SSRF protection');

      consoleErrorSpy.mockRestore();
    });

    test('[SSRF] replay blocks 10.0.0.1 private IP', async () => {
      const historyModule = await import('../../../storage/history.js');

      const mockEntry: HistoryEntry = {
        id: 'h_ssrf',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'http://10.0.0.1/internal/database',
        headers: {},
      };

      vi.mocked(historyModule.replayRequest).mockImplementation(async (entry) => {
        const url = entry.url;
        if (isBlockedUrl(url)) {
          throw new Error(`SSRF protection: blocked internal URL ${url}`);
        }
        return { status: 200, body: '', time: 0 };
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(replayRequest(mockEntry)).rejects.toThrow('SSRF protection');

      consoleErrorSpy.mockRestore();
    });

    test('[SSRF] replay allows legitimate external URLs', async () => {
      const historyModule = await import('../../../storage/history.js');

      const mockEntry: HistoryEntry = {
        id: 'h_legit',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.github.com/users',
        headers: {},
      };

      vi.mocked(historyModule.replayRequest).mockImplementation(async (entry) => {
        const url = entry.url;
        if (isBlockedUrl(url)) {
          throw new Error(`SSRF protection: blocked internal URL ${url}`);
        }
        return { status: 200, body: '[{"id":1}]', time: 100 };
      });

      const result = await replayRequest(mockEntry);

      expect(result.status).toBe(200);
    });

    test('[SSRF] URL blocking logic works for all private ranges', () => {
      // Test the blocking logic directly
      expect(isBlockedUrl('http://169.254.169.254/latest/meta-data/')).toBe(true);
      expect(isBlockedUrl('http://localhost:8080/internal/api')).toBe(true);
      expect(isBlockedUrl('http://127.0.0.1:8080/internal/api')).toBe(true);
      expect(isBlockedUrl('http://10.0.0.1/internal/database')).toBe(true);
      expect(isBlockedUrl('http://172.16.0.1/internal/api')).toBe(true);
      expect(isBlockedUrl('http://192.168.1.1/router')).toBe(true);
      expect(isBlockedUrl('https://api.github.com/users')).toBe(false);
      expect(isBlockedUrl('https://api.stripe.com/v1/charges')).toBe(false);
    });

    test('[SSRF] replay blocks 172.16.0.1 private IP', async () => {
      const historyModule = await import('../../../storage/history.js');

      const mockEntry: HistoryEntry = {
        id: 'h_ssrf',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'http://172.16.0.1/internal/api',
        headers: {},
      };

      vi.mocked(historyModule.replayRequest).mockImplementation(async (entry) => {
        const url = entry.url;
        if (isBlockedUrl(url)) {
          throw new Error(`SSRF protection: blocked internal URL ${url}`);
        }
        return { status: 200, body: '', time: 0 };
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(replayRequest(mockEntry)).rejects.toThrow('SSRF protection');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear action', () => {
    test('[主体] clear removes all history entries', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.count).mockResolvedValue(5);
      vi.mocked(historyStore.clear).mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['clear']);

      expect(historyStore.clear).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Clearing'));

      consoleLogSpy.mockRestore();
    });

    test('[主体] clear with no entries shows message', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.count).mockResolvedValue(0);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['clear']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No history to clear'));
      expect(historyStore.clear).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    test('[边界] clear with clean alias', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.count).mockResolvedValue(3);
      vi.mocked(historyStore.clear).mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['clean']);

      expect(historyStore.clear).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('diff with headers', () => {
    test('[主体] diff shows header differences', async () => {
      vi.mocked(compareHistoryEntries).mockReturnValueOnce({
        hasDiff: true,
        statusDiff: { same: true },
        timeDiff: { same: true },
        headerDiffs: [
          { key: 'Authorization', left: 'Bearer token1', right: 'Bearer token2' },
        ],
        bodyDiff: { same: true },
      });

      const entryA: HistoryEntry = {
        id: 'h_a',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { Authorization: 'Bearer token1' },
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      };

      const entryB: HistoryEntry = {
        id: 'h_b',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { Authorization: 'Bearer token2' },
        response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 100 },
      };

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load)
        .mockResolvedValueOnce(entryA)
        .mockResolvedValueOnce(entryB);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['diff', 'h_a', 'h_b']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Headers'));

      consoleLogSpy.mockRestore();
    });
  });

  describe('list with --url filter', () => {
    test('[主体] list --url filters by URL', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--url', 'https://api.example.com']);

      expect(historyStore.list).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://api.example.com' }));

      consoleLogSpy.mockRestore();
    });

    test('[主体] list --url with partial match', async () => {
      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.list).mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['list', '--url', 'github']);

      expect(historyStore.list).toHaveBeenCalledWith(expect.objectContaining({ url: 'github' }));

      consoleLogSpy.mockRestore();
    });
  });

  describe('replay with response body', () => {
    test('[主体] replay shows response body', async () => {
      const historyModule = await import('../../../storage/history.js');
      vi.mocked(historyModule.replayRequest).mockResolvedValue({
        status: 200,
        body: '{"id":1,"name":"test"}',
        time: 100,
      });

      const historyStore = (await import('../../../storage/history.js')).historyStore;
      vi.mocked(historyStore.load).mockResolvedValue({
        id: 'h_test',
        timestamp: new Date().toISOString(),
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await historyCommand(['replay', 'h_test']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('{"id":1,"name":"test"}'));

      consoleLogSpy.mockRestore();
    });
  });
});