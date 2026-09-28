import { vi, describe, test, expect, beforeEach } from 'vitest';

vi.mock('../../../storage/index.js', () => ({
  gitStore: {
    init: vi.fn().mockResolvedValue(undefined),
    loadAPI: vi.fn().mockResolvedValue(null),
  },
}));

import { exampleCommand } from '../example.js';

describe('cli - example command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  test('[主体] 显示 API 的所有端点', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.loadAPI.mockResolvedValue({
      name: 'Test API',
      version: '1.0.0',
      baseUrl: 'https://api.example.com',
      endpoints: [
        { path: '/users', method: 'GET' },
        { path: '/users', method: 'POST' },
      ],
    });

    await exampleCommand(['test-api']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test API endpoints'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('GET'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('/users'));
  });

  test('[主体] 显示指定端点的示例', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.loadAPI.mockResolvedValue({
      name: 'Test API',
      version: '1.0.0',
      baseUrl: 'https://api.example.com',
      endpoints: [
        { path: '/users', method: 'GET', responses: { '200': { statusCode: 200 } } },
      ],
    });

    await exampleCommand(['test-api', 'GET', '/users']);

    expect(console.log).toHaveBeenCalled();
  });

  test('[边界] 无 API名称显示用法错误', async () => {
    await expect(exampleCommand([])).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Usage'));
  });

  test('[边界] API 不存在显示错误', async () => {
    const { gitStore } = await import('../../../storage/index.js');
    gitStore.loadAPI.mockResolvedValue(null);

    await expect(exampleCommand(['nonexistent'])).rejects.toThrow('process.exit(1)');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('API not found'));
  });
});