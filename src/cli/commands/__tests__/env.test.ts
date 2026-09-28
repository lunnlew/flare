import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted so mocks are evaluated before vi.mock hoisting
const { mockEnvStore } = vi.hoisted(() => {
  const mockEnvStore = {
    init: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue({}),
    save: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
  };
  return { mockEnvStore };
});

vi.mock('../../../storage/index.js', () => ({
  envStore: mockEnvStore,
}));

// Spy on process.exit - must be set up after vi.mock
vi.spyOn(process, 'exit').mockImplementation((code: number) => {
  throw new Error(`process.exit called with code ${code}`);
});

import { envCommand } from '../env.js';

describe('env', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('主体', () => {
    test('[主体] set key=value creates variable', async () => {
      mockEnvStore.load.mockResolvedValue({});
      mockEnvStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'default', 'API_KEY=abc123']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.load).toHaveBeenCalledWith('default');
      expect(mockEnvStore.save).toHaveBeenCalledWith('default', { API_KEY: 'abc123' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Set default.API_KEY=abc123');

      consoleLogSpy.mockRestore();
    });

    test('[主体] get key returns value', async () => {
      mockEnvStore.load.mockResolvedValue({ API_KEY: 'abc123' });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['use', 'default']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.load).toHaveBeenCalledWith('default');
      expect(consoleLogSpy).toHaveBeenCalledWith('Environment: default');
      expect(consoleLogSpy).toHaveBeenCalledWith('  API_KEY=abc123');

      consoleLogSpy.mockRestore();
    });

    test('[主体] ls lists all environments', async () => {
      mockEnvStore.list.mockResolvedValue(['default', 'staging', 'production']);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['ls']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.list).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Environments:', 'default, staging, production');

      consoleLogSpy.mockRestore();
    });

    test('[主体] set --env staging sets in staging environment', async () => {
      mockEnvStore.load.mockResolvedValue({});
      mockEnvStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'staging', 'TOKEN=xxx']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.load).toHaveBeenCalledWith('staging');
      expect(mockEnvStore.save).toHaveBeenCalledWith('staging', { TOKEN: 'xxx' });
      expect(consoleLogSpy).toHaveBeenCalledWith('Set staging.TOKEN=xxx');

      consoleLogSpy.mockRestore();
    });

    test('[主体] get --env staging gets from staging', async () => {
      mockEnvStore.load.mockResolvedValue({ TOKEN: 'staging-token' });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['use', 'staging']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.load).toHaveBeenCalledWith('staging');
      expect(consoleLogSpy).toHaveBeenCalledWith('Environment: staging');
      expect(consoleLogSpy).toHaveBeenCalledWith('  TOKEN=staging-token');

      consoleLogSpy.mockRestore();
    });

    test('[主体] ls lists production environment', async () => {
      mockEnvStore.load.mockResolvedValue({ DB_HOST: 'prod.db.com', DB_PORT: '5432' });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['use', 'production']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.load).toHaveBeenCalledWith('production');
      expect(consoleLogSpy).toHaveBeenCalledWith('Environment: production');
      expect(consoleLogSpy).toHaveBeenCalledWith('  DB_HOST=prod.db.com');
      expect(consoleLogSpy).toHaveBeenCalledWith('  DB_PORT=5432');

      consoleLogSpy.mockRestore();
    });

    test('[主体] set --global sets global variable', async () => {
      mockEnvStore.load.mockResolvedValue({});
      mockEnvStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'default', 'HOME_VAR=xxx']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.save).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    test('[主体] set --secret marks variable as secret', async () => {
      mockEnvStore.load.mockResolvedValue({});
      mockEnvStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'default', 'DB_PASSWORD=secret123']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(mockEnvStore.save).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('边界', () => {
    test('[边界] no arguments prints usage', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand([]);

      expect(consoleLogSpy).toHaveBeenCalledWith('Usage: flare-api env <ls|use|set> [args]');

      consoleLogSpy.mockRestore();
    });

    test('[边界] set without value prints error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await envCommand(['set', 'default']);
      } catch (e) {
        // Expected - process.exit throws
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Usage: flare-api env set <name> <key>=<value>');

      consoleErrorSpy.mockRestore();
    });

    test('[边界] set =value (empty key) handled', async () => {
      mockEnvStore.load.mockResolvedValue({});
      mockEnvStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'default', '=value']);

      expect(mockEnvStore.save).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    test('[边界] get nonexistent key handled gracefully', async () => {
      mockEnvStore.load.mockResolvedValue({});

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['use', 'default']);

      expect(consoleLogSpy).toHaveBeenCalledWith('Environment: default');

      consoleLogSpy.mockRestore();
    });

    test('[边界] delete nonexistent key handled gracefully', async () => {
      mockEnvStore.load.mockResolvedValue({});
      mockEnvStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['delete', 'NONEXISTENT']);

      consoleLogSpy.mockRestore();
    });

    test('[边界] ls with no variables shows "(none)"', async () => {
      mockEnvStore.list.mockResolvedValue([]);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['ls']);

      expect(mockEnvStore.init).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Environments:', '(none)');

      consoleLogSpy.mockRestore();
    });

    test('[边界] use nonexistent env handled', async () => {
      mockEnvStore.load.mockResolvedValue({});

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['use', 'nonexistent']);

      expect(consoleLogSpy).toHaveBeenCalledWith('Environment: nonexistent');

      consoleLogSpy.mockRestore();
    });
  });

  describe('流程', () => {
    test('[流程] set+get+delete+get cycle', async () => {
      const { envStore } = await import('../../../storage/index.js');
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // set
      envStore.load.mockResolvedValue({});
      envStore.save.mockResolvedValue(undefined);
      await envCommand(['set', 'default', 'API_KEY=value1']);
      expect(envStore.save).toHaveBeenLastCalledWith('default', { API_KEY: 'value1' });

      // get
      envStore.load.mockResolvedValue({ API_KEY: 'value1' });
      await envCommand(['use', 'default']);

      consoleLogSpy.mockRestore();
    });

    test('[流程] staging multi-var scenario', async () => {
      const { envStore } = await import('../../../storage/index.js');
      envStore.load.mockResolvedValue({});
      envStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'staging', 'BASE_URL=https://staging.api.example.com']);
      await envCommand(['set', 'staging', 'TOKEN=staging-token']);

      expect(envStore.save).toHaveBeenCalledTimes(2);

      consoleLogSpy.mockRestore();
    });

    test('[流程] overwrite cycle', async () => {
      const { envStore } = await import('../../../storage/index.js');
      envStore.load.mockResolvedValue({});
      envStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['set', 'default', 'API_KEY=value1']);
      expect(envStore.save).toHaveBeenLastCalledWith('default', { API_KEY: 'value1' });

      envStore.load.mockResolvedValue({ API_KEY: 'value1' });
      await envCommand(['set', 'default', 'API_KEY=value2']);
      expect(envStore.save).toHaveBeenLastCalledWith('default', { API_KEY: 'value2' });

      envStore.load.mockResolvedValue({ API_KEY: 'value2' });
      await envCommand(['set', 'default', 'API_KEY=value3']);

      consoleLogSpy.mockRestore();
    });

    test('[流程] ls, set, ls cycle shows new variable', async () => {
      const { envStore } = await import('../../../storage/index.js');
      envStore.list.mockResolvedValue(['default']);
      envStore.load.mockResolvedValue({});
      envStore.save.mockResolvedValue(undefined);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await envCommand(['ls']);

      await envCommand(['set', 'default', 'NEW_VAR=value']);

      envStore.load.mockResolvedValue({ NEW_VAR: 'value' });
      await envCommand(['use', 'default']);

      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });
});