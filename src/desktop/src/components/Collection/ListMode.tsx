import { useEffect, useMemo } from "react";
import { ImportModal } from "../Common/ImportModal";
import { METHOD_STYLES } from "../../styles/method-colors";
import { useSemanticSearch, useFavorites } from "../../hooks/Collection/useListMode";
import { useCollectionStore, useUIStore, useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";
import type { ListModeProps } from "../../types/api";

export function ListMode({ onSendToRequestBuilder }: ListModeProps) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const apis = useCollectionStore((s) => s.apis);
  const isLoadingApis = useCollectionStore((s) => s.isLoadingApis);
  const selectedApi = useCollectionStore((s) => s.selectedApi);
  const selectedEp = useCollectionStore((s) => s.selectedEp);
  const favOnly = useCollectionStore((s) => s.favOnly);
  const loadApis = useCollectionStore((s) => s.loadApis);
  const setSelectedApi = useCollectionStore((s) => s.setSelectedApi);
  const setSelectedEp = useCollectionStore((s) => s.setSelectedEp);
  const setFavOnly = useCollectionStore((s) => s.setFavOnly);

  // UI state from store
  const showImport = useUIStore((s) => s.showImportModal);
  const setShowImport = useUIStore((s) => s.setShowImportModal);
  const search = useUIStore((s) => s.listModeSearch);
  const setSearch = useUIStore((s) => s.setListModeSearch);
  const epFilter = useUIStore((s) => s.listModeEpFilter);
  const setEpFilter = useUIStore((s) => s.setListModeEpFilter);
  const methodFilter = useUIStore((s) => s.listModeMethodFilter);
  const setMethodFilter = useUIStore((s) => s.setListModeMethodFilter);

  // Hooks for search and favorites
  const { favorites } = useFavorites();
  const { results, search: doSearch } = useSemanticSearch(apis);

  useEffect(() => { const t = setTimeout(() => { if (search) doSearch(search); }, 150); return () => clearTimeout(t); }, [search, doSearch]);

  const filteredApis = useMemo(() => {
    const searchLower = search?.toLowerCase();
    return apis.filter(a => {
      // Semantic search match or text search
      const matchSearch = !search || results.length > 0
        ? results.includes(a.name)
        : !searchLower || a.name.toLowerCase().includes(searchLower) || a.endpoints.some(e =>
            e.path.toLowerCase().includes(searchLower) || e.summary?.toLowerCase().includes(searchLower)
          );
      // Favorites match
      const matchFav = !favOnly || favorites.has(a.name);
      return matchSearch && matchFav;
    });
  }, [apis, search, results, favOnly, favorites]);

  const selectedApiData = useMemo(() => {
    return apis.find(a => a.name === selectedApi) || null;
  }, [apis, selectedApi]);

  const filteredEps = useMemo(() => {
    if (!selectedApiData) return [];
    let r = selectedApiData.endpoints;
    if (methodFilter.length > 0) r = r.filter(e => methodFilter.includes(e.method));
    if (epFilter) { const q = epFilter.toLowerCase(); r = r.filter(e => e.path.toLowerCase().includes(q) || e.method.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q)); }
    return r;
  }, [selectedApiData, methodFilter, epFilter]);

  const stats = useMemo(() => { if (!selectedApiData) return { t: 0, m: {} as Record<string, number> };
    const m: Record<string, number> = {}; selectedApiData.endpoints.forEach(e => { m[e.method] = (m[e.method] || 0) + 1; }); return { t: selectedApiData.endpoints.length, m }; }, [selectedApiData]);

  // Keyboard shortcut
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); document.querySelector<HTMLInputElement>(".search-input")?.focus(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);

  return (
    <div className="h-full flex" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ===== LEFT SIDEBAR: API List ===== */}
      <div className="w-56 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
        {/* Header */}
        <div className="h-10 px-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <input type="text" placeholder={t('list.searchPlaceholder')} value={search} onChange={e => setSearch(e.target.value)}
            className="search-input flex-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
          <button onClick={() => setShowImport(true)} className="p-1 rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }} title={t('list.import')}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        {/* Filter */}
        <div className="px-3 py-1.5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button onClick={() => setFavOnly(!favOnly)} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: favOnly ? 'var(--accent-muted)' : 'var(--bg-tertiary)', color: favOnly ? 'var(--accent)' : 'var(--text-muted)' }}>★</button>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{filteredApis.length} APIs</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingApis && <div className="p-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('list.loading')}</div>}
          {!isLoadingApis && filteredApis.length === 0 && <div className="p-3 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('list.noApis')}</div>}
          {filteredApis.map(api => (
            <div key={api.name} onClick={() => { setSelectedApi(api.name); setSelectedEp(null); }}
              className="px-3 py-2 cursor-pointer transition-colors" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: selectedApi === api.name ? 'var(--accent-muted)' : 'transparent' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {favorites.has(api.name) && <span style={{ color: 'var(--warning)' }}>★</span>}
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{api.name}</span>
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{api.endpoints.length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MAIN CONTENT: Endpoints ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedApi && selectedApiData ? (
          <>
            {/* Toolbar */}
            <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedApiData.name}</h2>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{selectedApiData.baseUrl}</span>
              </div>
              <div className="flex-1" />
              <input type="text" placeholder={t('list.filterEndpoints')} value={epFilter} onChange={e => setEpFilter(e.target.value)}
                className="w-40 px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              <div className="flex gap-0.5">
                {["GET", "POST", "PUT", "DELETE", "PATCH"].map(m => (
                  <button key={m} onClick={() => {
                    const current = methodFilter;
                    setMethodFilter(current.includes(m) ? current.filter(x => x !== m) : [...current, m]);
                  }}
                    className="px-1.5 py-0.5 text-[10px] rounded font-mono"
                    style={methodFilter.includes(m) ? { backgroundColor: METHOD_STYLES[m]?.bg, color: METHOD_STYLES[m]?.color } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{m}</button>
                ))}
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{filteredEps.length} / {stats.t}</span>
            </div>

            {/* Endpoints */}
            <div className="flex-1 overflow-y-auto p-3">
              {filteredEps.map((ep, i) => {
                const ms = METHOD_STYLES[ep.method] || METHOD_STYLES.GET;
                const isSelected = selectedEp?.api === selectedApi && selectedEp?.ep.path === ep.path && selectedEp?.ep.method === ep.method;
                return (
                  <div key={i} onClick={() => setSelectedEp({ api: selectedApi, ep })}
                    className="p-3 rounded-md border mb-1.5 cursor-pointer transition-all"
                    style={{ backgroundColor: isSelected ? 'var(--accent-muted)' : 'var(--bg-secondary)', borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded" style={{ backgroundColor: ms.bg, color: ms.color }}>{ep.method}</span>
                      <span className="text-xs font-mono flex-1" style={{ color: 'var(--text-primary)' }}>{ep.path}</span>
                      <button onClick={(e) => { e.stopPropagation(); onSendToRequestBuilder({ api: selectedApi, path: ep.path, method: ep.method, baseUrl: selectedApiData.baseUrl }); }}
                        className="px-2 py-0.5 text-[10px] rounded" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('list.send')}</button>
                    </div>
                    {ep.summary && <p className="text-[11px] mt-1 ml-14" style={{ color: 'var(--text-muted)' }}>{ep.summary}</p>}
                    {isSelected && ep.description && <p className="text-[11px] mt-2" style={{ color: 'var(--text-secondary)' }}>{ep.description}</p>}
                  </div>
                );
              })}
              {filteredEps.length === 0 && <div className="text-center py-8 text-xs" style={{ color: 'var(--text-muted)' }}>{t('list.noMatchingEndpoints')}</div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('list.selectApiOnLeft')}</p>
            </div>
          </div>
        )}
      </div>

      <ImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImportComplete={loadApis} />
    </div>
  );
}
