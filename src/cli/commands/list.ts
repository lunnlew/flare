import { gitStore } from '../../storage/index.js';

export async function listCommand(_args: string[]) {
  await gitStore.init();
  const apis = await gitStore.listAPIs();

  if (apis.length === 0) {
    console.log('No APIs found. Use "flare-api add <source>" to import one.');
    return;
  }

  console.log(`\nFound ${apis.length} API(s):\n`);

  for (const api of apis) {
    const tags = api.tags?.join(', ') || '';
    console.log(`  ${api.name} (${api.version}) ${tags ? `[${tags}]` : ''}`);
    console.log(`    ${api.baseUrl || '(no base URL)'}`);
    console.log(`    ${api.endpoints.length} endpoints`);
    console.log();
  }
}