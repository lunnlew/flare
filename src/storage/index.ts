import { writeFile, readFile, readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import YAML from 'yaml';
import type { API, Collection, Environment } from '../ir/index.js';
import { GitStore, gitStore as defaultGitStore } from './git-store.js';

const FLARE_DIR = '.flare';
const APIS_DIR = join(FLARE_DIR, 'apis');
const ENV_DIR = join(FLARE_DIR, 'env');
const INDEX_FILE = join(FLARE_DIR, 'index.json');

// Re-export GitStore for backward compatibility
export { GitStore, gitStore } from './git-store.js';

export class IndexStore {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private indexPath(): string {
    return join(this.basePath, INDEX_FILE);
  }

  async load(): Promise<IndexData> {
    try {
      const content = await readFile(this.indexPath(), 'utf-8');
      return JSON.parse(content);
    } catch {
      return { apis: [], keywords: {} };
    }
  }

  async save(data: IndexData): Promise<void> {
    await writeFile(this.indexPath(), JSON.stringify(data, null, 2), 'utf-8');
  }

  async buildIndex(apis: API[]): Promise<void> {
    const keywords: Record<string, string[]> = {};

    for (const api of apis) {
      const kw: string[] = [api.name, ...(api.tags || [])];

      for (const endpoint of api.endpoints) {
        kw.push(endpoint.method, endpoint.path);
        if (endpoint.summary) kw.push(endpoint.summary);
        if (endpoint.tags) kw.push(...endpoint.tags);
      }

      keywords[api.name] = kw;
    }

    await this.save({ apis: apis.map(a => a.name), keywords });
  }

  async search(query: string): Promise<string[]> {
    const index = await this.load();
    const q = query.toLowerCase();
    const results: string[] = [];

    for (const [apiName, kws] of Object.entries(index.keywords)) {
      if (kws.some((kw: string) => kw.toLowerCase().includes(q))) {
        results.push(apiName);
      }
    }

    return results;
  }
}

export interface IndexData {
  apis: string[];
  keywords: Record<string, string[]>;
}

export class EnvStore {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  async init(): Promise<void> {
    const dir = join(this.basePath, ENV_DIR);
    await mkdir(dir, { recursive: true });
  }

  private envPath(envName: string): string {
    return join(this.basePath, ENV_DIR, `${envName}.env`);
  }

  async load(envName: string): Promise<Record<string, string>> {
    const filePath = this.envPath(envName);
    try {
      const content = await readFile(filePath, 'utf-8');
      return parseEnvFile(content);
    } catch {
      return {};
    }
  }

  async save(envName: string, variables: Record<string, string>): Promise<void> {
    const filePath = this.envPath(envName);
    const content = Object.entries(variables)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    await writeFile(filePath, content, 'utf-8');
  }

  async list(): Promise<string[]> {
    const files = await readdir(this.envPath(''));
    return files.filter(f => f.endsWith('.env')).map(f => f.replace('.env', ''));
  }
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key) result[key.trim()] = rest.join('=').trim();
  }
  return result;
}

export const indexStore = new IndexStore();
export const envStore = new EnvStore();