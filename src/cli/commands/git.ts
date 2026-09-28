import { gitStore } from '../../storage/index.js';
import { execSync } from '../../storage/exec.js';

interface GitLogOptions {
  api?: string;
  limit?: number;
  format?: 'brief' | 'json';
}

interface GitDiffOptions {
  api: string;
  commitA?: string;
  commitB?: string;
}

interface GitBranchOptions {
  create?: string;
  delete?: string;
  list?: boolean;
}

export async function gitLogCommand(args: string[]) {
  await gitStore.init();

  const options = parseGitLogOptions(args);

  if (options.format === 'json') {
    const commits = await gitStore.getHistory(options.api, options.limit || 10);
    console.log(JSON.stringify(commits, null, 2));
  } else {
    const commits = await gitStore.getHistory(options.api, options.limit || 10);
    console.log(`\nGit History${options.api ? ` for ${options.api}` : ''}:\n`);
    for (const commit of commits) {
      console.log(`  ${commit.shortHash} - ${commit.message}`);
      console.log(`    Author: ${commit.author} <${commit.email}>`);
      console.log(`    Date:   ${new Date(commit.timestamp).toLocaleString()}`);
      console.log();
    }
  }
}

export async function gitDiffCommand(args: string[]) {
  await gitStore.init();

  const options = parseGitDiffOptions(args);
  if (!options.api) {
    console.error('Error: API name is required');
    console.log('Usage: flare-api git diff <api-name> [commitA] [commitB]');
    return;
  }

  const diff = await gitStore.diff(options.api, options.commitA, options.commitB);

  console.log(`\nDiff for ${options.api} (${options.commitA}${options.commitB ? `...${options.commitB}` : ''}):\n`);
  console.log(`  +${diff.summary.added} lines, -${diff.summary.removed} lines\n`);

  for (const file of diff.files) {
    console.log(`  File: ${file.path}`);
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
        console.log(`    ${prefix} ${line.content}`);
      }
    }
    console.log();
  }
}

export async function gitCommitCommand(args: string[]) {
  await gitStore.init();

  const msgIndex = args.indexOf('-m');
  if (msgIndex === -1 || !args[msgIndex + 1]) {
    console.error('Error: commit message is required');
    console.log('Usage: flare-api git commit -m "message"');
    return;
  }

  const message = args[msgIndex + 1];
  const status = await gitStore.status();

  if (status.clean) {
    console.log('Nothing to commit - working tree is clean.');
    return;
  }

  if (status.unstaged.length > 0) {
    console.log('Unstaged changes:');
    for (const f of status.unstaged) console.log(`  ${f}`);
    console.log('\nUse "flare-api git stage <file>" to stage changes.');
    return;
  }

  await gitStore.commit(message);
  console.log(`Committed: ${message}`);
}

export async function gitStatusCommand(args: string[]) {
  await gitStore.init();

  const status = await gitStore.status();
  const showAll = args.includes('--all') || args.includes('-a');

  console.log('\nGit Status:\n');

  if (status.clean && status.untracked.length === 0) {
    console.log('  Working tree is clean.');
    return;
  }

  if (status.staged.length > 0) {
    console.log('Staged changes:');
    for (const f of status.staged) console.log(`  [+] ${f}`);
    console.log();
  }

  if (showAll) {
    if (status.unstaged.length > 0) {
      console.log('Unstaged changes:');
      for (const f of status.unstaged) console.log(`  [M] ${f}`);
      console.log();
    }

    if (status.untracked.length > 0) {
      console.log('Untracked files:');
      for (const f of status.untracked) console.log(`  [?] ${f}`);
      console.log();
    }

    if (status.conflicting.length > 0) {
      console.log('Conflicting files:');
      for (const f of status.conflicting) console.log(`  [U] ${f}`);
      console.log();
    }
  }
}

export async function gitStageCommand(args: string[]) {
  await gitStore.init();

  if (args.length === 0) {
    console.error('Error: files to stage are required');
    console.log('Usage: flare-api git stage <file>...');
    return;
  }

  await gitStore.stage(args);
  console.log(`Staged: ${args.join(', ')}`);
}

export async function gitUnstageCommand(args: string[]) {
  await gitStore.init();

  if (args.length === 0) {
    console.error('Error: files to unstage are required');
    console.log('Usage: flare-api git unstage <file>...');
    return;
  }

  await gitStore.unstage(args);
  console.log(`Unstaged: ${args.join(', ')}`);
}

