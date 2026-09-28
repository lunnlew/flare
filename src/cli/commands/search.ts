import { gitStore, indexStore } from '../../storage/index.js';

export async function searchCommand(args: string[]) {
  // Parse arguments
  const flags = {
    limit: 10,
    offset: 0,
    sort: 'relevance' as 'name' | 'endpoints' | 'relevance',
    format: 'brief' as 'brief' | 'detailed' | 'json',
    showScores: false,
    semantic: false,
  };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--limit' && i + 1 < args.length) {
      flags.limit = parseInt(args[++i], 10);
    } else if (arg === '--offset' && i + 1 < args.length) {
      flags.offset = parseInt(args[++i], 10);
    } else if (arg === '--sort' && i + 1 < args.length) {
      flags.sort = args[++i] as 'name' | 'endpoints' | 'relevance';
    } else if (arg === '--format' && i + 1 < args.length) {
      flags.format = args[++i] as 'brief' | 'detailed' | 'json';
    } else if (arg === '--show-scores') {
      flags.showScores = true;
    } else if (arg === '--semantic') {
      flags.semantic = true;
    } else if (arg === '--json') {
      flags.format = 'json';
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  const query = positional[0];

  if (!query || !query.trim()) {
    console.error('Usage: flare-api search <query>');
    process.exit(1);
  }

  if (flags.limit < 0) {
    console.error('Error: --limit must be a non-negative number');
    process.exit(1);
  }

  if (flags.offset > 0 && flags.limit === 0) {
    // offset without limit - use default
  }

  await gitStore.init();
  let matched = await indexStore.search(query);

  // Apply sorting if multiple results
  if (matched.length > 1) {
    switch (flags.sort) {
      case 'name':
        matched = [...matched].sort();
        break;
      case 'endpoints':
        // Sort by endpoint count (requires loading APIs)
        break;
      case 'relevance':
      default:
        // Keep search order (relevance)
        break;
    }
  }

  // Apply pagination
  matched = matched.slice(flags.offset, flags.offset + (flags.limit || matched.length));

  if (matched.length === 0) {
    console.log(`No APIs found matching: ${query}`);
    return;
  }

  if (flags.format === 'json') {
    const results = [];
    for (const name of matched) {
      const api = await gitStore.loadAPI(`${name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
      if (api) {
        results.push({ name: api.name, baseUrl: api.baseUrl, endpoints: api.endpoints.length });
      }
    }
    console.log(JSON.stringify({ query, count: matched.length, results }, null, 2));
    return;
  }

  console.log(`Found ${matched.length} match(es):\n`);

  for (const name of matched) {
    const api = await gitStore.loadAPI(`${name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
    if (api) {
      if (flags.format === 'detailed') {
        console.log(`  ${api.name}`);
        console.log(`    Version: ${api.version}`);
        console.log(`    Base URL: ${api.baseUrl}`);
        console.log(`    Endpoints: ${api.endpoints.length}`);
        if (api.description) console.log(`    Description: ${api.description}`);
      } else {
        console.log(`  ${api.name}`);
        console.log(`    ${api.baseUrl}`);
        console.log(`    ${api.endpoints.length} endpoints\n`);
      }
    }
  }
}