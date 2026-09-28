import { vi, describe, test, expect, beforeEach } from 'vitest';
import { existsSync } from 'fs';

// Mock fs/promises before importing
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  rename: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
  },
}));

import { FileAnnotationStore } from '../file-store.js';
import type { Annotation } from '../annotations.js';

describe('collaboration - FileAnnotationStore', () => {
  let store: FileAnnotationStore;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('[主体] 保存注解', async () => {
    const store = new FileAnnotationStore('/tmp/test');
    const fsPromises = await import('fs/promises');
    const annotation: Annotation = {
      id: 'ann_test_1',
      type: 'comment',
      content: 'Test annotation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fsPromises.writeFile.mockResolvedValue(undefined);
    fsPromises.mkdir.mockResolvedValue(undefined);
    (existsSync as any).mockReturnValue(false);

    await store.save(annotation);

    expect(fsPromises.writeFile).toHaveBeenCalled();
  });

  test('[边界] findById 对不存在的注解返回 null', async () => {
    const store = new FileAnnotationStore('/tmp/test');

    (existsSync as any).mockReturnValue(false);

    const found = await store.findById('non_existent');

    expect(found).toBeNull();
  });

  test('[边界] findByEndpoint 对不存在的 endpoint 返回空数组', async () => {
    const store = new FileAnnotationStore('/tmp/test');

    (existsSync as any).mockReturnValue(false);

    const found = await store.findByEndpoint('non_existent_endpoint');

    expect(found).toHaveLength(0);
  });

  test('[边界] list 对不存在的目录返回空数组', async () => {
    const store = new FileAnnotationStore('/tmp/test');

    (existsSync as any).mockReturnValue(false);

    const all = await store.list();

    expect(all).toHaveLength(0);
  });

  test('[边界] delete 对不存在的注解不报错', async () => {
    const store = new FileAnnotationStore('/tmp/test');

    (existsSync as any).mockReturnValue(false);

    // Should not throw
    await store.delete('non_existent_id');
  });
});