import { writeFile, readFile, readdir, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

import { fetchWithTimeout, isBlockedUrl } from '../utils/http.js';
import { timeoutError } from '../utils/errors.js';

const FLARE_DIR = '.flare';
const HISTORY_DIR = join(FLARE_DIR, 'history');
const ID_RANDOM_LENGTH = 7;

export interface HistoryEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
  };
  apiName?: string;
  endpointPath?: string;
}

export interface HistoryFilter {
  method?: string;
  url?: string;
  limit?: number;
  offset?: number;
}

export class HistoryStore {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private historyPath(): string {
    return join(this.basePath, HISTORY_DIR);
  }

  async init(): Promise<void> {
    await mkdir(this.historyPath(), { recursive: true });
  }

  async save(entry: HistoryEntry): Promise<string> {
    await this.init();

    const id = entry.id || this.generateId();
    const filteredHeaders = filterSensitiveHeaders(entry.headers);
    const entryWithId: HistoryEntry = { ...entry, id, headers: filteredHeaders };

    const filePath = join(this.historyPath(), `${id}.json`);
    const content = JSON.stringify(entryWithId, null, 2);
    await writeFile(filePath, content, 'utf-8');

    // Update index
    await this.updateIndex(id, entryWithId);

    return id;
  }

  private generateId(): string {
    const randomPart = Math.random().toString(36).substring(2, 2 + ID_RANDOM_LENGTH);
    return `h_${Date.now()}_${randomPart}`;
  }

  private async updateIndex(id: string, entry: HistoryEntry): Promise<void> {
    const indexPath = join(this.historyPath(), 'index.json');
    let index: Record<string, string[]> = {};

    try {
      if (existsSync(indexPath)) {
        const content = await readFile(indexPath, 'utf-8');
        index = JSON.parse(content);
      }
    } catch (e) {
      // Corrupted index - reset to empty
      console.error('[HistoryManager] Failed to load index, resetting:', e);
      index = {};
    }

    // Index by date (YYYY-MM-DD) - immutable update
    const date = entry.timestamp.split('T')[0];
    const existingIds = index[date] || [];
    if (!existingIds.includes(id)) {
      index = {
        ...index,
        [date]: [...existingIds, id],
      };
    }

    await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  async load(id: string): Promise<HistoryEntry | null> {
    const filePath = join(this.historyPath(), `${id}.json`);
    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as HistoryEntry;
    } catch {
      return null;
    }
  }

  async list(filter?: HistoryFilter): Promise<HistoryEntry[]> {
    await this.init();

    const files = await readdir(this.historyPath());
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');

    const entries: HistoryEntry[] = [];

    for (const file of jsonFiles) {
      const content = await readFile(join(this.historyPath(), file), 'utf-8');
      const entry = JSON.parse(content) as HistoryEntry;

      // Apply filters
      if (filter?.method && entry.method.toUpperCase() !== filter.method.toUpperCase()) {
        continue;
      }
      if (filter?.url && !entry.url.toLowerCase().includes(filter.url.toLowerCase())) {
        continue;
      }

      entries.push(entry);
    }

    // Sort by timestamp descending (newest first) - immutable
    const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination (immutable - use slice instead of splice)
    let result = sortedEntries;
    if (filter?.offset) {
      result = result.slice(filter.offset);
    }
    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const filePath = join(this.historyPath(), `${id}.json`);
    try {
      await unlink(filePath);
      await this.removeFromIndex(id);
      return true;
    } catch {
      return false;
    }
  }

  private async removeFromIndex(id: string): Promise<void> {
    const indexPath = join(this.historyPath(), 'index.json');
    if (!existsSync(indexPath)) return;

    try {
      const content = await readFile(indexPath, 'utf-8');
      const index: Record<string, string[]> = JSON.parse(content);

      // Immutable update - filter and rebuild index
      const newIndex: Record<string, string[]> = {};
      for (const date of Object.keys(index)) {
        const filtered = index[date].filter(entryId => entryId !== id);
        if (filtered.length > 0) {
          newIndex[date] = filtered;
        }
      }

      await writeFile(indexPath, JSON.stringify(newIndex, null, 2), 'utf-8');
    } catch (e) {
      // Best effort - index corruption shouldn't block operations
      console.error('[HistoryManager] Failed to update index:', e);
    }
  }

