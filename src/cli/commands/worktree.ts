import { worktreeManager, type WorktreeConfig } from '../../storage/worktree.js';

export async function worktreeCommand(args: string[]) {
  const [action, name, targetBranch] = args;

  if (!action) {
    console.log(`
Worktree Management Commands:
  flare-api worktree list                    List all worktrees
  flare-api worktree create <name>          Create a new worktree
  flare-api worktree remove <name>          Remove a worktree
  flare-api worktree switch <name>          Switch to a worktree
  flare-api worktree merge <name> [target]  Merge worktree changes back
  flare-api worktree cleanup                Clean up stale worktrees
`);
    return;
  }

  switch (action) {
    case 'list':
      await listWorktrees();
      break;

    case 'create':
      if (!name) {
        console.error('Error: Worktree name is required');
        console.error('Usage: flare-api worktree create <name> [--branch <branch-name>]');
        process.exit(1);
      }
      await createWorktree({ name, branch: targetBranch });
      break;

    case 'remove':
      if (!name) {
        console.error('Error: Worktree name is required');
        console.error('Usage: flare-api worktree remove <name>');
        process.exit(1);
      }
      await removeWorktree(name);
      break;

    case 'switch':
      if (!name) {
        console.error('Error: Worktree name is required');
        console.error('Usage: flare-api worktree switch <name>');
        process.exit(1);
      }
      await switchWorktree(name);
      break;

    case 'merge':
      if (!name) {
        console.error('Error: Worktree name is required');
        console.error('Usage: flare-api worktree merge <name> [target-branch]');
        process.exit(1);
      }
      await mergeWorktree(name, targetBranch || 'main');
      break;

    case 'cleanup':
      await cleanupWorktrees();
      break;

    default:
      console.error(`Unknown action: ${action}`);
      console.error('Use "flare-api worktree" without arguments to see available commands');
      process.exit(1);
  }
}

async function listWorktrees() {
  const worktrees = await worktreeManager.list();

  if (worktrees.length === 0) {
    console.log('No worktrees found.');
    return;
  }

  console.log(`\nFound ${worktrees.length} worktree(s):\n`);

  for (const wt of worktrees) {
    const mainLabel = wt.isMain ? ' [main]' : '';
    console.log(`  ${wt.name}${mainLabel}`);
    console.log(`    Path: ${wt.path}`);
    console.log(`    Branch: ${wt.branch}`);
    console.log();
  }
}

async function createWorktree(config: WorktreeConfig) {
  console.log(`Creating worktree: ${config.name}`);

  const result = await worktreeManager.create(config);

  if (result) {
    console.log(`\nWorktree created successfully:`);
    console.log(`  Name: ${result.name}`);
    console.log(`  Path: ${result.path}`);
    console.log(`  Branch: ${result.branch}`);
  } else {
    console.error('Failed to create worktree');
    process.exit(1);
  }
}

async function removeWorktree(name: string) {
  console.log(`Removing worktree: ${name}`);

  const success = await worktreeManager.remove(name);

  if (success) {
    console.log('Worktree removed successfully');
  } else {
    console.error('Failed to remove worktree');
    process.exit(1);
  }
}

async function switchWorktree(name: string) {
  const success = await worktreeManager.switch(name);

  if (success) {
    console.log(`Switched to worktree: ${name}`);
  } else {
    console.error('Failed to switch worktree');
    process.exit(1);
  }
}

async function mergeWorktree(name: string, targetBranch: string) {
  console.log(`Merging worktree "${name}" into ${targetBranch}...`);

  const success = await worktreeManager.merge(name, targetBranch);

  if (success) {
    console.log('Merge completed successfully');
  } else {
    console.error('Failed to merge worktree');
    process.exit(1);
  }
}

async function cleanupWorktrees() {
  console.log('Cleaning up stale worktrees...');
  await worktreeManager.cleanup();
  console.log('Cleanup completed');
}