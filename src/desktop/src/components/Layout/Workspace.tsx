import { useEffect, useMemo, useState, useRef } from "react";
import { METHOD_STYLES } from "../../styles/method-colors";
import { ImportModal } from "../Common/ImportModal";
import { RequestBuilder } from "../Request/RequestBuilder";
import { CapturePanel } from "../Capture/CapturePanel";
import { useCollectionStore, useUIStore, useRequestStore, useSettingsStore } from "../../store";
import { useCollections } from "../../hooks/Collection/useCollections";
import { useSemanticSearch, useFavorites } from "../../hooks/Collection/useListMode";
import type { Endpoint, HttpMethod } from "../../types/api";
import type { CapturedRequest } from "../../types/capture";
import type { KeyValue } from "../../types/http";
import type { SavedRequest } from "../../store/collectionStore";
import { useNotificationStore } from "../../store/notificationStore";
import { matchCapturedRequestToEndpoint, extractPathWithBaseUrl } from "../../utils/capture";
import { useTranslation } from "../../utils/i18n";
import type { EndpointData } from "../../types";

type MenuType = { type: 'collection' | 'request'; id: string; colId?: string };

// Adapter to convert Endpoint (from collection) to EndpointData (for RequestBuilder)
// This handles the type mismatch between full Endpoint objects and the subset Expected by RequestBuilder
function adaptEndpointToEndpointData(ep: Endpoint): EndpointData {
  return {
    path: ep.path,
    method: ep.method as HttpMethod,
    summary: ep.summary,
    description: ep.description,
    parameters: ep.parameters?.map(p => ({
      name: p.name,
      location: p.location,
      in: p.location,
      required: p.required,
      description: p.description,
      schema: p.schema,
      example: p.example,
    })),
    requestBody: ep.requestBody,
    security: ep.security,
    responses: ep.responses,
    tags: ep.tags,
  };
}

