import { useCallback } from "react";
import { useCollectionStore, useRequestStore, getDefaultRequestState } from "../../store";
import { toast } from "../../store/notificationStore";
import type { Collection, SavedRequest } from "../../store/collectionStore";
import type {
  PostmanItem,
  OpenAPIOperation,
  HAREntry,
  HARRequest,
  HARQueryParam,
  InsomniaResource,
  InsomniaParam,
  APIParkCollection,
  APIParkAPI,
  ApifoxItem,
  ApifoxHeader,
  KeyValue,
} from "./types";

/**
 * useCollections hook - manages collection operations
 * Uses the new split store architecture
 */
export function useCollections() {
  const collections = useCollectionStore((s) => s.collections);
  const setCollections = useCollectionStore((s) => s.setCollections);
  const setSelectedApi = useCollectionStore((s) => s.setSelectedApi);
  const setSelectedEp = useCollectionStore((s) => s.setSelectedEp);
  const setFullRequestState = useRequestStore((s) => s.setFullRequestState);

  const updateCollections = useCallback((updater: (prev: Collection[]) => Collection[]) => {
    const current = useCollectionStore.getState().collections;
    setCollections(updater(current));
  }, [setCollections]);

  const deleteCollection = useCallback((id: string) => {
    useCollectionStore.getState().deleteCollection(id);
  }, []);

  const duplicateCollection = useCallback((id: string) => {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name: `${col.name} (copy)`,
      requests: (col.requests || []).map((r: SavedRequest) => ({ ...r, id: `req-${Date.now()}-${Math.random()}` }))
    };
    updateCollections(prev => [...prev, newCol]);
  }, [collections, updateCollections]);

  const loadFromCollection = useCallback((req: Partial<SavedRequest>) => {
    setSelectedApi(null);
    setSelectedEp(null);
    setFullRequestState({
      ...getDefaultRequestState(),
      method: req.method || 'GET',
      url: req.url || '',
      params: req.params || [{ key: "", value: "", enabled: true }],
      headers: req.headers || [{ key: "Content-Type", value: "application/json", enabled: true }],
      bodyType: req.bodyType || 'raw',
      reqBody: req.reqBody || '',
      urlencodedBody: req.urlencodedBody || [{ key: "", value: "", enabled: true }],
      formData: req.formData || [{ key: "", value: "", enabled: true }],
      graphqlVariables: req.graphqlVariables || '',
      authType: req.authType || 'none',
      bearerToken: req.bearerToken || '',
      bearerPrefix: req.bearerPrefix || 'Bearer',
      basicUsername: req.basicUsername || '',
      basicPassword: req.basicPassword || '',
      apiKeyName: req.apiKeyName || 'X-API-Key',
      apiKeyValue: req.apiKeyValue || '',
      apiKeyLocation: req.apiKeyLocation || 'header',
    });
  }, [setSelectedApi, setSelectedEp, setFullRequestState]);

  const renameRequest = useCallback((colId: string, reqId: string, newName: string) => {
    updateCollections(prev => prev.map((col: Collection) => {
      if (col.id !== colId) return col;
      return {
        ...col,
        requests: (col.requests || []).map((r: SavedRequest) => r.id === reqId ? { ...r, name: newName } : r)
      };
    }));
  }, [updateCollections]);

  const duplicateRequest = useCallback((colId: string, reqId: string) => {
    updateCollections(prev => prev.map((col: Collection) => {
      if (col.id !== colId) return col;
      const req = (col.requests || []).find((r: SavedRequest) => r.id === reqId);
      if (!req) return col;
      return {
        ...col,
        requests: [...(col.requests || []), { ...req, id: `req-${Date.now()}`, name: `${req.name} (copy)`, createdAt: Date.now() }]
      };
    }));
  }, [updateCollections]);

  const deleteFromCollection = useCallback((colId: string, reqId: string) => {
    useCollectionStore.getState().removeRequestFromCollection(colId, reqId);
  }, []);

  const updateRequestColor = useCallback((colId: string, reqId: string, color: string | null) => {
    updateCollections(prev => prev.map((col: Collection) => {
      if (col.id !== colId) return col;
      return {
        ...col,
        requests: (col.requests || []).map((r: SavedRequest) =>
          r.id === reqId ? { ...r, color: color || undefined } : r
        )
      };
    }));
  }, [updateCollections]);

  const updateRequestTags = useCallback((colId: string, reqId: string, tags: string[]) => {
    updateCollections(prev => prev.map((col: Collection) => {
      if (col.id !== colId) return col;
      return {
        ...col,
        requests: (col.requests || []).map((r: SavedRequest) =>
          r.id === reqId ? { ...r, tags } : r
        )
      };
    }));
  }, [updateCollections]);

  const moveRequestToCollection = useCallback((req: SavedRequest, targetColId: string) => {
    // Find the request in source collection
    let requestToMove: SavedRequest | undefined;
    const sourceColId = collections.find(c =>
      c.requests?.some((r: SavedRequest) => r.id === req.id)
    )?.id;

    if (!sourceColId) return;

    // Remove from source collection
    updateCollections(prev => prev.map((col: Collection) => {
      if (col.id === sourceColId) {
        requestToMove = col.requests?.find((r: SavedRequest) => r.id === req.id);
        return {
          ...col,
          requests: (col.requests || []).filter((r: SavedRequest) => r.id !== req.id)
        };
      }
      return col;
    }));

    // Add to target collection
    if (requestToMove) {
      updateCollections(prev => prev.map((col: Collection) => {
        if (col.id === targetColId) {
          return {
            ...col,
            requests: [requestToMove!, ...(col.requests || [])]
          };
        }
        return col;
      }));
    }
  }, [collections, updateCollections]);

  const renameCollection = useCallback((colId: string, newName: string) => {
    updateCollections(prev => prev.map((col: Collection) =>
      col.id === colId ? { ...col, name: newName } : col
    ));
  }, [updateCollections]);

  // Export collection to Postman v2.1 format
  const exportPostmanFormat = useCallback((collectionId?: string) => {
    if (collections.length === 0) return JSON.stringify({ error: "No collections" }, null, 2);
    const col = collectionId ? collections.find(c => c.id === collectionId) || collections[0] : collections[0];
    const postmanCollection = {
      info: {
        name: col.name,
        description: "",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      item: (col.requests || []).map((req: SavedRequest) => ({
        name: req.name,
        request: {
          method: req.method,
          header: req.headers?.filter((h: KeyValue) => h.enabled && h.key).map((h: KeyValue) => ({ key: h.key, value: h.value })) || [],
          url: {
            raw: req.url,
            host: [],
            path: req.url.replace(/^https?:\/\/[^\/]+/, '').split('/').filter(Boolean)
          },
          body: req.reqBody ? {
            mode: req.bodyType === 'graphql' ? 'graphql' : 'raw',
            raw: req.reqBody,
            graphql: req.bodyType === 'graphql' ? { query: req.reqBody, variables: req.graphqlVariables || "{}" } : undefined
          } : undefined
        }
      }))
    };
    return JSON.stringify(postmanCollection, null, 2);
  }, [collections]);

  // Export collection to OpenAPI 3.1 format
  const exportOpenApiFormat = useCallback((collectionId?: string) => {
    if (collections.length === 0) return JSON.stringify({ error: "No collections" }, null, 2);
    const col = collectionId ? collections.find(c => c.id === collectionId) || collections[0] : collections[0];
    const openApiDoc = {
      openapi: "3.1.0",
      info: { title: col.name, version: "1.0.0", description: "" },
      paths: (col.requests || []).reduce<Record<string, Record<string, OpenAPIOperation>>>((acc, req) => {
        const urlParts = req.url.split('/');
        const path = '/' + urlParts.slice(3).join('/');
        const method = (req.method || 'GET').toLowerCase();
        if (!acc[path]) acc[path] = {};
        acc[path][method] = {
          summary: req.name,
          tags: [],
          requestBody: req.reqBody ? {
            content: {
              "application/json": { schema: { type: "object" } }
            }
          } : undefined,
          responses: { "200": { description: "Successful response" } }
        };
        return acc;
      }, {}),
      components: { schemas: {} }
    };
    return JSON.stringify(openApiDoc, null, 2);
  }, [collections]);

  // Export collection to HAR (HTTP Archive) format
  const exportHarFormat = useCallback((collectionId?: string) => {
    if (collections.length === 0) return JSON.stringify({ error: "No collections" }, null, 2);
    const col = collectionId ? collections.find(c => c.id === collectionId) || collections[0] : collections[0];
    const harDoc = {
      log: {
        version: "1.2",
        creator: {
          name: "Flare",
          version: "1.0.0"
        },
        entries: (col.requests || []).map((req: SavedRequest) => {
          let postData = undefined;
          if (req.bodyType === 'raw' && req.reqBody) {
            postData = {
              mimeType: "application/json",
              text: req.reqBody
            };
          } else if (req.bodyType === 'urlencoded' && req.urlencodedBody?.length) {
            postData = {
              mimeType: "application/x-www-form-urlencoded",
              params: req.urlencodedBody.filter((p: KeyValue) => p.enabled && p.key).map((p: KeyValue) => ({
                name: p.key,
                value: p.value
              }))
            };
          } else if (req.bodyType === 'form-data' && req.formData?.length) {
            postData = {
              mimeType: "multipart/form-data",
              params: req.formData.filter((p: KeyValue) => p.enabled && p.key).map((p: KeyValue) => ({
                name: p.key,
                value: p.value
              }))
            };
          }

          return {
            startedDateTime: new Date(req.createdAt || Date.now()).toISOString(),
            request: {
              method: req.method || 'GET',
              url: req.url || '',
              headers: (req.headers || []).filter((h: KeyValue) => h.enabled && h.key).map((h: KeyValue) => ({
                name: h.key,
                value: h.value
              })),
              queryString: (req.params || []).filter((p: KeyValue) => p.enabled && p.key).map((p: KeyValue) => ({
                name: p.key,
                value: p.value
              })),
              postData
            },
            response: {
              status: 0,
              statusText: "",
              headers: [],
              content: { size: 0, mimeType: "" }
            }
          };
        })
      }
    };
    return JSON.stringify(harDoc, null, 2);
  }, [collections]);

  // Import collection from JSON (Postman, OpenAPI, or HAR)
  const importCollection = useCallback((jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      let newRequests: SavedRequest[] = [];

      // Detect format and parse
      if (data.info?.schema?.includes('postman')) {
        // Postman v2 format
        newRequests = (data.item || []).map((item: PostmanItem, idx: number) => {
          // Validate item has request before accessing
          if (!item.request) {
            // Skip items without requests - this is normal for Postman folders
            return null;
          }
          const req = item.request;
          const headers: KeyValue[] = (req.header || []).map((h) => ({
            key: h.key,
            value: h.value,
            enabled: !h.disabled
          }));
          return {
            id: `req-${Date.now()}-${idx}`,
            name: item.name || `Request ${idx + 1}`,
            method: req.method || 'GET',
            url: typeof req.url === 'string' ? req.url : (req.url?.raw || ''),
            params: [],
            headers,
            bodyType: req.body?.mode === 'graphql' ? 'graphql' : (req.body?.mode === 'urlencoded' ? 'urlencoded' : 'raw'),
            reqBody: req.body?.raw || '',
            urlencodedBody: (req.body?.urlencoded || []).map((p) => ({
              key: p.key,
              value: p.value,
              enabled: !p.disabled
            })),
            formData: [],
            graphqlVariables: req.body?.graphql?.variables || '',
            authType: 'none',
            createdAt: Date.now()
          } as SavedRequest;
        }).filter((r: SavedRequest | null): r is SavedRequest => r !== null);
      } else if (data.openapi || data.swagger) {
        // OpenAPI format
        const paths = data.paths || {};
        let idx = 0;
        for (const [path, methods] of Object.entries(paths)) {
          for (const [method, details] of Object.entries(methods as Record<string, OpenAPIOperation>)) {
            if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method)) {
              const op = details as OpenAPIOperation;
              newRequests.push({
                id: `req-${Date.now()}-${idx++}`,
                name: op.summary || `${method.toUpperCase()} ${path}`,
                method: method.toUpperCase(),
                url: `{{baseUrl}}${path}`,
                params: [],
                headers: [],
                bodyType: 'raw',
                reqBody: op.requestBody?.content?.['application/json'] ? JSON.stringify(op.requestBody.content['application/json'].schema || {}, null, 2) : '',
                urlencodedBody: [],
                formData: [],
                graphqlVariables: '',
                authType: 'none',
                createdAt: Date.now(),
                description: op.description || '',
                parameters: op.parameters || [],
                requestBody: op.requestBody || null,
              } as SavedRequest);
            }
          }
        }
      } else if (data.log?.entries && Array.isArray(data.log.entries)) {
        // HAR (HTTP Archive) format
        newRequests = data.log.entries.map((entry: HAREntry, idx: number) => {
          const req = entry.request || {} as HARRequest;
          const urlObj = new URL(req.url ?? 'http://localhost');
          const queryParams: KeyValue[] = (req.queryString || []).map((p: HARQueryParam) => ({
            key: p.name,
            value: p.value,
            enabled: true
          }));

          let bodyType: 'raw' | 'graphql' | 'urlencoded' | 'form-data' = 'raw';
          let reqBody = '';
          let urlencodedBody: KeyValue[] = [];
          let formData: KeyValue[] = [];
          let graphqlVariables = '';

          if (req.postData) {
            const contentType = req.postData.mimeType || '';
            if (contentType.includes('application/json')) {
              bodyType = 'raw';
              reqBody = req.postData.text || '';
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
              bodyType = 'urlencoded';
              urlencodedBody = (req.postData.params || []).map((p: HARQueryParam) => ({
                key: p.name,
                value: p.value,
                enabled: true
              }));
            } else if (contentType.includes('multipart/form-data')) {
              bodyType = 'form-data';
              formData = (req.postData.params || []).map((p: HARQueryParam) => ({
                key: p.name,
                value: p.value,
                enabled: true
              }));
            } else {
              bodyType = 'raw';
              reqBody = req.postData.text || '';
            }
          }

          const headers: KeyValue[] = (req.headers || []).map((h: HARQueryParam) => ({
            key: h.name,
            value: h.value,
            enabled: true
          }));

          return {
            id: `req-${Date.now()}-${idx}`,
            name: `${req.method} ${urlObj.pathname}` || `Request ${idx + 1}`,
            method: req.method || 'GET',
            url: req.url || '',
            params: queryParams,
            headers,
            bodyType,
            reqBody,
            urlencodedBody,
            formData,
            graphqlVariables,
            authType: 'none',
            createdAt: Date.now()
          } as SavedRequest;
        });
      } else if (data._type === 'export' && data.format === 'insomnia') {
        // Insomnia v4/v5 format
        const resources = data.resources || [];
        const requests = resources.filter((r: InsomniaResource) => r._type === 'request');
        newRequests = requests.map((req: InsomniaResource, idx: number) => {
          let bodyType: 'raw' | 'graphql' | 'urlencoded' | 'form-data' = 'raw';
          let reqBody = req.body?.text || '';
          let urlencodedBody: KeyValue[] = [];
          let formData: KeyValue[] = [];
          let graphqlVariables = '';

          if (req.body) {
            if (req.body.mode === 'json') {
              bodyType = 'raw';
              reqBody = typeof req.body.text === 'string' ? req.body.text : JSON.stringify(req.body.text, null, 2);
            } else if (req.body.mode === 'form-urlencoded') {
              bodyType = 'urlencoded';
              urlencodedBody = (req.body.params || []).map((p: InsomniaParam) => ({
                key: p.name,
                value: p.value,
                enabled: !p.disabled
              }));
            } else if (req.body.mode === 'multipart-form') {
              bodyType = 'form-data';
              formData = (req.body.params || []).map((p: InsomniaParam) => ({
                key: p.name,
                value: p.value,
                enabled: !p.disabled
              }));
            } else if (req.body.mode === 'graphql') {
              bodyType = 'graphql';
              graphqlVariables = req.body.variables || '';
              reqBody = req.body.query || '';
            }
          }

          const headers: KeyValue[] = (req.headers || []).map((h: InsomniaParam) => ({
            key: h.name,
            value: h.value,
            enabled: !h.disabled
          }));

          const params: KeyValue[] = (req.parameters || []).map((p: InsomniaParam) => ({
            key: p.name,
            value: p.value,
            enabled: !p.disabled
          }));

          return {
            id: `req-${Date.now()}-${idx}`,
            name: req.name || `Request ${idx + 1}`,
            method: req.method || 'GET',
            url: req.url || '',
            params,
            headers,
            bodyType,
            reqBody,
            urlencodedBody,
            formData,
            graphqlVariables,
            authType: 'none',
            createdAt: Date.now()
          } as SavedRequest;
        });
      } else if (data._type === 'export' && data.format === 'apipark') {
        // APIPark format
        const apiparkCollections = data.collections || [];
        apiparkCollections.forEach((col: APIParkCollection) => {
          const colRequests = (col.apis || []).map((api: APIParkAPI, idx: number) => {
            return {
              id: `req-${Date.now()}-${idx}`,
              name: api.name || `Request ${idx + 1}`,
              method: api.method || 'GET',
              url: api.url || '',
              params: [],
              headers: [],
              bodyType: 'raw' as const,
              reqBody: api.body || '',
              urlencodedBody: [],
              formData: [],
              graphqlVariables: '',
              authType: 'none',
              createdAt: Date.now()
            } as SavedRequest;
          });
          newRequests.push(...colRequests);
        });
      } else if (data._type === 'export' && data.format === 'apifox') {
        // Apifox format
        const apifoxCollections = data.data || [];
        apifoxCollections.forEach((col: { item?: ApifoxItem[] }) => {
          const colRequests = (col.item || []).map((item: ApifoxItem, idx: number) => {
            if (!item.request) {
              return null;
            }
            const api = item.request;
            return {
              id: `req-${Date.now()}-${idx}`,
              name: item.name || `Request ${idx + 1}`,
              method: api.method || 'GET',
              url: typeof api.url === 'string' ? api.url : ((api.url as { rawUrl?: string })?.rawUrl || ''),
              params: [],
              headers: (api.header || []).map((h: ApifoxHeader) => ({
                key: h.key,
                value: h.value,
                enabled: true
              })),
              bodyType: api.body?.mode === 'json' ? 'raw' : (api.body?.mode === 'formdata' ? 'form-data' : 'raw'),
              reqBody: api.body?.raw || '',
              urlencodedBody: [],
              formData: [],
              graphqlVariables: '',
              authType: 'none',
              createdAt: Date.now()
            } as SavedRequest;
          });
          newRequests.push(...colRequests.filter((r): r is SavedRequest => r !== null));
        });
      } else {
        return false;
      }

      // Determine collection name based on format
      let collectionName = 'Imported Collection';
      if (data._type === 'export') {
        if (data.format === 'insomnia') {
          collectionName = data.name || data.title || 'Insomnia Collection';
        } else if (data.format === 'apipark') {
          collectionName = data.name || data.title || 'APIPark Collection';
        } else if (data.format === 'apifox') {
          collectionName = data.name || data.title || 'Apifox Collection';
        }
      } else {
        collectionName = data.info?.name || data.title || 'Imported Collection';
      }

      const newCollection = {
        id: `col-${Date.now()}`,
        name: collectionName,
        requests: newRequests
      };
      updateCollections(prev => [...prev, newCollection]);
      return true;
    } catch (err) {
      toast.error('导入集合失败');
      return false;
    }
  }, [updateCollections]);

  return {
    collections,
    updateCollections,
    deleteCollection,
    duplicateCollection,
    loadFromCollection,
    renameRequest,
    duplicateRequest,
    deleteFromCollection,
    updateRequestColor,
    updateRequestTags,
    moveRequestToCollection,
    renameCollection,
    exportPostmanFormat,
    exportOpenApiFormat,
    exportHarFormat,
    importCollection,
    exportCollection: useCollectionStore.getState().exportCollection,
  };
}