import { exec, execSync } from './exec.js';
import type { API } from '../ir/index.js';

const FLARE_DIR = '.flare';
const APIS_DIR = `${FLARE_DIR}/apis`;

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  files: string[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

export interface DiffHunk {
  lines: DiffLine[];
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
}

export interface DiffFile {
  path: string;
  hunks: DiffHunk[];
}

export interface DiffResult {
  files: DiffFile[];
  summary: { added: number; removed: number };
}

export interface Branch {
  name: string;
  current: boolean;
  remote: boolean;
}

export interface Tag {
  name: string;
  message: string | null;
  hash: string;
}

export interface RepoStatus {
  clean: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  conflicting: string[];
}

export class GitStore {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private async runGit(args: string[]): Promise<string> {
    return exec('git', args, this.basePath);
  }

  private runGitSync(args: string[]): string {
    return execSync('git', args, this.basePath);
  }

  async init(): Promise<void> {
    // Initialize .flare directory structure
    const dirs = [FLARE_DIR, APIS_DIR, `${FLARE_DIR}/env`, `${FLARE_DIR}/flows`, `${FLARE_DIR}/mocks`, `${FLARE_DIR}/history`];

    for (const dir of dirs) {
      this.runGitSync(['mkdir', '-p', dir]);
    }

    // Check if already a git repo
    try {
      this.runGitSync(['rev-parse', '--git-dir']);
    } catch {
      // Not a git repo, initialize
      this.runGitSync(['init']);
      this.runGitSync(['add', '.']);
      await this.commit('Initial commit', false);
    }
  }

  async saveAPI(api: API, message?: string): Promise<void> {
    const fileName = `${api.name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    const filePath = `${APIS_DIR}/${fileName}`;

    // Save file content
    const content = this.apiToYaml(api);
    this.runGitSync(['write-tree', '--prefix=' + FLARE_DIR]);

    // Write file directly since we need proper YAML serialization
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');

    await this.add([filePath]);

    const msg = message || `feat: update ${api.name} API configuration`;
    await this.commit(msg);
  }

  private apiToYaml(api: API): string {
    // Simple YAML serialization - in production use yaml library
    const lines: string[] = [];
    lines.push(`name: ${api.name}`);
    lines.push(`version: ${api.version || '1.0.0'}`);
    lines.push(`baseUrl: ${api.baseUrl}`);

    if (api.description) {
      lines.push(`description: ${api.description}`);
    }

    lines.push('endpoints:');
    for (const ep of api.endpoints) {
      lines.push(`  - path: ${ep.path}`);
      lines.push(`    method: ${ep.method}`);
      if (ep.summary) lines.push(`    summary: ${ep.summary}`);
      if (ep.description) lines.push(`    description: ${ep.description}`);
      if (ep.operationId) lines.push(`    operationId: ${ep.operationId}`);
      if (ep.deprecated) lines.push(`    deprecated: true`);
    }

    return lines.join('\n');
  }

  async loadAPI(name: string): Promise<API | null> {
    const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    const filePath = `${APIS_DIR}/${fileName}`;

    try {
      const content = this.runGitSync(['show', `HEAD:${filePath}`]);
      return this.yamlToApi(content);
    } catch {
      return null;
    }
  }

  private yamlToApi(content: string): API {
    // Simple YAML parsing - in production use yaml library
    const lines = content.split('\n');
    const api: any = { endpoints: [] };
    let currentEndpoint: any = null;
    let inEndpoints = false;

    for (const line of lines) {
      if (line.startsWith('name:')) api.name = line.replace('name:', '').trim();
      else if (line.startsWith('version:')) api.version = line.replace('version:', '').trim();
      else if (line.startsWith('baseUrl:')) api.baseUrl = line.replace('baseUrl:', '').trim();
      else if (line.startsWith('description:')) api.description = line.replace('description:', '').trim();
      else if (line.startsWith('endpoints:')) inEndpoints = true;
      else if (inEndpoints && line.includes('- path:')) {
        if (currentEndpoint) api.endpoints.push(currentEndpoint);
        currentEndpoint = { path: line.replace('- path:', '').trim() };
      }
      else if (currentEndpoint && line.includes('method:')) currentEndpoint.method = line.replace('method:', '').trim();
      else if (currentEndpoint && line.includes('summary:')) currentEndpoint.summary = line.replace('summary:', '').trim();
    }

    if (currentEndpoint) api.endpoints.push(currentEndpoint);
    return api as API;
  }

  async listAPIs(): Promise<API[]> {
    try {
      const output = this.runGitSync(['ls-tree', '-r', '--name-only', 'HEAD', APIS_DIR]);
      const fileNames = output
        .split('\n')
        .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      const apis: API[] = [];
      for (const fileName of fileNames) {
        try {
          const content = this.runGitSync(['show', `HEAD:${fileName}`]);
          const api = this.yamlToApi(content);
          if (api.name) apis.push(api);
        } catch {
          // Skip files that can't be read
        }
      }
      return apis;
    } catch {
      return [];
    }
  }

  async deleteAPI(name: string, message?: string): Promise<void> {
    const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    const filePath = `${APIS_DIR}/${fileName}`;

    await this.runGit(['rm', '--cached', '-f', filePath]);

    const msg = message || `feat: remove ${name} API`;
    await this.commit(msg);
  }

  // Git operations
  async getHistory(apiName?: string, limit: number = 10): Promise<GitCommit[]> {
    let args = ['log', `--format=%H|%h|%s|%an|%ae|%at|%d`, `--date=unix`];

    if (apiName) {
      const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
      const filePath = `${APIS_DIR}/${fileName}`;
      args.push('--', filePath);
    }

    args.push(`--max-count=${limit}`);

    const output = await this.runGit(args);
    if (!output.trim()) return [];

    const commits: GitCommit[] = [];
    for (const line of output.split('\n').filter(l => l.trim())) {
      const [hash, shortHash, message, author, email, timestamp] = line.split('|');
      commits.push({
        hash,
        shortHash,
        message,
        author,
        email,
        timestamp: parseInt(timestamp, 10) * 1000,
        files: [],
      });
    }

    return commits;
  }

  async diff(apiName: string, commitA: string, commitB?: string): Promise<DiffResult> {
    const fileName = `${apiName.toLowerCase().replace(/\s+/g, '-')}.yaml`;
    const filePath = `${APIS_DIR}/${fileName}`;
    const refB = commitB || 'HEAD';

    const output = await this.runGit(['diff', commitA, refB, '--', filePath]);
    return this.parseDiff(output);
  }

  private parseDiff(output: string): DiffResult {
    const files: DiffFile[] = [];
    let currentFile: DiffFile | null = null;
    let currentHunk: DiffHunk | null = null;
    let added = 0;
    let removed = 0;

    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) files.push(currentFile);
        currentFile = { path: line.match(/a\/(.*)/)?.[1] || '', hunks: [] };
      } else if (line.startsWith('@@')) {
        const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
        if (match && currentFile) {
          currentHunk = {
            lines: [],
            oldStart: parseInt(match[1], 10),
            oldLines: parseInt(match[2] || '1', 10),
            newStart: parseInt(match[3], 10),
            newLines: parseInt(match[4] || '1', 10),
          };
          currentFile.hunks.push(currentHunk);
        }
      } else if (currentHunk) {
        const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context';
        if (type === 'add') added++;
        if (type === 'remove') removed++;

        currentHunk.lines.push({
          type,
          content: line.slice(1),
          oldLineNumber: null,
          newLineNumber: null,
        });
      }
    }

    if (currentFile) files.push(currentFile);

    return { files, summary: { added, removed } };
  }

  async status(): Promise<RepoStatus> {
    const output = await this.runGit(['status', '--porcelain=v1']);
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    const conflicting: string[] = [];

    for (const line of output.split('\n').filter(l => l.trim())) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const file = line.slice(3);

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(file);
      } else if (indexStatus === 'U' || workTreeStatus === 'U') {
        conflicting.push(file);
      } else if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(file);
      } else if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
        unstaged.push(file);
      }
    }

    return {
      clean: staged.length === 0 && unstaged.length === 0 && untracked.length === 0 && conflicting.length === 0,
      staged,
      unstaged,
      untracked,
      conflicting,
    };
  }

  async add(files: string[]): Promise<void> {
    await this.runGit(['add', ...files]);
  }

  async reset(file: string, mode: 'soft' | 'mixed' | 'hard' = 'mixed'): Promise<void> {
    await this.runGit(['reset', `--${mode}`, file]);
  }

  async commit(message: string, allowEmpty: boolean = false): Promise<void> {
    const args = ['commit', '-m', message];
    if (allowEmpty) args.push('--allow-empty');
    await this.runGit(args);
  }

  // Branch operations
  async branch(name: string): Promise<void> {
    await this.runGit(['branch', name]);
  }

  async checkout(branch: string): Promise<void> {
    await this.runGit(['checkout', branch]);
  }

  async merge(branch: string): Promise<void> {
    await this.runGit(['merge', branch]);
  }

  async listBranches(): Promise<Branch[]> {
    const output = await this.runGit(['branch', '-a']);
    const branches: Branch[] = [];

    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const isCurrent = trimmed.startsWith('*');
      const name = trimmed.replace(/^\*?\s*/, '').replace(/^\s*/, '');
      const isRemote = name.startsWith('remotes/');
      branches.push({
        name: name.replace(/^remotes\//, ''),
        current: isCurrent,
        remote: isRemote,
      });
    }

    return branches;
  }

  // Tag operations
  async tag(name: string, message?: string): Promise<void> {
    const args = ['tag', name];
    if (message) {
      args.push('-a', name, '-m', message);
    }
    await this.runGit(args);
  }

  async listTags(): Promise<Tag[]> {
    const output = await this.runGit(['tag', '-l', '--format=%(refname:short)|%(subject)|%(*objectname:short)']);
    const tags: Tag[] = [];

    for (const line of output.split('\n').filter(l => l.trim())) {
      const [name, message, hash] = line.split('|');
      tags.push({ name, message, hash: hash || '' });
    }

    return tags;
  }

  // Staging operations
  async stage(files: string[]): Promise<void> {
    await this.runGit(['add', ...files]);
  }

  async unstage(files: string[]): Promise<void> {
    await this.runGit(['reset', 'HEAD', ...files]);
  }

  async stagedFiles(): Promise<string[]> {
    const output = await this.runGit(['diff', '--cached', '--name-only']);
    return output.split('\n').filter(f => f.trim());
  }

  async unstagedFiles(): Promise<string[]> {
    const output = await this.runGit(['diff', '--name-only']);
    return output.split('\n').filter(f => f.trim());
  }

  // Quick operations
  async discard(file: string): Promise<void> {
    await this.runGit(['checkout', '--', file]);
  }
}

export const gitStore = new GitStore();