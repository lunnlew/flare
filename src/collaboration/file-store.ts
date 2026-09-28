/**
 * File-based Annotation Store
 * Persists annotations to filesystem for durability
 */

import { writeFile, readFile, unlink, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Annotation, AnnotationStore } from './annotations.js';

const FLARE_DIR = '.flare';
const ANNOTATIONS_DIR = join(FLARE_DIR, 'annotations');

export class FileAnnotationStore implements AnnotationStore {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private annotationsPath(): string {
    return join(this.basePath, ANNOTATIONS_DIR);
  }

  private endpointPath(endpointId: string): string {
    return join(this.annotationsPath(), endpointId);
  }

  private filePath(endpointId: string, annotationId: string): string {
    return join(this.endpointPath(endpointId), `${annotationId}.json`);
  }

  private async ensureDir(path: string): Promise<void> {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
  }

  /**
   * Atomic write - write to temp file then rename for durability
   */
  private async atomicWrite(filePath: string, data: Annotation): Promise<void> {
    const dir = join(filePath, '..');
    await this.ensureDir(dir);

    const tempPath = `${filePath}.tmp`;
    const content = JSON.stringify(data, null, 2);

    await writeFile(tempPath, content, 'utf-8');

    // Atomic rename
    try {
      await import('fs/promises').then(fs => fs.rename(tempPath, filePath));
    } catch (e) {
      // Fallback if rename fails (e.g., cross-device) - log and continue
      console.error('[FileStore] atomicWrite rename failed, using fallback:', e);
      await writeFile(filePath, content, 'utf-8');
      try {
        await unlink(tempPath);
      } catch (cleanupErr) {
        // Best effort cleanup - log but continue
        console.error('[FileStore] Temp file cleanup failed:', cleanupErr);
      }
    }
  }

  async save(annotation: Annotation): Promise<void> {
    const endpointId = annotation.endpointId || 'default';
    const filePath = this.filePath(endpointId, annotation.id);

    await this.atomicWrite(filePath, annotation);
  }

  async delete(id: string): Promise<void> {
    // Search through all endpoint directories for this annotation
    const annotationsDir = this.annotationsPath();

    if (!existsSync(annotationsDir)) {
      return;
    }

    const entries = await readdir(annotationsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const filePath = join(entry.path, `${id}.json`);
        if (existsSync(filePath)) {
          await unlink(filePath);
          return;
        }
      }
    }
  }

  async findByEndpoint(endpointId: string): Promise<Annotation[]> {
    const endpointDir = this.endpointPath(endpointId);

    if (!existsSync(endpointDir)) {
      return [];
    }

    const files = await readdir(endpointDir);
    const annotations: Annotation[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(join(endpointDir, file), 'utf-8');
        annotations.push(JSON.parse(content) as Annotation);
      }
    }

    return annotations;
  }

  async findById(id: string): Promise<Annotation | null> {
    const annotationsDir = this.annotationsPath();

    if (!existsSync(annotationsDir)) {
      return null;
    }

    const entries = await readdir(annotationsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const filePath = join(entry.path, `${id}.json`);
        if (existsSync(filePath)) {
          const content = await readFile(filePath, 'utf-8');
          return JSON.parse(content) as Annotation;
        }
      }
    }

    return null;
  }

  async list(): Promise<Annotation[]> {
    const annotationsDir = this.annotationsPath();

    if (!existsSync(annotationsDir)) {
      return [];
    }

    const entries = await readdir(annotationsDir, { withFileTypes: true });
    const allAnnotations: Annotation[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const endpointDir = join(annotationsDir, entry.name);
        const files = await readdir(endpointDir);

        for (const file of files) {
          if (file.endsWith('.json')) {
            const content = await readFile(join(endpointDir, file), 'utf-8');
            allAnnotations.push(JSON.parse(content) as Annotation);
          }
        }
      }
    }

    return allAnnotations;
  }
}

// Create singleton instance
export const fileAnnotationStore = new FileAnnotationStore();