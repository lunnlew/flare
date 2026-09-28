import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Test the completion module
describe('completion', () => {
  // 主体 (Core Flows)
  describe('主体', () => {
    test('[主体] bash completion script starts with shebang', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output.startsWith('#!/bin/bash')).toBe(true);
    });

    test('[主体] bash completion includes all commands', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output).toContain('add');
      expect(output).toContain('list');
      expect(output).toContain('search');
      expect(output).toContain('run');
      expect(output).toContain('env');
      expect(output).toContain('history');
      expect(output).toContain('example');
    });

    test('[主体] bash completion includes subcommands for history', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output).toContain('list');
      expect(output).toContain('replay');
      expect(output).toContain('diff');
    });

    test('[主体] bash completion includes HTTP methods', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output).toContain('GET');
      expect(output).toContain('POST');
      expect(output).toContain('PUT');
      expect(output).toContain('DELETE');
      expect(output).toContain('PATCH');
    });

    test('[主体] bash completion includes --auth-location option', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output).toContain('--auth-location');
    });

    test('[主体] bash completion registers completion function', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output).toContain('complete -F _flare_api flare-api');
    });

    test('[主体] zsh completion script starts with shebang', async () => {
      const { generateZshCompletion } = await import('../completion.js');
      const output = generateZshCompletion();
      expect(output.startsWith('#!/usr/bin/env zsh')).toBe(true);
    });

    test('[主体] zsh completion uses _arguments', async () => {
      const { generateZshCompletion } = await import('../completion.js');
      const output = generateZshCompletion();
      expect(output).toContain('_arguments');
    });

    test('[主体] zsh completion includes command descriptions', async () => {
      const { generateZshCompletion } = await import('../completion.js');
      const output = generateZshCompletion();
      expect(output).toContain('add:Import API from source');
      expect(output).toContain('list:List all APIs');
      expect(output).toContain('run:Send API request');
    });

    test('[主体] fish completion uses complete -c', async () => {
      const { generateFishCompletion } = await import('../completion.js');
      const output = generateFishCompletion();
      expect(output).toContain('complete -c flare-api');
    });

    test('[主体] fish completion includes all commands', async () => {
      const { generateFishCompletion } = await import('../completion.js');
      const output = generateFishCompletion();
      expect(output).toContain('add');
      expect(output).toContain('list');
      expect(output).toContain('search');
      expect(output).toContain('run');
      expect(output).toContain('env');
      expect(output).toContain('history');
      expect(output).toContain('example');
    });

    test('[主体] generateCompletion returns bash for bash shell', async () => {
      const { generateCompletion } = await import('../completion.js');
      const output = generateCompletion('bash');
      expect(output.startsWith('#!/bin/bash')).toBe(true);
    });

    test('[主体] generateCompletion returns zsh for zsh shell', async () => {
      const { generateCompletion } = await import('../completion.js');
      const output = generateCompletion('zsh');
      expect(output.startsWith('#!/usr/bin/env zsh')).toBe(true);
    });

    test('[主体] generateCompletion returns fish for fish shell', async () => {
      const { generateCompletion } = await import('../completion.js');
      const output = generateCompletion('fish');
      expect(output).toContain('complete -c flare-api');
    });
  });

  // 边界 (Boundary Conditions)
  describe('边界', () => {
    test('[边界] generateCompletion throws for unsupported shell', async () => {
      const { generateCompletion } = await import('../completion.js');
      expect(() => generateCompletion('powershell' as any)).toThrow('Unsupported shell: powershell');
    });

    test('[边界] bash output is idempotent', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output1 = generateBashCompletion();
      const output2 = generateBashCompletion();
      expect(output1).toBe(output2);
    });

    test('[边界] zsh output is idempotent', async () => {
      const { generateZshCompletion } = await import('../completion.js');
      const output1 = generateZshCompletion();
      const output2 = generateZshCompletion();
      expect(output1).toBe(output2);
    });

    test('[边界] fish output is idempotent', async () => {
      const { generateFishCompletion } = await import('../completion.js');
      const output1 = generateFishCompletion();
      const output2 = generateFishCompletion();
      expect(output1).toBe(output2);
    });

    test('[边界] bash completion output size is reasonable (less than 100KB)', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output.length).toBeLessThan(100 * 1024);
    });

    test('[边界] zsh completion output size is reasonable (less than 100KB)', async () => {
      const { generateZshCompletion } = await import('../completion.js');
      const output = generateZshCompletion();
      expect(output.length).toBeLessThan(100 * 1024);
    });

    test('[边界] fish completion output size is reasonable (less than 100KB)', async () => {
      const { generateFishCompletion } = await import('../completion.js');
      const output = generateFishCompletion();
      expect(output.length).toBeLessThan(100 * 1024);
    });

    test('[边界] bash completion for add command includes auth options', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output = generateBashCompletion();
      expect(output).toContain('--auth-key');
      expect(output).toContain('--auth-value');
    });

    test('[边界] zsh completion for add command includes auth location', async () => {
      const { generateZshCompletion } = await import('../completion.js');
      const output = generateZshCompletion();
      expect(output).toContain('--auth-location');
    });

    test('[边界] fish completion for add command includes auth-location', async () => {
      const { generateFishCompletion } = await import('../completion.js');
      const output = generateFishCompletion();
      expect(output).toContain('-l auth-location');
    });
  });

  // 流程 (Multi-Step Flows)
  describe('流程', () => {
    test('[流程] getCompletionInstallInstructions returns bash instructions', async () => {
      const { getCompletionInstallInstructions } = await import('../completion.js');
      const instructions = getCompletionInstallInstructions('bash');
      expect(instructions).toContain('~/.bashrc');
      expect(instructions).toContain('source');
    });

    test('[流程] getCompletionInstallInstructions returns zsh instructions', async () => {
      const { getCompletionInstallInstructions } = await import('../completion.js');
      const instructions = getCompletionInstallInstructions('zsh');
      expect(instructions).toContain('~/.zshrc');
      expect(instructions).toContain('source');
    });

    test('[流程] getCompletionInstallInstructions returns fish instructions', async () => {
      const { getCompletionInstallInstructions } = await import('../completion.js');
      const instructions = getCompletionInstallInstructions('fish');
      expect(instructions).toContain('~/.config/fish/completions');
    });

    test('[流程] running completion twice produces identical output', async () => {
      const { generateBashCompletion } = await import('../completion.js');
      const output1 = generateBashCompletion();
      const output2 = generateBashCompletion();
      expect(output1).toBe(output2);
    });
  });

  // completionCommand tests
  describe('completionCommand', () => {
    const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    afterEach(() => {
      mockConsoleLog.mockClear();
      mockConsoleError.mockClear();
    });

    test('[主体] completionCommand with bash outputs bash script', async () => {
      const { completionCommand } = await import('../completion.js');
      await completionCommand(['bash']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('#!/bin/bash'));
    });

    test('[主体] completionCommand with zsh outputs zsh script', async () => {
      const { completionCommand } = await import('../completion.js');
      await completionCommand(['zsh']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('#!/usr/bin/env zsh'));
    });

    test('[主体] completionCommand with fish outputs fish script', async () => {
      const { completionCommand } = await import('../completion.js');
      await completionCommand(['fish']);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('complete -c flare-api'));
    });

    test('[边界] completionCommand with no argument prints usage', async () => {
      const { completionCommand } = await import('../completion.js');
      try {
        await completionCommand([]);
      } catch (e) {
        // Expected - process.exit was called
      }
      // completionCommand uses console.log (not error) for usage message
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    test('[边界] completionCommand with invalid shell prints usage', async () => {
      const { completionCommand } = await import('../completion.js');
      try {
        await completionCommand(['powershell']);
      } catch (e) {
        // Expected - process.exit was called
      }
      // completionCommand uses console.log (not error) for usage message
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});