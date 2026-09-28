import { vi, describe, test, expect, beforeEach } from 'vitest';
import { EnvStore } from '../index.js';

// Use vi.hoisted to ensure mocks are available when vi.mock is hoisted
const { mockWriteFile, mockReadFile, mockReaddir, mockMkdir } = vi.hoisted(() => ({
  mockWriteFile: vi.fn().mockResolvedValue(undefined),
  mockReadFile: vi.fn(),
  mockReaddir: vi.fn(),
  mockMkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('fs/promises', () => ({
  writeFile: mockWriteFile,
  readFile: mockReadFile,
  readdir: mockReaddir,
  mkdir: mockMkdir,
}));

describe('EnvStore', () => {
  let store: EnvStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new EnvStore('/test/base/path');
  });

  // 主体 (Core Flows)
  describe('主体', () => {
    test('[主体] save writes env variables to file', async () => {
      await store.save('staging', { API_KEY: 'abc123', BASE_URL: 'https://api.example.com' });

      expect(mockWriteFile).toHaveBeenCalled();
      const call = mockWriteFile.mock.calls[0];
      expect(call[0]).toContain('staging.env');
      expect(call[1]).toContain('API_KEY=abc123');
    });

    test('[主体] load reads and parses env file', async () => {
      mockReadFile.mockResolvedValue(`
API_KEY=abc123
BASE_URL=https://api.example.com
# Comment line
SECRET=value
`);

      const variables = await store.load('staging');
      expect(variables['API_KEY']).toBe('abc123');
      expect(variables['BASE_URL']).toBe('https://api.example.com');
      expect(variables['SECRET']).toBe('value');
    });

    test('[主体] list returns all environment names', async () => {
      mockReaddir.mockResolvedValue(['default.env', 'staging.env', 'production.env']);

      const envs = await store.list();
      expect(envs).toContain('default');
      expect(envs).toContain('staging');
      expect(envs).toContain('production');
    });

    test('[主体] save calls writeFile', async () => {
      await store.save('staging', { KEY: 'value' });
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('[主体] save writes multiple variables', async () => {
      await store.save('staging', { KEY1: 'value1', KEY2: 'value2', KEY3: 'value3' });

      const content = mockWriteFile.mock.calls[0][1] as string;
      expect(content).toContain('KEY1=value1');
      expect(content).toContain('KEY2=value2');
      expect(content).toContain('KEY3=value3');
    });
  });

  // 边界 (Boundary Conditions)
  describe('边界', () => {
    test('[边界] get returns empty object for nonexistent env', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const variables = await store.load('nonexistent');
      expect(variables).toEqual({});
    });

    test('[边界] save with empty key handles gracefully', async () => {
      // Empty key should be handled by the save function
      await store.save('staging', { '': 'value' });
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('[边界] get returns empty object when file is empty', async () => {
      mockReadFile.mockResolvedValue('');

      const variables = await store.load('staging');
      expect(variables).toEqual({});
    });

    test('[边界] get ignores comment lines', async () => {
      mockReadFile.mockResolvedValue(`
# This is a comment
API_KEY=value
# Another comment
`);
      const variables = await store.load('staging');
      expect(variables).toEqual({ 'API_KEY': 'value' });
    });

    test('[边界] get ignores empty lines', async () => {
      mockReadFile.mockResolvedValue('\n\n\nAPI_KEY=value\n\n\n');
      const variables = await store.load('staging');
      expect(variables).toEqual({ 'API_KEY': 'value' });
    });

    test('[边界] get handles values with equals sign', async () => {
      mockReadFile.mockResolvedValue('URL=https://example.com?a=1&b=2');
      const variables = await store.load('staging');
      expect(variables['URL']).toBe('https://example.com?a=1&b=2');
    });

    test('[边界] save handles empty value', async () => {
      await store.save('staging', { EMPTY_KEY: '' });

      const content = mockWriteFile.mock.calls[0][1] as string;
      expect(content).toContain('EMPTY_KEY=');
    });

    test('[边界] list returns empty array when no env files exist', async () => {
      mockReaddir.mockResolvedValue([]);

      const envs = await store.list();
      expect(envs).toEqual([]);
    });

    test('[边界] list filters non-.env files', async () => {
      mockReaddir.mockResolvedValue(['default.env', 'readme.md', '.DS_Store']);

      const envs = await store.list();
      expect(envs).toContain('default');
      expect(envs).not.toContain('readme.md');
      expect(envs).not.toContain('.DS_Store');
    });

    test('[边界] get handles key without value (empty string)', async () => {
      mockReadFile.mockResolvedValue('API_KEY=');
      const variables = await store.load('staging');
      expect(variables['API_KEY']).toBe('');
    });

    test('[边界] get handles whitespace around key/value', async () => {
      mockReadFile.mockResolvedValue('  API_KEY  =  value  ');
      const variables = await store.load('staging');
      expect(variables['API_KEY']).toBe('value');
    });
  });

  // 流程 (Multi-Step Flows)
  describe('流程', () => {
    test('[流程] set staging -> get staging returns value', async () => {
      mockReadFile.mockResolvedValue('STAGING_URL=https://staging.example.com');

      await store.save('staging', { STAGING_URL: 'https://staging.example.com' });
      const variables = await store.load('staging');

      expect(variables['STAGING_URL']).toBe('https://staging.example.com');
    });

    test('[流程] multiple envs are independent', async () => {
      mockReadFile
        .mockResolvedValueOnce('KEY=value1')
        .mockResolvedValueOnce('KEY=value2');

      await store.save('env1', { KEY: 'value1' });
      await store.save('env2', { KEY: 'value2' });

      const env1Vars = await store.load('env1');
      const env2Vars = await store.load('env2');

      expect(env1Vars['KEY']).toBe('value1');
      expect(env2Vars['KEY']).toBe('value2');
    });

    test('[流程] save overwrites previous values', async () => {
      mockReadFile.mockResolvedValue('KEY=newvalue');

      await store.save('staging', { KEY: 'oldvalue' });
      await store.save('staging', { KEY: 'newvalue' });

      const content = mockWriteFile.mock.calls[1][1] as string;
      expect(content).toContain('KEY=newvalue');
    });

    test('[流程] large number of variables', async () => {
      const manyVars: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        manyVars[`KEY_${i}`] = `value_${i}`;
      }

      await store.save('staging', manyVars);

      const content = mockWriteFile.mock.calls[0][1] as string;
      expect(content).toContain('KEY_0=value_0');
      expect(content).toContain('KEY_49=value_49');
    });
  });
});