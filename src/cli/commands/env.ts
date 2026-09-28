import { envStore } from '../../storage/index.js';

export async function envCommand(args: string[]) {
  const [action, name, value] = args;

  await envStore.init();

  switch (action) {
    case 'ls':
    case 'list': {
      const envs = await envStore.list();
      console.log('Environments:', envs.length ? envs.join(', ') : '(none)');
      break;
    }

    case 'use': {
      if (!name) {
        console.error('Usage: flare-api env use <name>');
        process.exit(1);
      }
      const variables = await envStore.load(name);
      console.log(`Environment: ${name}`);
      for (const [key, val] of Object.entries(variables)) {
        console.log(`  ${key}=${val}`);
      }
      break;
    }

    case 'set': {
      if (!name || !value) {
        console.error('Usage: flare-api env set <name> <key>=<value>');
        process.exit(1);
      }
      const [key, val] = value.split('=');
      const current = await envStore.load(name);
      current[key] = val;
      await envStore.save(name, current);
      console.log(`Set ${name}.${key}=${val}`);
      break;
    }

    default: {
      console.log('Usage: flare-api env <ls|use|set> [args]');
      break;
    }
  }
}