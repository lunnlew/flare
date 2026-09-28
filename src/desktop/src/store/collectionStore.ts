/**
 * Collection Store - Collections, APIs, search state
 *
 * Key Patterns:
 * 1. Persisted - collections, selectedApi, selectedEp, searchQuery, favOnly
 * 2. NOT persisted - apis, isLoadingApis, importConfigs, isLoadingConfigs, syncingConfigId
 * 3. Actions colocated with state they manage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getApis, getApi, getImportConfigs, saveImportConfig, deleteImportConfig, syncImportConfig } from '../services/api';
import type { Endpoint, API, HttpMethod } from '../types/api';
import type { ImportConfig as ImportConfigType } from '../services/api';
import { toast } from './notificationStore';

// OpenAPI paths type: { [path]: { [method]: operation details } }
type OpenAPIPaths = Record<string, Record<string, {
  summary?: string;
  description?: string;
  parameters?: Endpoint['parameters'];
  requestBody?: Endpoint['requestBody'];
  security?: Endpoint['security'];
  responses?: Endpoint['responses'];
  tags?: string[];
}>>;

export interface Collection {
  id: string;
  name: string;
  requests?: SavedRequest[];
  endpoints?: Endpoint[];
  baseUrl?: string;
  description?: string;
  version?: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  params: { key: string; value: string; enabled: boolean }[];
  headers: { key: string; value: string; enabled: boolean }[];
  bodyType: string;
  reqBody?: string;
  urlencodedBody?: { key: string; value: string; enabled: boolean }[];
  formData?: { key: string; value: string; enabled: boolean }[];
  graphqlVariables?: string;
  authType: string;
  bearerToken?: string;
  bearerPrefix?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: string;
  oauth2AuthUrl?: string;
  oauth2AccessTokenUrl?: string;
  oauth2TokenType?: string;
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2AccessToken?: string;
  oauth2RefreshToken?: string;
  oauth2Scope?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  awsService?: string;
  sslVerify?: boolean;
  color?: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

interface CollectionState {
  collections: Collection[];
  selectedApi: string | null;
  selectedEp: { api: string; ep: Endpoint } | null;
  selectedCollectionId: string | null;
  selectedRequestId: string | null;
  searchQuery: string;
  favOnly: boolean;
  // API loading state
  apis: API[];
  isLoadingApis: boolean;
  // Import configs state
  importConfigs: ImportConfigType[];
  isLoadingConfigs: boolean;
  syncingConfigId: string | null;
}

interface CollectionActions {
  setCollections: (collections: Collection[]) => void;
  setSelectedApi: (api: string | null) => void;
  setSelectedEp: (ep: { api: string; ep: Endpoint } | null) => void;
  setSelectedCollectionId: (id: string | null) => void;
  setSelectedRequestId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFavOnly: (fav: boolean) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addRequestToCollection: (colId: string, request: SavedRequest) => void;
  removeRequestFromCollection: (colId: string, reqId: string) => void;
  updateRequestInCollection: (colId: string, reqId: string, updates: Partial<SavedRequest>) => void;
  // Request lookup actions
  findSavedRequest: (colId: string, reqId: string) => SavedRequest | undefined;
  findSavedRequestByMethodUrl: (method: string, url: string) => { collection: Collection; request: SavedRequest } | undefined;
  // API loading actions
  loadApis: () => Promise<void>;
  // Import config actions
  loadImportConfigs: () => Promise<void>;
  saveImportConfig: (config: Omit<ImportConfigType, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  deleteImportConfig: (id: string) => Promise<void>;
  syncImportConfig: (configId: string) => Promise<string[]>;
  setSyncingConfigId: (id: string | null) => void;
  exportCollection: (colId: string) => void;
}

type CollectionStore = CollectionState & CollectionActions;

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      collections: [],
      selectedApi: null,
      selectedEp: null,
      selectedCollectionId: null,
      selectedRequestId: null,
      searchQuery: "",
      favOnly: false,
      // API loading state (not persisted)
      apis: [],
      isLoadingApis: false,
      // Import configs state (not persisted)
      importConfigs: [],
      isLoadingConfigs: false,
      syncingConfigId: null,

      setCollections: (collections) => set({ collections }),
      setSelectedApi: (selectedApi) => set({ selectedApi }),
      setSelectedEp: (selectedEp) => set({ selectedEp }),
      setSelectedCollectionId: (selectedCollectionId) => set({ selectedCollectionId }),
      setSelectedRequestId: (selectedRequestId) => set({ selectedRequestId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFavOnly: (favOnly) => set({ favOnly }),

      addCollection: (collection) => set((state) => ({
        collections: [...state.collections, collection],
      })),

      updateCollection: (id, updates) => set((state) => ({
        collections: state.collections.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),

      deleteCollection: (id) => set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
      })),

      addRequestToCollection: (colId, request) => set((state) => ({
        collections: state.collections.map((c) =>
          c.id === colId
            ? { ...c, requests: [request, ...(c.requests || [])] }
            : c
        ),
      })),

      removeRequestFromCollection: (colId, reqId) => set((state) => ({
        collections: state.collections.map((c) =>
          c.id === colId
            ? { ...c, requests: (c.requests || []).filter((r) => r.id !== reqId) }
            : c
        ),
      })),

      updateRequestInCollection: (colId, reqId, updates) => set((state) => ({
        collections: state.collections.map((c) =>
          c.id === colId
            ? {
                ...c,
                requests: (c.requests || []).map((r) =>
                  r.id === reqId ? { ...r, ...updates } : r
                ),
              }
            : c
        ),
      })),

      findSavedRequest: (colId, reqId) => {
        const state = get();
        const collection = state.collections.find((c) => c.id === colId);
        return collection?.requests?.find((r) => r.id === reqId);
      },

      findSavedRequestByMethodUrl: (method, url) => {
        const state = get();
        for (const collection of state.collections) {
          const savedRequest = collection.requests?.find(
            (r) => r.method === method && r.url === url
          );
          if (savedRequest) {
            return { collection, request: savedRequest };
          }
        }
        return undefined;
      },

      loadApis: async () => {
        set({ isLoadingApis: true });
        try {
          const infos = await getApis();

          // Load all APIs in parallel for better performance
          const results = await Promise.all(
            infos.map(async (info): Promise<{ info: typeof info; api: API | null }> => {
              try {
                const d = await getApi(info.name);
                const s = d.spec;

                // Handle two formats:
                // 1. Internal format with s.endpoints array
                // 2. OpenAPI format with s.paths object
                let endpoints: Endpoint[] = [];

                if (s.endpoints && Array.isArray(s.endpoints)) {
                  // Internal format
                  endpoints = s.endpoints.map((e, idx) => ({
                    id: e.id || `${info.name}-${idx}-${e.path}-${e.method}`.replace(/\//g, '_'),
                    path: e.path,
                    method: e.method as HttpMethod,
                    summary: e.summary,
                    description: e.description,
                    parameters: e.parameters as Endpoint['parameters'],
                    requestBody: e.requestBody as Endpoint['requestBody'],
                    security: e.security as Endpoint['security'],
                    responses: e.responses as Endpoint['responses'],
                    tags: e.tags || [],
                  }));
                } else if (s.paths && typeof s.paths === 'object') {
                  // OpenAPI format
                const paths = s.paths as OpenAPIPaths;
                let epIdx = 0;
                for (const [path, methods] of Object.entries(paths)) {
                  for (const [method, details] of Object.entries(methods)) {
                    if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)) {
                      endpoints.push({
                        id: `${info.name}-${epIdx++}-${path}-${method}`.replace(/\//g, '_'),
                        path,
                        method: method.toUpperCase() as HttpMethod,
                        summary: details.summary || '',
                        description: details.description || '',
                        parameters: (details.parameters || []) as Endpoint['parameters'],
                        requestBody: details.requestBody as Endpoint['requestBody'],
                        security: (details.security || []) as Endpoint['security'],
                        responses: (details.responses || {}) as Endpoint['responses'],
                        tags: details.tags || [],
                      });
                    }
                  }
                }
              }

                return {
                  info,
                  api: {
                    name: s.name || info.name,
                    version: s.version || "1.0.0",
                    baseUrl: s.baseUrl || "",
                    description: s.description,
                    tags: s.tags || [],
                    endpoints,
                  },
                };
              } catch (e) {
                toast.error(`加载 API 失败: ${info.name}`);
                return { info, api: null };
              }
            })
          );

          // Filter out failed loads and build loaded array
          const loaded: API[] = results
            .filter((r): r is { info: typeof infos[0]; api: API } => r.api !== null)
            .map((r) => r.api);

          set({ apis: loaded });

          // Keep user's collections (non-api-*), skip API collections entirely
          const existingCollections = get().collections;
          const userCollections = existingCollections.filter(c => !c.id.startsWith("api-"));
          set({ collections: userCollections });
        } catch (e) {
          toast.error('加载 API 列表失败');
        } finally {
          set({ isLoadingApis: false });
        }
      },

      loadImportConfigs: async () => {
        set({ isLoadingConfigs: true });
        try {
          const configs = await getImportConfigs();
          set({ importConfigs: configs });
        } catch (e) {
          toast.error('加载导入配置失败');
        } finally {
          set({ isLoadingConfigs: false });
        }
      },

      saveImportConfig: async (config) => {
        try {
          await saveImportConfig(config);
          await get().loadImportConfigs();
        } catch (e) {
          toast.error('保存导入配置失败');
          throw e;
        }
      },

      deleteImportConfig: async (id) => {
        try {
          await deleteImportConfig(id);
          set((state) => ({
            importConfigs: state.importConfigs.filter((c) => c.id !== id),
          }));
        } catch (e) {
          toast.error('删除导入配置失败');
          throw e;
        }
      },

      syncImportConfig: async (configId) => {
        set({ syncingConfigId: configId });
        try {
          const result = await syncImportConfig(configId);
          return result;
        } finally {
          set({ syncingConfigId: null });
        }
      },

      setSyncingConfigId: (id) => set({ syncingConfigId: id }),

      exportCollection: (colId) => {
        const collection = get().collections.find((c) => c.id === colId);
        if (!collection) return;

        const exportData = {
          version: '1.0',
          type: 'flare-collection',
          exportedAt: new Date().toISOString(),
          collection: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            baseUrl: collection.baseUrl,
            requests: collection.requests || [],
          },
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${collection.name.replace(/[^a-zA-Z0-9一-龥]/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    }),
    {
      name: 'flare-collection-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        collections: state.collections,
        apis: state.apis,
        selectedApi: state.selectedApi,
        selectedEp: state.selectedEp,
        selectedCollectionId: state.selectedCollectionId,
        selectedRequestId: state.selectedRequestId,
        searchQuery: state.searchQuery,
        favOnly: state.favOnly,
      }),
    }
  )
);