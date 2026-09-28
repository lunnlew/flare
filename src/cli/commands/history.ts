import { historyStore, compareHistoryEntries, type HistoryEntry } from '../../storage/history.js';

type HistoryAction = 'list' | 'replay' | 'diff' | 'clear';

interface ParsedArgs {
  action: HistoryAction;
  args: string[];
}

function parseArgs(args: string[]): ParsedArgs {
  const [action, ...rest] = args;

  if (!action) {
    return { action: 'list', args: [] };
  }

  if (action === 'list' || action === 'ls') {
    return { action: 'list', args: rest };
  }
  if (action === 'replay' || action === 'run') {
    return { action: 'replay', args: rest };
  }
  if (action === 'diff' || action === 'compare') {
    return { action: 'diff', args: rest };
  }
  if (action === 'clear' || action === 'clean') {
    return { action: 'clear', args: rest };
  }

  // If first arg looks like an ID, treat as default list
  if (action.startsWith('h_')) {
    return { action: 'list', args: args };
  }

  return { action: 'list', args };
}

async function listHistory(args: string[]) {
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1] || '20') : 20;
  const offset = args.includes('--offset') ? parseInt(args[args.indexOf('--offset') + 1] || '0') : 0;
  const method = args.includes('--method') ? args[args.indexOf('--method') + 1] : undefined;
  const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : undefined;

  await historyStore.init();

  const entries = await historyStore.list({
    method,
    url,
    limit,
    offset,
  });

  if (entries.length === 0) {
    console.log('No history entries found.');
    console.log('Use "flare-api history replay <id>" to replay a request.');
    return;
  }

  console.log(`\nHistory (showing ${entries.length} entries):\n`);
  console.log('  ID            TIME                  METHOD  URL');
  console.log('  ' + '-'.repeat(70));

  for (const entry of entries) {
    const time = new Date(entry.timestamp).toLocaleString();
    const shortId = entry.id.substring(0, 12);
    const method = entry.method.padEnd(6);
    const url = entry.url.length > 50 ? entry.url.substring(0, 47) + '...' : entry.url;
    const status = entry.response?.status ? ` [${entry.response.status}]` : '';

    console.log(`  ${shortId}  ${time}  ${method}  ${url}${status}`);
  }

  console.log();
}

async function replayHistory(args: string[]) {
  const [id, ...rest] = args;

  if (!id || !id.startsWith('h_')) {
    console.error('Usage: flare-api history replay <history_id> [--var KEY=VALUE ...]');
    console.error('  Use "flare-api history list" to find history IDs.');
    return;
  }

  await historyStore.init();

  const entry = await historyStore.load(id);

  if (!entry) {
    console.error(`History entry not found: ${id}`);
    return;
  }

  console.log(`\nReplaying request: ${entry.method} ${entry.url}\n`);

  // Parse variables from args
  const variables: Record<string, string> = {};
  for (const arg of rest) {
    if (arg.startsWith('--var')) continue;
    if (arg.includes('=')) {
      const [key, value] = arg.split('=');
      variables[key] = value;
    }
  }

  // Also check --var flags
  const varIndex = rest.indexOf('--var');
  if (varIndex !== -1) {
    for (let i = varIndex + 1; i < rest.length; i++) {
      if (rest[i].startsWith('--')) break;
      if (rest[i].includes('=')) {
        const [key, value] = rest[i].split('=');
        variables[key] = value;
      }
    }
  }

  // Execute replay
  const { replayRequest } = await import('../../storage/history.js');
  const startTime = Date.now();

  try {
    const result = await replayRequest(entry, variables);
    const duration = Date.now() - startTime;

    console.log(`Response: ${result.status} (${duration}ms)\n`);
    console.log(result.body);
  } catch (error) {
    console.error('Request failed:', error instanceof Error ? error.message : error);
  }
}

async function diffHistory(args: string[]) {
  const [leftId, rightId] = args;

  if (!leftId || !leftId.startsWith('h_') || !rightId || !rightId.startsWith('h_')) {
    console.error('Usage: flare-api history diff <history_id_1> <history_id_2>');
    console.error('  Use "flare-api history list" to find history IDs.');
    return;
  }

  await historyStore.init();

  const [leftEntry, rightEntry] = await Promise.all([
    historyStore.load(leftId),
    historyStore.load(rightId),
  ]);

  if (!leftEntry) {
    console.error(`History entry not found: ${leftId}`);
    return;
  }
  if (!rightEntry) {
    console.error(`History entry not found: ${rightId}`);
    return;
  }

  const diff = compareHistoryEntries(leftEntry, rightEntry);

  console.log('\n=== History Diff ===\n');
  console.log(`Left:  ${leftId} (${leftEntry.method} ${leftEntry.url})`);
  console.log(`Right: ${rightId} (${rightEntry.method} ${rightEntry.url})\n`);

  // Status
  console.log('--- Status ---');
  if (diff.statusDiff?.same) {
    console.log(`  ${diff.statusDiff.left} (same)`);
  } else {
    console.log(`  ${diff.statusDiff?.left} -> ${diff.statusDiff?.right}`);
  }

  // Time
  console.log('\n--- Response Time ---');
  if (diff.timeDiff?.same) {
    console.log(`  ${diff.timeDiff.left}ms (same)`);
  } else {
    const diff_ms = (diff.timeDiff?.right || 0) - (diff.timeDiff?.left || 0);
    const sign = diff_ms >= 0 ? '+' : '';
    console.log(`  ${diff.timeDiff?.left}ms -> ${diff.timeDiff?.right}ms (${sign}${diff_ms}ms)`);
  }

  // Headers
  if (diff.headerDiffs && diff.headerDiffs.length > 0) {
    console.log('\n--- Headers ---');
    for (const h of diff.headerDiffs) {
      console.log(`  ${h.key}:`);
      console.log(`    left:  ${h.left || '(empty)'}`);
      console.log(`    right: ${h.right || '(empty)'}`);
    }
  }

  // Body
  console.log('\n--- Body ---');
  if (diff.bodyDiff?.same) {
    console.log('  (same)');
  } else {
    const leftBody = diff.bodyDiff?.left || '';
    const rightBody = diff.bodyDiff?.right || '';
    const leftLines = leftBody.split('\n');
    const rightLines = rightBody.split('\n');

    console.log('  Left:');
    for (const line of leftLines.slice(0, 10)) {
      console.log(`    ${line}`);
    }
    if (leftLines.length > 10) {
      console.log(`    ... (${leftLines.length - 10} more lines)`);
    }

    console.log('\n  Right:');
    for (const line of rightLines.slice(0, 10)) {
      console.log(`    ${line}`);
    }
    if (rightLines.length > 10) {
      console.log(`    ... (${rightLines.length - 10} more lines)`);
    }
  }

  console.log();
}

async function clearHistory(_args: string[]) {
  await historyStore.init();

  const count = await historyStore.count();
  if (count === 0) {
    console.log('No history to clear.');
    return;
  }

  console.log(`Clearing ${count} history entries...`);
  await historyStore.clear();
  console.log('History cleared.');
}

export async function historyCommand(args: string[]) {
  const { action, args: parsedArgs } = parseArgs(args);

  switch (action) {
    case 'list':
      await listHistory(parsedArgs);
      break;
    case 'replay':
      await replayHistory(parsedArgs);
      break;
    case 'diff':
      await diffHistory(parsedArgs);
      break;
    case 'clear':
      await clearHistory(parsedArgs);
      break;
  }
}