export function Workspace() {
  const collections = useCollectionStore((s) => s.collections);
  const selectedEp = useCollectionStore((s) => s.selectedEp);
  const selectedCollectionId = useCollectionStore((s) => s.selectedCollectionId);
  const selectedRequestId = useCollectionStore((s) => s.selectedRequestId);
  const favOnly = useCollectionStore((s) => s.favOnly);
  const setSelectedApi = useCollectionStore((s) => s.setSelectedApi);
  const setSelectedEp = useCollectionStore((s) => s.setSelectedEp);
  const setSelectedCollectionId = useCollectionStore((s) => s.setSelectedCollectionId);
  const setSelectedRequestId = useCollectionStore((s) => s.setSelectedRequestId);
  const apis = useCollectionStore((s) => s.apis);
  const isLoadingApis = useCollectionStore((s) => s.isLoadingApis);
  const loadApis = useCollectionStore((s) => s.loadApis);

  // UI state from store
  const showImport = useUIStore((s) => s.showImportModal);
  const setShowImport = useUIStore((s) => s.setShowImportModal);
  const workspaceSearch = useUIStore((s) => s.listModeSearch);
  const setWorkspaceSearch = useUIStore((s) => s.setListModeSearch);

  // Expanded state for items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // Context menu state
  const [menu, setMenu] = useState<MenuType | null>(null);
  // Move submenu state
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  // Rename state
  const [renaming, setRenaming] = useState<{ type: 'collection' | 'request'; id: string; colId?: string; name: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { favorites } = useFavorites();
  const { results, search: doSearch } = useSemanticSearch(apis);
  const showToast = useNotificationStore((s) => s.showToast);

  // Language and i18n
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  // Collection management via hook
  const {
    exportPostmanFormat,
    exportOpenApiFormat,
    exportHarFormat,
    importCollection,
    duplicateCollection,
    loadFromCollection,
    renameCollection,
    deleteCollection,
    renameRequest,
    deleteFromCollection,
    moveRequestToCollection,
  } = useCollections();

  // Use ref to store latest doSearch to avoid stale closure in debounce
  const doSearchRef = useRef(doSearch);
  useEffect(() => { doSearchRef.current = doSearch; }, [doSearch]);

  useEffect(() => { const t = setTimeout(() => { if (workspaceSearch) doSearchRef.current(workspaceSearch); }, 150); return () => clearTimeout(t); }, [workspaceSearch]);

  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); document.querySelector<HTMLInputElement>(".search-input")?.focus(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
        setShowMoveMenu(false);
      }
    };
    if (menu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menu]);

  // Filter APIs - merge semantic search results with local endpoint search
  const filteredApis = useMemo(() => {
    if (!workspaceSearch) return apis;
    const q = workspaceSearch.toLowerCase();

    // Combine semantic search results with local endpoint search
    const matchedApiNames = new Set<string>();

    // Add semantic search results
    if (results.length > 0) {
      results.forEach(name => matchedApiNames.add(name));
    }

    // Also add APIs that have matching endpoints (local fallback)
    apis.forEach(api => {
      if (api.name.toLowerCase().includes(q)) {
        matchedApiNames.add(api.name);
      } else if (api.endpoints.some(e =>
        e.path.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q)
      )) {
        matchedApiNames.add(api.name);
      }
    });

    let r = apis.filter(a => matchedApiNames.has(a.name));
    if (favOnly) r = r.filter(a => favorites.has(a.name));
    return r;
  }, [apis, workspaceSearch, results, favOnly, favorites]);

  // Filter collections and their requests
  const filteredCollections = useMemo(() => {
    if (!workspaceSearch) return collections;
    const q = workspaceSearch.toLowerCase();
    return collections
      .map(col => ({
        ...col,
        requests: col.requests?.filter(r =>
          r.name.toLowerCase().includes(q) ||
          r.url.toLowerCase().includes(q)
        )
      }))
      .filter(col => col.name.toLowerCase().includes(q) || (col.requests?.length ?? 0) > 0);
  }, [collections, workspaceSearch]);

  // When searching, auto-expand matched items
  const autoExpandedItems = useMemo(() => {
    if (!workspaceSearch) return new Set<string>();
    const q = workspaceSearch.toLowerCase();
    const expanded = new Set<string>();

    // Auto-expand APIs that match by endpoint content
    filteredApis.forEach(api => {
      const matchesByEndpoint = api.endpoints.some(e =>
        e.path.toLowerCase().includes(q) ||
        e.summary?.toLowerCase().includes(q)
      );
      if (matchesByEndpoint) {
        expanded.add(api.name);
      }
    });

    // Auto-expand collections that have matching requests
    filteredCollections.forEach(col => {
      if ((col.requests?.length ?? 0) > 0) {
        expanded.add(col.id);
      }
    });

    return expanded;
  }, [workspaceSearch, filteredApis, filteredCollections]);

  // Filter endpoints within an API when searching
  const getFilteredEndpoints = (apiName: string) => {
    const apiData = apis.find(a => a.name === apiName);
    if (!apiData) return [];
    if (!workspaceSearch) return apiData.endpoints;
    const q = workspaceSearch.toLowerCase();
    return apiData.endpoints.filter(ep =>
      ep.path.toLowerCase().includes(q) ||
      ep.summary?.toLowerCase().includes(q)
    );
  };

  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedItems.has(id) || autoExpandedItems.has(id);

  const handleSelectEp = (apiName: string, ep: Endpoint) => {
    // Clear collection selection when selecting API endpoint
    setSelectedCollectionId(null);
    setSelectedRequestId(null);
    // Always load the original API endpoint
    setSelectedEp({ api: apiName, ep });
    useRequestStore.getState().openEndpointTab({
      path: ep.path,
      method: ep.method as HttpMethod,
      summary: ep.summary,
      description: ep.description,
      parameters: ep.parameters,
      requestBody: ep.requestBody ? {
        description: ep.requestBody.description,
        required: ep.requestBody.required,
        contentType: ep.requestBody.contentType,
        schema: ep.requestBody.schema,
        example: ep.requestBody.example,
      } : undefined,
      responses: ep.responses ? Object.fromEntries(
        Object.entries(ep.responses).map(([key, value]) => [key, {
          statusCode: value.statusCode,
          description: value.description,
          schema: value.schema,
          example: value.example,
        }])
      ) : undefined,
    }, undefined);
  };

  const handleSelectRequest = (req: SavedRequest, colId: string) => {
    setSelectedEp(null);
    setSelectedCollectionId(colId);
    setSelectedRequestId(req.id);
    loadFromCollection(req);
  };

  const handleSelectApi = (apiName: string) => {
    setSelectedApi(apiName);
    setSelectedCollectionId(null);
    setSelectedRequestId(null);
    toggleExpanded(apiName);
  };

  // Handle captured request selection - match to endpoint and create tab
  const handleCaptureSelect = (request: CapturedRequest) => {
    const { endpoint, path } = matchCapturedRequestToEndpoint(request);

    if (endpoint) {
      // Matched to an existing endpoint - prepend baseUrl to its path
      const cleanPath = endpoint.path.startsWith('/') ? endpoint.path.slice(1) : endpoint.path;
      useRequestStore.getState().openEndpointTab({
        ...endpoint,
        path: `{{baseUrl}}/${cleanPath}`,
      });
    } else {
      // No match - create new endpoint with baseUrl prefix
      const pathWithBaseUrl = extractPathWithBaseUrl(request);
      useRequestStore.getState().openEndpointTab({
        path: pathWithBaseUrl,
        method: request.method as HttpMethod,
        summary: `${request.method} ${path}`,
      }, undefined);
    }

    // Parse query params from captured URL
    let urlParamMap: Record<string, string> = {};
    try {
      if (request.url.includes('?')) {
        const urlObj = new URL(request.url);
        urlParamMap = Object.fromEntries(urlObj.searchParams.entries());
      }
    } catch {
      // Ignore malformed URLs in captured requests
    }

    // Get current params (from endpoint definition) and fill with captured values
    const storeState = useRequestStore.getState();
    const currentEndpointId = storeState.currentEndpointId;
    const endpointState = currentEndpointId ? storeState.endpointStates[currentEndpointId] : null;
    const currentParams: KeyValue[] = endpointState?.params || [];

    // Merge: fill captured values, clear values not in captured URL
    const mergedParams: KeyValue[] = currentParams.map((p: KeyValue) => {
      if (p.key) {
        if (urlParamMap[p.key] !== undefined) {
          return { ...p, value: urlParamMap[p.key] };
        } else {
          // Clear param value if not in captured URL
          return { ...p, value: '' };
        }
      }
      return p;
    });

    // Add any captured params that don't exist in endpoint definition
    const existingKeys = new Set(currentParams.map((p: KeyValue) => p.key));
    for (const [key, value] of Object.entries(urlParamMap)) {
      if (!existingKeys.has(key)) {
        mergedParams.push({ key, value, enabled: true });
      }
    }

    // Update request state with captured headers and merged params
    useRequestStore.getState().setRequestState({
      method: request.method,
      headers: Object.entries(request.headers).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      })),
      params: mergedParams,
    });
  };

  // Menu actions
  const handleMenuClick = (e: React.MouseEvent, item: MenuType) => {
    e.stopPropagation();
    setMenu(menu?.type === item.type && menu?.id === item.id ? null : item);
  };

  const handleRename = (type: 'collection' | 'request', id: string, colId: string | undefined, currentName: string) => {
    setMenu(null);
    setRenaming({ type, id, colId, name: currentName });
  };

  const handleRenameSubmit = () => {
    if (!renaming) return;
    const newName = renaming.name.trim();
    if (!newName) return;

    if (renaming.type === 'collection') {
      renameCollection(renaming.id, newName);
      showToast(t('toast.collectionRenamed'), 'success');
    } else if (renaming.type === 'request' && renaming.colId) {
      renameRequest(renaming.colId, renaming.id, newName);
      showToast(t('toast.requestRenamed'), 'success');
    }
    setRenaming(null);
  };

  const handleDelete = (type: 'collection' | 'request', id: string, colId?: string) => {
    setMenu(null);
    if (type === 'collection') {
      deleteCollection(id);
      showToast(t('toast.collectionDeleted'), 'success');
    } else if (colId) {
      deleteFromCollection(colId, id);
      showToast(t('toast.requestDeleted'), 'success');
    }
  };

  const handleExport = (type: 'collection' | 'request', id: string) => {
    setMenu(null);
    if (type === 'collection') {
      const col = collections.find(c => c.id === id);
      if (!col) return;
      const data = JSON.stringify(col, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${col.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(t('toast.collectionExported'), 'success');
    }
  };

  // Context menu component
  const ContextMenu = ({ type, id, colId }: MenuType) => {
    // For requests, exclude the collection that contains the request (colId)
    // For collections, exclude the collection itself (id)
    const excludeId = type === 'request' ? colId : id;
    const otherCollections = collections.filter(c => c.id !== excludeId);

    return (
      <div
        ref={menuRef}
        className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-xl z-50 w-36"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        {type === 'collection' && (
          <>
            <button
              onClick={() => {
                const col = collections.find(c => c.id === id);
                handleRename('collection', id, undefined, col?.name || '');
              }}
              className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('common.rename')}
            </button>
            <button
              onClick={() => handleExport('collection', id)}
              className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('common.export')}
            </button>
            <button
              onClick={() => handleDelete('collection', id)}
              className="w-full px-3 py-1.5 text-xs text-left"
              style={{ color: 'var(--danger)' }}
            >
              {t('common.delete')}
            </button>
          </>
        )}
        {type === 'request' && colId && (
          <>
            <button
              onClick={() => {
                const col = collections.find(c => c.id === colId);
                const req = col?.requests?.find(r => r.id === id);
                handleRename('request', id, colId, req?.name || '');
              }}
              className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('common.rename')}
            </button>
            {otherCollections.length > 0 && (
              <div className="relative">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoveMenu(!showMoveMenu);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-opacity-10 hover:bg-white"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t('common.moveTo')}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                {showMoveMenu && (
                  <div
                    className="absolute left-full top-0 ml-1 py-1 rounded-lg shadow-xl z-50 w-36"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    {otherCollections.map(c => (
                      <button
                        key={c.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu(null);
                          setShowMoveMenu(false);
                          const col = collections.find(cl => cl.id === colId);
                          const req = col?.requests?.find(r => r.id === id);
                          if (req) {
                            moveRequestToCollection(req, c.id);
                            showToast(`${t('toast.movedTo')} ${c.name}`, 'success');
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-opacity-10 hover:bg-white"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => handleDelete('request', id, colId)}
              className="w-full px-3 py-1.5 text-xs text-left"
              style={{ color: 'var(--danger)' }}
            >
              {t('common.delete')}
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* LEFT SIDEBAR */}
      <div className="w-64 flex flex-col relative" style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
        {/* Header */}
        <div className="h-10 px-2 flex items-center gap-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <input type="text" placeholder={t('common.search.placeholder')} value={workspaceSearch} onChange={e => setWorkspaceSearch(e.target.value)}
            className="search-input flex-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          <button onClick={() => setShowImport(true)} className="p-1 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }} title={t('common.import')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Capture Panel - captured requests are shown here */}
        <CapturePanel onSelectRequest={handleCaptureSelect} compact />

        {/* Unified List */}
        <div className="flex-1 overflow-y-auto">
          {/* APIs */}
          {!isLoadingApis && filteredApis.length === 0 && collections.length === 0 && (
            <div className="p-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.noContent')}，{t('common.importToStart')}</div>
          )}
          {isLoadingApis && <div className="p-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</div>}
          {filteredApis.map(api => (
            <div key={api.name}>
              <div
                onClick={() => handleSelectApi(api.name)}
                className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors"
                style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isExpanded(api.name) ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                <svg className={`w-3 h-3 transition-transform ${isExpanded(api.name) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                {favorites.has(api.name) && <svg className="w-3 h-3" fill="var(--warning)" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
                <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{api.name}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{workspaceSearch ? `${getFilteredEndpoints(api.name).length}/${api.endpoints.length}` : api.endpoints.length}</span>
              </div>
              {/* Endpoints children */}
              {isExpanded(api.name) && getFilteredEndpoints(api.name).map((ep, i) => {
                const ms = METHOD_STYLES[ep.method] || METHOD_STYLES.GET;
                const isSelected = selectedEp?.api === api.name && selectedEp?.ep.path === ep.path && selectedEp?.ep.method === ep.method;
                return (
                  <div
                    key={i}
                    onClick={() => handleSelectEp(api.name, ep)}
                    className="px-3 py-1.5 pl-8 cursor-pointer flex items-center gap-2 transition-colors"
                    style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isSelected ? 'var(--accent-muted)' : 'transparent' }}
                  >
                    <span className="w-10 text-[10px] font-mono font-medium rounded text-center py-0.5" style={{ backgroundColor: ms.bg, color: ms.color }}>{ep.method}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>{ep.path}</span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Collections */}
          {filteredCollections.map(col => (
            <div key={col.id} className="relative">
              <div
                onClick={() => toggleExpanded(col.id)}
                className="px-3 py-2 cursor-pointer flex items-center gap-2 transition-colors group"
                style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isExpanded(col.id) ? 'var(--bg-tertiary)' : 'transparent' }}
              >
                <svg className={`w-3 h-3 transition-transform ${isExpanded(col.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                {renaming?.type === 'collection' && renaming?.id === col.id ? (
                  <input
                    autoFocus
                    value={renaming.name}
                    onChange={e => setRenaming({ ...renaming, name: e.target.value })}
                    onBlur={handleRenameSubmit}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(null); }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 px-1 py-0.5 text-xs rounded"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
                  />
                ) : (
                  <>
                    <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{col.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{col.requests?.length ?? 0}</span>
                    <button
                      onClick={e => handleMenuClick(e, { type: 'collection', id: col.id })}
                      className="p-1 rounded"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                    {menu?.type === 'collection' && menu?.id === col.id && (
                      <ContextMenu type="collection" id={col.id} />
                    )}
                  </>
                )}
              </div>
              {/* Request children */}
              {isExpanded(col.id) && (col.requests ?? []).map((req) => {
                const ms = METHOD_STYLES[req.method as HttpMethod] || METHOD_STYLES.GET;
                const isSelected = selectedCollectionId === col.id && selectedRequestId === req.id;
                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req, col.id)}
                    className="px-3 py-1.5 pl-8 cursor-pointer flex items-center gap-2 transition-colors group relative"
                    style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isSelected ? 'var(--accent-muted)' : 'transparent' }}
                  >
                    <span className="w-10 text-[10px] font-mono font-medium rounded text-center py-0.5" style={{ backgroundColor: ms.bg, color: ms.color }}>{req.method}</span>
                    {renaming?.type === 'request' && renaming?.id === req.id ? (
                      <input
                        autoFocus
                        value={renaming.name}
                        onChange={e => setRenaming({ ...renaming, name: e.target.value })}
                        onBlur={handleRenameSubmit}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(null); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 px-1 py-0.5 text-xs rounded"
                        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent)' }}
                      />
                    ) : (
                      <>
                        <span className="text-xs flex-1 truncate" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>{req.name || req.url}</span>
                        <button
                          onClick={e => handleMenuClick(e, { type: 'request', id: req.id, colId: col.id })}
                          className="p-1 rounded"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                        </button>
                        {menu?.type === 'request' && menu?.id === req.id && (
                          <ContextMenu type="request" id={req.id} colId={col.id} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT - Request Builder */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEp ? (
          <RequestBuilder
            initialUrl={`{{baseUrl}}/${selectedEp.ep.path.replace(/^\//, "")}`}
            initialEndpoint={adaptEndpointToEndpointData(selectedEp.ep)}
          />
        ) : (
          <RequestBuilder />
        )}
      </div>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={loadApis}
        collections={collections}
        onExportPostman={exportPostmanFormat}
        onExportOpenApi={exportOpenApiFormat}
        onExportHar={exportHarFormat}
        onImportCollection={importCollection}
        onDuplicateCollection={duplicateCollection}
      />
    </div>
  );
}