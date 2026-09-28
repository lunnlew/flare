// Collaboration module entry point
// Provides team collaboration features for API collections

export {
  // Annotation system
  AnnotationSchema,
  Annotation,
  ExampleSchema,
  Example,
  AnnotationStore,
  AnnotationManager,
  InMemoryAnnotationStore,
  validateAnnotation,
} from './annotations.js';

export {
  // Annotation file store
  FileAnnotationStore,
  fileAnnotationStore,
} from './file-store.js';

export {
  // Collection management
  SharedCollectionSchema,
  SharedCollection,
  CollectionBundleSchema,
  CollectionBundle,
  CollectionManager,
  InMemoryCollectionManager,
  FileCollectionManager,
  validateCollection,
  validateBundle,
} from './collection.js';

export {
  // Version control
  VersionTagSchema,
  VersionTag,
  ChangeEntrySchema,
  ChangeEntry,
  VersionSnapshotSchema,
  VersionSnapshot,
  DiffResultSchema,
  DiffResult,
  VersionControl,
  InMemoryVersionControl,
  detectChanges,
  validateVersionTag,
  validateDiffResult,
} from './version.js';

export {
  // Version file store
  FileVersionStore,
  fileVersionStore,
} from './version-store.js';