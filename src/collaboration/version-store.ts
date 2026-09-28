/**
 * File-based Version Store
 * Persists API version snapshots to filesystem
 */

import { writeFile, readFile, unlink, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { API } from '../ir/index.js';
import type { VersionSnapshot, DiffResult, ChangeEntry } from './version.js';
import { detectChanges } from './version.js';

const FLARE_DIR = '.flare';
const VERSIONS_DIR = join(FLARE_DIR, 'versions');

export class FileVersionStore {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private versionsPath(): string {
    return join(this.basePath, VERSIONS_DIR);
  }

  private apiVersionsPath(apiName: string): string {
    return join(this.versionsPath(), apiName.replace(/[^a-zA-Z0-9-_]/g, '_'));
  }

  private snapshotPath(apiName: string, snapshotId: string): string {
    return join(this.apiVersionsPath(apiName), `${snapshotId}.json`);
  }

  private async ensureDir(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  /**
   * Atomic write for version snapshots
   */
  private async atomicWrite(filePath: string, data: VersionSnapshot): Promise<void> {
    const dir = join(filePath, '..');
    await this.ensureDir(dir);

    const tempPath = `${filePath}.tmp`;
    const content = JSON.stringify(data, null, 2);

    await writeFile(tempPath, content, 'utf-8');

    try {
      await import('fs/promises').then(fs => fs.rename(tempPath, filePath));
    } catch (e) {
      // Fallback if rename fails (e.g., cross-device) - log and continue
      console.error('[VersionStore] atomicWrite rename failed, using fallback:', e);
      await writeFile(filePath, content, 'utf-8');
      try {
        await unlink(tempPath);
      } catch (cleanupErr) {
        // Best effort cleanup - log but continue
        console.error('[VersionStore] Temp file cleanup failed:', cleanupErr);
      }
    }
  }

  /**
   * Create a snapshot of the current API state
   */
  async snapshot(api: API, notes?: string, tags?: string[]): Promise<VersionSnapshot> {
    const apiVersionsDir = this.apiVersionsPath(api.name);
    await this.ensureDir(apiVersionsDir);

    const snapshot: VersionSnapshot = {
      id: this.generateSnapshotId(),
      version: api.version,
      apiName: api.name,
      snapshot: api as any,
      createdAt: new Date().toISOString(),
      notes,
      tags,
    };

    const filePath = this.snapshotPath(api.name, snapshot.id);
    await this.atomicWrite(filePath, snapshot);

    // Create latest symlink or marker
    const latestPath = join(apiVersionsDir, 'latest.json');
    await writeFile(latestPath, JSON.stringify({ id: snapshot.id, timestamp: snapshot.createdAt }), 'utf-8');

    return snapshot;
  }

  /**
   * List all versions for an API
   */
  async listVersions(apiName: string): Promise<VersionSnapshot[]> {
    const apiVersionsDir = this.apiVersionsPath(apiName);

    if (!existsSync(apiVersionsDir)) {
      return [];
    }

    const files = await readdir(apiVersionsDir);
    const snapshots: VersionSnapshot[] = [];

    for (const file of files) {
      if (file === 'latest.json' || !file.endsWith('.json')) continue;

      try {
        const content = await readFile(join(apiVersionsDir, file), 'utf-8');
        snapshots.push(JSON.parse(content) as VersionSnapshot);
      } catch {
        // Ignore invalid snapshots
      }
    }

    return [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get a specific snapshot by ID
   */
  async getSnapshot(apiName: string, snapshotId: string): Promise<VersionSnapshot | null> {
    const filePath = this.snapshotPath(apiName, snapshotId);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as VersionSnapshot;
    } catch {
      return null;
    }
  }

  /**
   * Get the latest snapshot for an API
   */
  async getLatest(apiName: string): Promise<VersionSnapshot | null> {
    const apiVersionsDir = this.apiVersionsPath(apiName);
    const latestPath = join(apiVersionsDir, 'latest.json');

    if (!existsSync(latestPath)) {
      // Try to find the latest by timestamp
      const versions = await this.listVersions(apiName);
      if (versions.length === 0) return null;
      return versions[versions.length - 1];
    }

    try {
      const content = await readFile(latestPath, 'utf-8');
      const latest = JSON.parse(content);
      return this.getSnapshot(apiName, latest.id);
    } catch {
      return null;
    }
  }

  /**
   * Compare two versions and return diff
   */
  async diff(apiName: string, fromSnapshotId: string, toSnapshotId: string): Promise<DiffResult> {
    const fromSnapshot = await this.getSnapshot(apiName, fromSnapshotId);
    const toSnapshot = await this.getSnapshot(apiName, toSnapshotId);

    if (!fromSnapshot || !toSnapshot) {
      return {
        hasChanges: false,
        changes: [],
        summary: { added: 0, modified: 0, deleted: 0 },
      };
    }

    const beforeApi = fromSnapshot.snapshot as API;
    const afterApi = toSnapshot.snapshot as API;
    const changes = detectChanges(beforeApi, afterApi);

    return {
      hasChanges: changes.length > 0,
      changes,
      summary: {
        added: changes.filter(c => c.type === 'added').length,
        modified: changes.filter(c => c.type === 'modified').length,
        deleted: changes.filter(c => c.type === 'deleted').length,
      },
    };
  }

  /**
   * Restore an API to a specific version
   */
  async restore(apiName: string, snapshotId: string): Promise<API | null> {
    const snapshot = await this.getSnapshot(apiName, snapshotId);
    if (!snapshot) {
      return null;
    }

    return snapshot.snapshot as API;
  }

  /**
   * Delete all versions for an API
   */
  async deleteApiVersions(apiName: string): Promise<void> {
    const apiVersionsDir = this.apiVersionsPath(apiName);

    if (!existsSync(apiVersionsDir)) {
      return;
    }

    const files = await readdir(apiVersionsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await unlink(join(apiVersionsDir, file));
      }
    }
  }

  private generateSnapshotId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Create singleton instance
export const fileVersionStore = new FileVersionStore();