  async clear(): Promise<void> {
    const files = await readdir(this.historyPath());
    for (const file of files) {
      if (file !== 'index.json') {
        await unlink(join(this.historyPath(), file));
      }
    }
  }

  async count(): Promise<number> {
    const files = await readdir(this.historyPath());
    return files.filter(f => f.endsWith('.json') && f !== 'index.json').length;
  }
}

export interface DiffResult {
  hasDiff: boolean;
  statusDiff?: { left?: number; right?: number; same: boolean };
  timeDiff?: { left?: number; right?: number; same: boolean };
  headerDiffs?: { key: string; left?: string; right?: string }[];
  bodyDiff?: { left?: string; right?: string; same: boolean };
}

export function compareHistoryEntries(left: HistoryEntry, right: HistoryEntry): DiffResult {
  const result: DiffResult = { hasDiff: false };

  // Compare status
  if (left.response?.status !== right.response?.status) {
    result.hasDiff = true;
    result.statusDiff = {
      left: left.response?.status || 0,
      right: right.response?.status || 0,
      same: false,
    };
  } else {
    result.statusDiff = {
      left: left.response?.status || 0,
      right: right.response?.status || 0,
      same: true,
    };
  }

  // Compare time
  if (left.response?.time !== right.response?.time) {
    result.hasDiff = true;
    result.timeDiff = {
      left: left.response?.time || 0,
      right: right.response?.time || 0,
      same: false,
    };
  } else {
    result.timeDiff = {
      left: left.response?.time || 0,
      right: right.response?.time || 0,
      same: true,
    };
  }

  // Compare headers
  const leftHeaders = left.response?.headers || {};
  const rightHeaders = right.response?.headers || {};
  const allKeys = new Set([...Object.keys(leftHeaders), ...Object.keys(rightHeaders)]);

  for (const key of allKeys) {
    if (leftHeaders[key] !== rightHeaders[key]) {
      result.hasDiff = true;
      if (!result.headerDiffs) result.headerDiffs = [];
      result.headerDiffs.push({
        key,
        left: leftHeaders[key] || '',
        right: rightHeaders[key] || '',
      });
    }
  }

  // Compare body
  const leftBody = left.response?.body || '';
  const rightBody = right.response?.body || '';
  if (leftBody !== rightBody) {
    result.hasDiff = true;
    result.bodyDiff = {
      left: leftBody,
      right: rightBody,
      same: false,
    };
  } else {
    result.bodyDiff = {
      left: leftBody,
      right: rightBody,
      same: true,
    };
  }

  return result;
}

const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-refresh-token',
  'x-session-token',
  'proxy-authorization',
  'www-authenticate',
];

function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADERS.includes(name.toLowerCase());
}

function filterSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!isSensitiveHeader(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export async function replayRequest(
  entry: HistoryEntry,
  variables?: Record<string, string>
): Promise<{ status: number; body: string; time: number }> {
  let url = entry.url;

  // Substitute variables
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      url = url.replace(`{{${key}}}`, value);
      url = url.replace(`{${key}}`, value);
    }
  }

  // SSRF protection check
  if (isBlockedUrl(url)) {
    throw new Error(`SSRF protection: blocked internal URL ${url}`);
  }

  const startTime = Date.now();

  try {
    const response = await fetchWithTimeout(url, {
      method: entry.method,
      headers: entry.headers,
      body: entry.body ? JSON.stringify(entry.body) : undefined,
    });

    const body = await response.text();
    const time = Date.now() - startTime;

    return {
      status: response.status,
      body,
      time,
    };
  } catch (error) {
    const time = Date.now() - startTime;
    throw new Error(`Replay request failed for ${entry.method} ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const historyStore = new HistoryStore();