import { z } from 'zod';
import type { API } from '../ir/index.js';

// Version tag schema
export const VersionTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  collectionId: z.string().optional(),
  apiName: z.string().optional(),
  createdAt: z.string(),
  createdBy: z.string().optional(),
  notes: z.string().optional(),
});
export type VersionTag = z.infer<typeof VersionTagSchema>;

// Change entry schema
export const ChangeEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: z.enum(['added', 'modified', 'deleted']),
  entityType: z.enum(['endpoint', 'parameter', 'response', 'api']),
  entityPath: z.string(),
  description: z.string(),
  before: z.any().optional(),
  after: z.any().optional(),
});
export type ChangeEntry = z.infer<typeof ChangeEntrySchema>;

// Version snapshot schema
export const VersionSnapshotSchema = z.object({
  id: z.string(),
  version: z.string(),
  apiName: z.string(),
  snapshot: z.any(), // API snapshot
  createdAt: z.string(),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
export type VersionSnapshot = z.infer<typeof VersionSnapshotSchema>;

// Diff result schema
export const DiffResultSchema = z.object({
  hasChanges: z.boolean(),
  changes: z.array(ChangeEntrySchema),
  summary: z.object({
    added: z.number(),
    modified: z.number(),
    deleted: z.number(),
  }),
});
export type DiffResult = z.infer<typeof DiffResultSchema>;

// Version control interface
export interface VersionControl {
  tagVersion(apiName: string, version: string, notes?: string): Promise<VersionTag>;
  getVersionHistory(apiName: string): Promise<VersionTag[]>;
  getSnapshot(versionId: string): Promise<VersionSnapshot | null>;
  diff(apiName: string, fromVersion: string, toVersion: string): Promise<DiffResult>;
  listSnapshots(apiName: string): Promise<VersionSnapshot[]>;
}

// Change detector utility
export function detectChanges(before: API, after: API): ChangeEntry[] {
  const changes: ChangeEntry[] = [];

  // Compare endpoints
  const beforePaths = new Map(
    before.endpoints.map(e => [`${e.method}:${e.path}`, e])
  );
  const afterPaths = new Map(
    after.endpoints.map(e => [`${e.method}:${e.path}`, e])
  );

  // Added endpoints
  for (const [path, endpoint] of afterPaths) {
    if (!beforePaths.has(path)) {
      changes.push({
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'added',
        entityType: 'endpoint',
        entityPath: path,
        description: `Added ${endpoint.method} ${endpoint.path}`,
        after: endpoint,
      });
    }
  }

  // Deleted or modified endpoints
  for (const [path, endpoint] of beforePaths) {
    if (!afterPaths.has(path)) {
      changes.push({
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'deleted',
        entityType: 'endpoint',
        entityPath: path,
        description: `Deleted ${endpoint.method} ${endpoint.path}`,
        before: endpoint,
      });
    }
  }

  // Modified endpoints
  for (const [path, beforeEndpoint] of beforePaths) {
    const afterEndpoint = afterPaths.get(path);
    if (afterEndpoint) {
      const endpointChanges = compareEndpoints(
        beforeEndpoint as { path: string; method: string; summary?: string; description?: string; parameters?: any[]; responses?: any; requestBody?: any },
        afterEndpoint as { path: string; method: string; summary?: string; description?: string; parameters?: any[]; responses?: any; requestBody?: any }
      );
      changes.push(...endpointChanges.map(c => ({
        ...c,
        id: generateId(),
        timestamp: new Date().toISOString(),
        entityPath: path,
      })));
    }
  }

  return changes;
}

function compareEndpoints(
  before: { path: string; method: string; summary?: string; description?: string; parameters?: any[]; responses?: any; requestBody?: any },
  after: { path: string; method: string; summary?: string; description?: string; parameters?: any[]; responses?: any; requestBody?: any }
): Omit<ChangeEntry, 'id' | 'timestamp' | 'entityPath'>[] {
  const changes: Omit<ChangeEntry, 'id' | 'timestamp' | 'entityPath'>[] = [];

  if (before.summary !== after.summary) {
    changes.push({
      type: 'modified',
      entityType: 'endpoint',
      description: `Summary changed from "${before.summary}" to "${after.summary}"`,
      before: before.summary,
      after: after.summary,
    });
  }

  if (before.description !== after.description) {
    changes.push({
      type: 'modified',
      entityType: 'endpoint',
      description: 'Description updated',
      before: before.description,
      after: after.description,
    });
  }

  return changes;
}

// In-memory version control implementation
export class InMemoryVersionControl implements VersionControl {
  private tags: Map<string, VersionTag> = new Map();
  private snapshots: Map<string, VersionSnapshot> = new Map();
  private apiSnapshots: Map<string, string[]> = new Map(); // apiName -> snapshotIds

  async tagVersion(apiName: string, version: string, notes?: string): Promise<VersionTag> {
    const tag: VersionTag = {
      id: generateId(),
      name: `${apiName}@${version}`,
      version,
      apiName,
      createdAt: new Date().toISOString(),
      notes,
    };
    this.tags.set(tag.id, tag);
    return tag;
  }

  async getVersionHistory(apiName: string): Promise<VersionTag[]> {
    const history: VersionTag[] = [];
    for (const tag of this.tags.values()) {
      if (tag.apiName === apiName) {
        history.push(tag);
      }
    }
    return [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getSnapshot(versionId: string): Promise<VersionSnapshot | null> {
    return this.snapshots.get(versionId) || null;
  }

  async diff(apiName: string, fromVersion: string, toVersion: string): Promise<DiffResult> {
    // Find snapshots for versions
    const fromSnapshot = await this.findSnapshotByVersion(apiName, fromVersion);
    const toSnapshot = await this.findSnapshotByVersion(apiName, toVersion);

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

  async listSnapshots(apiName: string): Promise<VersionSnapshot[]> {
    const ids = this.apiSnapshots.get(apiName) || [];
    const snapshots: VersionSnapshot[] = [];
    for (const id of ids) {
      const snapshot = await this.getSnapshot(id);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }
    return [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async createSnapshot(api: API, notes?: string, tags?: string[]): Promise<VersionSnapshot> {
    const snapshot: VersionSnapshot = {
      id: generateId(),
      version: api.version,
      apiName: api.name,
      snapshot: api,
      createdAt: new Date().toISOString(),
      tags,
      notes,
    };

    this.snapshots.set(snapshot.id, snapshot);

    // Track snapshot by API name - immutable update
    const existing = this.apiSnapshots.get(api.name) || [];
    this.apiSnapshots.set(api.name, [...existing, snapshot.id]);

    // Auto-create version tag
    await this.tagVersion(api.name, api.version, notes);

    return snapshot;
  }

  private async findSnapshotByVersion(apiName: string, version: string): Promise<VersionSnapshot | null> {
    const snapshots = await this.listSnapshots(apiName);
    return snapshots.find(s => s.version === version) || null;
  }
}

// Validate version tag
export function validateVersionTag(data: unknown): VersionTag {
  return VersionTagSchema.parse(data);
}

// Validate diff result
export function validateDiffResult(data: unknown): DiffResult {
  return DiffResultSchema.parse(data);
}

// Generate unique ID
function generateId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}