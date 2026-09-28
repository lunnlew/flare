import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../../storage/index.js', () => ({
  gitStore: {
    init: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn().mockResolvedValue([]),
    diff: vi.fn().mockResolvedValue({ files: [], summary: { added: 0, removed: 0 } }),
    status: vi.fn().mockResolvedValue({ clean: true, staged: [], unstaged: [], untracked: [], conflicting: [] }),
    commit: vi.fn().mockResolvedValue(undefined),
    stage: vi.fn().mockResolvedValue(undefined),
    unstage: vi.fn().mockResolvedValue(undefined),
    listBranches: vi.fn().mockResolvedValue([]),
    branch: vi.fn().mockResolvedValue(undefined),
    checkout: vi.fn().mockResolvedValue(undefined),
    merge: vi.fn().mockResolvedValue(undefined),
    listTags: vi.fn().mockResolvedValue([]),
    tag: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../storage/exec.js', () => ({
  execSync: vi.fn().mockReturnValue(''),
}));

import {
  gitLogCommand,
  gitDiffCommand,
  gitCommitCommand,
  gitStatusCommand,
  gitStageCommand,
  gitUnstageCommand,
  gitBranchCommand,
  gitCheckoutCommand,
  gitMergeCommand,
  gitTagCommand,
  gitDiscardCommand,
  gitRollbackCommand,
} from '../git.js';

