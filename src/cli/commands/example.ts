import { gitStore } from '../../storage/index.js';
import { generateCliExample } from '../../utils/example-generator.js';

export async function exampleCommand(args: string[]) {
  const [apiName, method, ...pathParts] = args;

  if (!apiName) {
    console.error('Usage: flare-api example <api> [method] [path]');
    console.error('Examples:');
    console.error('  flare-api example github GET /repos');
    console.error('  flare-api example stripe POST /payments');
    process.exit(1);
  }

  await gitStore.init();

  const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
  const api = await gitStore.loadAPI(fileName);

  if (!api) {
    console.error(`API not found: ${apiName}`);
    console.error('Use "flare-api list" to see available APIs.');
    process.exit(1);
  }

  // If no method specified, show available endpoints
  if (!method) {
    console.log(`\n${api.name} endpoints:\n`);
    for (const endpoint of api.endpoints) {
      console.log(`  ${endpoint.method.padEnd(10)} ${endpoint.path}`);
    }
    console.log('\nUsage: flare-api example <api> <method> <path>');
    return;
  }

  const path = '/' + pathParts.join('/');
  const result = generateCliExample(apiName, path, method, api);

  console.log('\n' + result);
}