export async function gitBranchCommand(args: string[]) {
  await gitStore.init();

  const options = parseGitBranchOptions(args);

  if (options.list) {
    const branches = await gitStore.listBranches();
    console.log('\nBranches:\n');
    for (const branch of branches) {
      const marker = branch.current ? '*' : ' ';
      const type = branch.remote ? ' (remote)' : '';
      console.log(`  ${marker} ${branch.name}${type}`);
    }
    console.log();
    return;
  }

  if (options.create) {
    await gitStore.branch(options.create);
    console.log(`Created branch: ${options.create}`);
    return;
  }

  if (options.delete) {
    await gitStore.checkout('main');
    try {
      execSync('git', ['branch', '-d', options.delete], gitStore['basePath']);
      console.log(`Deleted branch: ${options.delete}`);
    } catch {
      console.log(`Failed to delete branch: ${options.delete}`);
    }
    return;
  }

  // Default: list branches
  const branches = await gitStore.listBranches();
  console.log('\nBranches:\n');
  for (const branch of branches) {
    const marker = branch.current ? '*' : ' ';
    console.log(`  ${marker} ${branch.name}`);
  }
  console.log();
}

export async function gitCheckoutCommand(args: string[]) {
  await gitStore.init();

  if (args.length === 0) {
    console.error('Error: branch name is required');
    console.log('Usage: flare-api git checkout <branch>');
    return;
  }

  const branch = args[0];
  await gitStore.checkout(branch);
  console.log(`Switched to branch: ${branch}`);
}

export async function gitMergeCommand(args: string[]) {
  await gitStore.init();

  if (args.length === 0) {
    console.error('Error: branch name is required');
    console.log('Usage: flare-api git merge <branch>');
    return;
  }

  const branch = args[0];
  await gitStore.merge(branch);
  console.log(`Merged ${branch} into current branch`);
}

export async function gitTagCommand(args: string[]) {
  await gitStore.init();

  const listIndex = args.indexOf('-l');
  const msgIndex = args.indexOf('-m');

  if (listIndex !== -1 || (args.length === 0 || args[0] === '-l')) {
    const tags = await gitStore.listTags();
    console.log('\nTags:\n');
    for (const tag of tags) {
      console.log(`  ${tag.name}${tag.message ? ` - ${tag.message}` : ''}`);
    }
    console.log();
    return;
  }

  if (args.length === 0) {
    console.error('Error: tag name is required');
    console.log('Usage: flare-api git tag <name> [-m "message"]');
    return;
  }

  const name = args[0];
  const message = msgIndex !== -1 ? args[msgIndex + 1] : undefined;

  await gitStore.tag(name, message);
  console.log(`Created tag: ${name}`);
}

export async function gitDiscardCommand(args: string[]) {
  await gitStore.init();

  if (args.length === 0) {
    console.error('Error: file is required');
    console.log('Usage: flare-api git discard <file>');
    return;
  }

  await gitStore.discard(args[0]);
  console.log(`Discarded changes to: ${args[0]}`);
}

export async function gitRollbackCommand(args: string[]) {
  await gitStore.init();

  if (args.length < 2) {
    console.error('Error: API name and commit are required');
    console.log('Usage: flare-api git rollback <api-name> <commit>');
    return;
  }

  const apiName = args[0];
  const commit = args[1];

  // Get the file at the specified commit
  const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
  const filePath = `apis/${fileName}`;

  try {
    const content = execSync('git', ['show', `${commit}:${filePath}`], process.cwd());
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
    await gitStore.add([filePath]);
    await gitStore.commit(`rollback: revert ${apiName} to ${commit}`);

    console.log(`Rolled back ${apiName} to commit ${commit}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    console.log(`Could not find ${apiName} at commit ${commit}`);
  }
}

// Parsers
function parseGitLogOptions(args: string[]): GitLogOptions {
  const options: GitLogOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api' || args[i] === '-a') {
      options.api = args[++i];
    } else if (args[i] === '--limit' || args[i] === '-n') {
      options.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--format' || args[i] === '-f') {
      options.format = args[++i] as 'brief' | 'json';
    }
  }

  return options;
}

function parseGitDiffOptions(args: string[]): GitDiffOptions {
  const options: GitDiffOptions = { api: '' };
  let firstArgUsed = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api' || args[i] === '-a') {
      options.api = args[++i];
    } else if (!options.commitA) {
      options.commitA = args[i];
      firstArgUsed = true;
    } else if (!options.commitB) {
      options.commitB = args[i];
    }
  }

  // If first non-flag arg doesn't look like a commit hash, treat it as API name
  if (options.commitA && !options.commitA.match(/^[a-f0-9]{7,}$/)) {
    options.api = options.commitA;
    options.commitA = undefined;
  }

  return options;
}

function parseGitBranchOptions(args: string[]): GitBranchOptions {
  const options: GitBranchOptions = { list: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-c' || args[i] === '--create') {
      options.create = args[++i];
    } else if (args[i] === '-d' || args[i] === '--delete') {
      options.delete = args[++i];
    } else if (args[i] === '-l' || args[i] === '--list') {
      options.list = true;
    }
  }

  if (args.length === 0) {
    options.list = true;
  }

  return options;
}