describe('git 命令 - 主体', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('gitLog', () => {
    test('[主体] git log 显示提交历史', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.getHistory.mockResolvedValue([
        {
          shortHash: 'abc1234',
          message: 'Test commit',
          author: 'Test Author',
          email: 'test@example.com',
          timestamp: Date.now(),
        },
      ]);

      await gitLogCommand([]);

      expect(gitStore.getHistory).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    test('[主体] git log --json 输出 JSON 格式', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.getHistory.mockResolvedValue([
        { shortHash: 'abc1234', message: 'Test', author: 'Test', email: 'test@example.com', timestamp: Date.now() },
      ]);

      await gitLogCommand(['--format', 'json']);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('"shortHash"')
      );
    });

    test('[主体] git log --limit 限制显示数量', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.getHistory.mockResolvedValue([]);

      await gitLogCommand(['--limit', '5']);

      expect(gitStore.getHistory).toHaveBeenCalledWith(undefined, 5);
    });
  });

  describe('gitStatus', () => {
    test('[主体] git status 显示工作树状态', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.status.mockResolvedValue({
        clean: true,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicting: [],
      });

      await gitStatusCommand([]);

      expect(gitStore.status).toHaveBeenCalled();
    });

    test('[主体] git status --all 显示未暂存文件', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.status.mockResolvedValue({
        clean: false,
        staged: ['file1.ts'],
        unstaged: ['file2.ts'],
        untracked: ['file3.ts'],
        conflicting: [],
      });

      await gitStatusCommand(['--all']);

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('gitStage', () => {
    test('[主体] git stage 暂存文件', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitStageCommand(['file1.ts', 'file2.ts']);

      expect(gitStore.stage).toHaveBeenCalledWith(['file1.ts', 'file2.ts']);
    });

    test('[边界] git stage 无文件时报错', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await gitStageCommand([]);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('gitUnstage', () => {
    test('[主体] git unstage 取消暂存', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitUnstageCommand(['file1.ts']);

      expect(gitStore.unstage).toHaveBeenCalledWith(['file1.ts']);
    });

    test('[边界] git unstage 无文件时报错', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await gitUnstageCommand([]);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('gitCommit', () => {
    test('[主体] git commit -m 提交消息', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.status.mockResolvedValue({
        clean: false,
        staged: ['file1.ts'],
        unstaged: [],
        untracked: [],
        conflicting: [],
      });

      await gitCommitCommand(['-m', 'Test commit message']);

      expect(gitStore.commit).toHaveBeenCalledWith('Test commit message');
    });

    test('[主体] git commit 无变更时提示', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.status.mockResolvedValue({
        clean: true,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicting: [],
      });

      await gitCommitCommand(['-m', 'Test']);

      expect(gitStore.commit).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('clean'));
    });

    test('[边界] git commit 无 -m 报错的', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await gitCommitCommand([]);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('gitBranch', () => {
    test('[主体] git branch -l 列出分支', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.listBranches.mockResolvedValue([
        { name: 'main', current: true, remote: false },
        { name: 'develop', current: false, remote: false },
      ]);

      await gitBranchCommand(['--list']);

      expect(gitStore.listBranches).toHaveBeenCalled();
    });

    test('[主体] git branch -c 创建分支', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitBranchCommand(['--create', 'new-branch']);

      expect(gitStore.branch).toHaveBeenCalledWith('new-branch');
    });
  });

  describe('gitCheckout', () => {
    test('[主体] git checkout 切换分支', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitCheckoutCommand(['develop']);

      expect(gitStore.checkout).toHaveBeenCalledWith('develop');
    });

    test('[边界] git checkout 无分支名时报错', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await gitCheckoutCommand([]);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('gitTag', () => {
    test('[主体] git tag -l 列出标签', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.listTags.mockResolvedValue([
        { name: 'v1.0.0', message: 'Release1.0' },
        { name: 'v1.1.0', message: 'Release 1.1' },
      ]);

      await gitTagCommand(['-l']);

      expect(gitStore.listTags).toHaveBeenCalled();
    });

    test('[主体] git tag 创建标签', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitTagCommand(['v2.0.0', '-m', 'Version 2.0']);

      expect(gitStore.tag).toHaveBeenCalledWith('v2.0.0', 'Version 2.0');
    });
  });

  describe('gitMerge', () => {
    test('[主体] git merge 合并分支', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitMergeCommand(['feature-branch']);

      expect(gitStore.merge).toHaveBeenCalledWith('feature-branch');
    });

    test('[主体] git merge失败时错误向上传播', async () => {
      const { gitStore } = await import('../../../storage/index.js');
      gitStore.merge.mockRejectedValue(new Error('Merge conflict'));

      await expect(gitMergeCommand(['feature-branch'])).rejects.toThrow('Merge conflict');
    });
  });

  describe('gitDiscard', () => {
    test('[主体] git discard 放弃更改', async () => {
      const { gitStore } = await import('../../../storage/index.js');

      await gitDiscardCommand(['file1.ts']);

      expect(gitStore.discard).toHaveBeenCalledWith('file1.ts');
    });
  });

  describe('gitRollback', () => {
    test('[主体] git rollback 参数不足时报错', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await gitRollbackCommand(['only-one']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('required'));

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('git 命令 - 边界', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('[边界] gitDiff 无 API 名时报错', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.diff.mockResolvedValue({ files: [], summary: { added: 0, removed: 0 } });

    await gitDiffCommand([]);

    expect(console.error).toHaveBeenCalled();
  });

  test('[边界] gitMerge 无分支名时报错', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await gitMergeCommand([]);

    expect(console.error).toHaveBeenCalled();
  });

  test('[边界] gitRollback 参数不足时报错', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await gitRollbackCommand(['api-name']);

    expect(console.error).toHaveBeenCalled();
  });

  test('[边界] gitDiscard 无文件时报错', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await gitDiscardCommand([]);

    expect(console.error).toHaveBeenCalled();
  });

  test('[边界] gitLog --api过滤指定 API', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.getHistory.mockResolvedValue([]);

    await gitLogCommand(['--api', 'my-api']);

    expect(gitStore.getHistory).toHaveBeenCalledWith('my-api', expect.any(Number));
  });

  test('[边界] gitLog --format brief 处理', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.getHistory.mockResolvedValue([]);

    await gitLogCommand(['--format', 'brief']);

    expect(gitStore.getHistory).toHaveBeenCalled();
  });

  test('[边界] gitBranch -d 删除分支', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.checkout.mockResolvedValue(undefined);

    await gitBranchCommand(['--delete', 'old-branch']);

    expect(gitStore.checkout).toHaveBeenCalledWith('main');
  });

  test('[边界] gitCheckout 无效分支名时报错', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.checkout.mockRejectedValue(new Error('Branch not found'));

    await expect(gitCheckoutCommand(['nonexistent'])).rejects.toThrow('Branch not found');
  });

  test('[边界] gitCommit 有未暂存变更时提示', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.status.mockResolvedValue({
      clean: false,
      staged: [],
      unstaged: ['changed.ts'],
      untracked: [],
      conflicting: [],
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await gitCommitCommand(['-m', 'Test']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Unstaged'));

    consoleLogSpy.mockRestore();
  });

  test('[边界] gitDiff 显示差异摘要', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.diff.mockResolvedValue({
      files: [{ path: 'test.yaml', hunks: [] }],
      summary: { added: 10, removed: 5 },
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await gitDiffCommand(['my-api']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+10'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('-5'));

    consoleLogSpy.mockRestore();
  });

  test('[边界] gitDiff 显示文件列表和变更', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.diff.mockResolvedValue({
      files: [{
        path: 'api.yaml',
        hunks: [{
          lines: [
            { type: 'add', content: '+new line' },
            { type: 'remove', content: '-old line' },
            { type: 'context', content: ' context' },
          ],
        }],
      }],
      summary: { added: 1, removed: 1 },
    });

    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await gitDiffCommand(['my-api', 'abc1234', 'def5678']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('api.yaml'));

    consoleLogSpy.mockRestore();
  });
});

describe('git 命令 - 流程', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('[流程] 创建分支然后切换', async () => {
    const { gitStore } = await import('../../../storage/index.js');

    await gitBranchCommand(['--create', 'feature']);
    await gitCheckoutCommand(['feature']);

    expect(gitStore.branch).toHaveBeenCalledWith('feature');
    expect(gitStore.checkout).toHaveBeenCalledWith('feature');
  });

  test('[流程] 暂存多个文件然后提交', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.status.mockResolvedValue({
      clean: false,
      staged: ['file1.ts', 'file2.ts'],
      unstaged: [],
      untracked: [],
      conflicting: [],
    });

    await gitStageCommand(['file1.ts', 'file2.ts']);
    await gitCommitCommand(['-m', 'Add files']);

    expect(gitStore.stage).toHaveBeenCalledWith(['file1.ts', 'file2.ts']);
    expect(gitStore.commit).toHaveBeenCalledWith('Add files');
  });

  test('[流程] 查看历史然后比较差异', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.getHistory.mockResolvedValue([
      { shortHash: 'abc1234', message: 'First', author: 'Test', email: 'test@example.com', timestamp: Date.now() },
    ]);
    gitStore.diff.mockResolvedValue({ files: [], summary: { added: 0, removed: 0 } });

    await gitLogCommand([]);
    await gitDiffCommand(['--api', 'my-api', 'abc1234']);

    expect(gitStore.getHistory).toHaveBeenCalled();
    expect(gitStore.diff).toHaveBeenCalledWith('my-api', 'abc1234', undefined);
  });

  test('[流程] 创建标签然后列出', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.tag.mockResolvedValue(undefined);
    gitStore.listTags.mockResolvedValue([
      { name: 'v1.0.0', message: 'Release' },
    ]);

    await gitTagCommand(['v1.0.0', '-m', 'Version 1.0']);
    await gitTagCommand(['-l']);

    expect(gitStore.tag).toHaveBeenCalledWith('v1.0.0', 'Version 1.0');
    expect(gitStore.listTags).toHaveBeenCalled();
  });
});