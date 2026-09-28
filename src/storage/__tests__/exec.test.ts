import { vi, describe, test, expect } from 'vitest';
import { execSync, exec } from '../exec.js';

describe('storage - exec', () => {
  describe('execSync', () => {
    test('[主体] throws on failed command', () => {
      // On Windows, use a command that will definitely fail
      expect(() => execSync('nonexistent_command_12345', [], '/tmp')).toThrow();
    });

    test('[边界] error contains command info', () => {
      try {
        execSync('false', [], '/tmp');
      } catch (error: any) {
        expect(error.message).toContain('Command failed');
      }
    });
  });

  describe('exec (async)', () => {
    test('[主体] throws on failed command async', async () => {
      await expect(exec('nonexistent_command_12345', [], '/tmp')).rejects.toThrow();
    });

    test('[边界] error message contains command', async () => {
      try {
        await exec('false', [], '/tmp');
      } catch (error: any) {
        expect(error.message).toContain('Command failed');
      }
    });
  });
});