import { vi, describe, test, expect, beforeEach } from 'vitest';
import {
  registerParser,
  getParser,
  detectAndParse,
  detectAndParseAll,
  parsers,
  type Parser,
} from '../index.js';

describe('parsers index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerParser', () => {
    test('[主体] registers a new parser', () => {
      const mockParser: Parser = {
        name: 'test-parser',
        detect: vi.fn().mockReturnValue(false),
        parse: vi.fn().mockResolvedValue({ name: 'Test', version: '1.0.0', baseUrl: '', endpoints: [] }),
      };

      registerParser(mockParser);

      expect(getParser('test-parser')).toBe(mockParser);

      // Clean up
      parsers.delete('test-parser');
    });
  });

  describe('getParser', () => {
    test('[主体] returns registered parser', () => {
      const parser = getParser('openapi');
      expect(parser).toBeDefined();
      expect(parser?.name).toBe('openapi');
    });

    test('[边界] returns undefined for unknown parser', () => {
      const parser = getParser('nonexistent-parser');
      expect(parser).toBeUndefined();
    });
  });

  describe('detectAndParse', () => {
    test('[主体] parses with detected parser', async () => {
      const mockParser: Parser = {
        name: 'test-detect',
        detect: vi.fn().mockReturnValue(true),
        parse: vi.fn().mockResolvedValue({
          name: 'Detected API',
          version: '1.0.0',
          baseUrl: 'https://api.detected.com',
          endpoints: [],
        }),
      };
      parsers.set('test-detect', mockParser);

      const result = await detectAndParse('test content');

      expect(mockParser.detect).toHaveBeenCalledWith('test content');
      expect(mockParser.parse).toHaveBeenCalledWith('test content');
      expect(result.name).toBe('Detected API');

      parsers.delete('test-detect');
    });

    test('[主体] tries each parser in order', async () => {
      const mockParser1: Parser = {
        name: 'test-order-1',
        detect: vi.fn().mockReturnValue(false),
        parse: vi.fn().mockResolvedValue({ name: 'API1', version: '1.0.0', baseUrl: '', endpoints: [] }),
      };
      const mockParser2: Parser = {
        name: 'test-order-2',
        detect: vi.fn().mockReturnValue(true),
        parse: vi.fn().mockResolvedValue({ name: 'API2', version: '1.0.0', baseUrl: '', endpoints: [] }),
      };
      parsers.set('test-order-1', mockParser1);
      parsers.set('test-order-2', mockParser2);

      const result = await detectAndParse('test content');

      expect(mockParser1.detect).toHaveBeenCalled();
      expect(mockParser2.detect).toHaveBeenCalled();
      expect(result.name).toBe('API2');

      parsers.delete('test-order-1');
      parsers.delete('test-order-2');
    });

    test('[边界] throws error when no parser matches', async () => {
      // Temporarily remove all parsers to simulate no match
      const originalParsers = new Map(parsers);
      parsers.clear();

      await expect(detectAndParse('unknown format')).rejects.toThrow('无法识别格式');

      // Restore original parsers
      originalParsers.forEach((value, key) => parsers.set(key, value));
    });
  });

  describe('detectAndParseAll', () => {
    test('[主体] returns single API when not SwaggerHub format', async () => {
      const mockParser: Parser = {
        name: 'test-single',
        detect: vi.fn().mockReturnValue(true),
        parse: vi.fn().mockResolvedValue({
          name: 'Single API',
          version: '1.0.0',
          baseUrl: 'https://api.test.com',
          endpoints: [],
        }),
      };
      parsers.set('test-single', mockParser);

      const results = await detectAndParseAll('single api content');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Single API');

      parsers.delete('test-single');
    });
  });

  describe('parsers registry', () => {
    test('[主体] contains all registered parsers', () => {
      expect(parsers.size).toBeGreaterThanOrEqual(7);
    });

    test('[主体] openapi parser is registered', () => {
      expect(parsers.has('openapi')).toBe(true);
    });

    test('[主体] openapi-2 parser is registered', () => {
      expect(parsers.has('openapi-2')).toBe(true);
    });

    test('[主体] asyncapi parser is registered', () => {
      expect(parsers.has('asyncapi')).toBe(true);
    });

    test('[主体] graphql parser is registered', () => {
      expect(parsers.has('graphql')).toBe(true);
    });

    test('[主体] postman parser is registered', () => {
      expect(parsers.has('postman')).toBe(true);
    });

    test('[主体] http parser is registered', () => {
      expect(parsers.has('http')).toBe(true);
    });

    test('[主体] har parser is registered', () => {
      expect(parsers.has('har')).toBe(true);
    });
  });
});