import { vi, describe, test, expect } from 'vitest';

describe('cli - main entry', () => {
  test('[主体] module loads without error', async () => {
    const mod = await import('../index.js');
    expect(mod).toBeDefined();
  });

  test('[主体] all commands are exported', async () => {
    const addCommand = await import('../commands/add.js');
    const listCommand = await import('../commands/list.js');
    const searchCommand = await import('../commands/search.js');
    const runCommand = await import('../commands/run.js');
    const envCommand = await import('../commands/env.js');
    const historyCommand = await import('../commands/history.js');
    const exampleCommand = await import('../commands/example.js');
    const completionCommand = await import('../commands/completion.js');

    expect(addCommand.addCommand).toBeDefined();
    expect(listCommand.listCommand).toBeDefined();
    expect(searchCommand.searchCommand).toBeDefined();
    expect(runCommand.runCommand).toBeDefined();
    expect(envCommand.envCommand).toBeDefined();
    expect(historyCommand.historyCommand).toBeDefined();
    expect(exampleCommand.exampleCommand).toBeDefined();
    expect(completionCommand.completionCommand).toBeDefined();
  });

  test('[主体] git commands are exported', async () => {
    const git = await import('../commands/git.js');

    expect(git.gitLogCommand).toBeDefined();
    expect(git.gitDiffCommand).toBeDefined();
    expect(git.gitCommitCommand).toBeDefined();
    expect(git.gitStatusCommand).toBeDefined();
    expect(git.gitStageCommand).toBeDefined();
    expect(git.gitUnstageCommand).toBeDefined();
    expect(git.gitBranchCommand).toBeDefined();
    expect(git.gitCheckoutCommand).toBeDefined();
    expect(git.gitMergeCommand).toBeDefined();
    expect(git.gitTagCommand).toBeDefined();
    expect(git.gitDiscardCommand).toBeDefined();
    expect(git.gitRollbackCommand).toBeDefined();
  });
});