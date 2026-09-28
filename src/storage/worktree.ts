import { execSync, exec as execAsync } from './exec.js';
import { join } from 'path';

const WORKTREE_DIR = '.flare/worktrees';

export interface WorktreeInfo {
  name: string;
  path: string;
  branch: string;
  isMain?: boolean;
}

export interface WorktreeConfig {
  name: string;
  branch?: string;
}

export class WorktreeManager {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private worktreesPath(): string {
    return join(this.basePath, WORKTREE_DIR);
  }

  async list(): Promise<WorktreeInfo[]> {
    try {
      const output = execSync('git', ['worktree', 'list', '--porcelain'], this.basePath);
      const worktrees = this.parseWorktreeList(output);
      return worktrees;
    } catch (error) {
      console.error('Failed to list worktrees:', error);
      return [];
    }
  }

  private parseWorktreeList(output: string): WorktreeInfo[] {
    const lines = output.split('\n');
    const worktrees: WorktreeInfo[] = [];
    let current: Partial<WorktreeInfo> = {};

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (current.path && current.branch) {
          worktrees.push(current as WorktreeInfo);
        }
        current = { path: line.substring(9).trim() };
      } else if (line.startsWith('branch ')) {
        const branch = line.substring(7).trim();
        current.branch = branch;
        current.isMain = branch === 'main' || branch === 'refs/heads/main';
      }
    }

    if (current.path && current.branch) {
      worktrees.push(current as WorktreeInfo);
    }

    return worktrees;
  }

  async create(config: WorktreeConfig): Promise<WorktreeInfo | null> {
    const { name, branch } = config;

    if (!name) {
      throw new Error('Worktree name is required');
    }

    const worktreePath = join(this.worktreesPath(), name);
    const branchName = branch || `worktree/${name}`;

    try {
      // Create branch if it doesn't exist
      const branches = await this.list();
      const branchExists = branches.some(w => w.branch === branchName);

      if (!branchExists) {
        execSync('git', ['branch', branchName], this.basePath);
      }

      // Create worktree
      execSync('git', ['worktree', 'add', '-b', branchName, worktreePath, 'HEAD'], this.basePath);

      // Copy .flare/apis to worktree if main has it
      const mainApisPath = join(this.basePath, '.flare', 'apis');
      const worktreeApisPath = join(worktreePath, '.flare', 'apis');

      await this.ensureDir(join(worktreePath, '.flare'));
      await this.copyDir(mainApisPath, worktreeApisPath);

      return {
        name,
        path: worktreePath,
        branch: branchName,
      };
    } catch (error) {
      console.error(`Failed to create worktree "${name}":`, error);
      return null;
    }
  }

  async remove(name: string): Promise<boolean> {
    try {
      const worktreePath = join(this.worktreesPath(), name);

      // Remove worktree
      execSync('git', ['worktree', 'remove', worktreePath, '--force'], this.basePath);

      return true;
    } catch (error) {
      console.error(`Failed to remove worktree "${name}":`, error);
      return false;
    }
  }

  async switch(name: string): Promise<boolean> {
    try {
      const worktreePath = join(this.worktreesPath(), name);
      const worktreeInfo = await this.findByName(name);

      if (!worktreeInfo) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async merge(name: string, targetBranch: string = 'main'): Promise<boolean> {
    try {
      const worktreeInfo = await this.findByName(name);

      if (!worktreeInfo) {
        return false;
      }

      // Checkout target branch in main
      execSync('git', ['checkout', targetBranch], this.basePath);

      // Merge worktree branch
      execSync('git', ['merge', worktreeInfo.branch, '--no-ff'], this.basePath);

      // Delete worktree branch after merge
      execSync('git', ['branch', '-d', worktreeInfo.branch], this.basePath);

      // Remove worktree
      await this.remove(name);

      return true;
    } catch (error) {
      return false;
    }
  }

  async findByName(name: string): Promise<WorktreeInfo | null> {
    const worktrees = await this.list();
    return worktrees.find(w => w.name === name) || null;
  }

  private async ensureDir(dirPath: string): Promise<void> {
    const { mkdir } = await import('fs/promises');
    await mkdir(dirPath, { recursive: true });
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    try {
      const { cp, access } = await import('fs/promises');
      await access(src);
      await cp(src, dest, { recursive: true });
    } catch {
      // Source doesn't exist, skip copying
    }
  }

  async cleanup(): Promise<void> {
    const worktrees = await this.list();

    for (const wt of worktrees) {
      if (wt.isMain) continue;

      try {
        const { access } = await import('fs/promises');
        await access(wt.path);
      } catch {
        // Worktree directory no longer exists, prune it
        execSync('git', ['worktree', 'prune'], this.basePath);
      }
    }
  }
}

export const worktreeManager = new WorktreeManager();