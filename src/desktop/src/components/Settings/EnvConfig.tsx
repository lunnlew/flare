import { useState } from "react";
import { EnvVariablesList, AddVariableModal } from "../Common/EnvVariablesList";
import { useEnvironmentStore } from "../../store";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

export function EnvConfig() {
  const environments = useEnvironmentStore((s) => s.environments);
  const addGroup = useEnvironmentStore((s) => s.addGroup);
  const deleteGroup = useEnvironmentStore((s) => s.deleteGroup);
  const renameGroup = useEnvironmentStore((s) => s.renameGroup);
  const updateVariable = useEnvironmentStore((s) => s.updateVariable);
  const deleteVariable = useEnvironmentStore((s) => s.deleteVariable);
  const createEnvironment = useEnvironmentStore((s) => s.createEnvironment);
  const deleteEnvironment = useEnvironmentStore((s) => s.deleteEnvironment);
  const duplicateEnvironment = useEnvironmentStore((s) => s.duplicateEnvironment);
  const moveEnvironment = useEnvironmentStore((s) => s.moveEnvironment);
  const exportEnvConfig = useEnvironmentStore((s) => s.exportEnvConfig);
  const importEnvConfig = useEnvironmentStore((s) => s.importEnvConfig);
  const isLoading = useEnvironmentStore((s) => s.isLoading);

  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);

  const [showAddVarModal, setShowAddVarModal] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<{ oldName: string; newName: string } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  // editingEnv from store - independent from selectedEnv (active environment)
  const editingEnv = useEnvironmentStore((s) => s.editingEnv);
  const setEditingEnv = useEnvironmentStore((s) => s.setEditingEnv);

  const currentEnv = environments.find(e => e.name === editingEnv);
  const groups = currentEnv?.groups || [];
  const currentGroup = groups.find(g => g.name === selectedGroup) || groups[0];
  const totalVars = groups.reduce((sum, g) => sum + g.variables.length, 0) || 0;

  const handleAddVariable = (key: string) => {
    const targetGroup = selectedGroup || currentGroup?.name;
    if (!targetGroup) return;
    updateVariable(editingEnv, targetGroup, key, "");
    setSelectedGroup(targetGroup);
    setShowAddVarModal(false);
  };

  // Get existing variable keys in current group for duplicate detection
  const existingKeys = currentGroup?.variables.map(v => v.key) || [];

  const handleCreateGroup = async () => {
    if (newGroupName.trim()) {
      await addGroup(editingEnv, newGroupName);
      setNewGroupName("");
      setShowAddGroup(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!editingGroup || !editingGroup.newName.trim()) {
      setEditingGroup(null);
      return;
    }
    await renameGroup(editingEnv, editingGroup.oldName, editingGroup.newName);
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupName: string) => {
    await deleteGroup(editingEnv, groupName);
    if (selectedGroup === groupName) {
      setSelectedGroup(null);
    }
  };

  const handleCreateEnv = async () => {
    if (newEnvName.trim()) {
      await createEnvironment(newEnvName);
      setNewEnvName("");
      setShowAddEnv(false);
    }
  };

  const handleDeleteEnv = async (envName: string) => {
    if (environments.length <= 1) {
      return;
    }
    if (confirm(t('env.deleteConfirm') + `"${envName}"?`)) {
      await deleteEnvironment(envName);
      // If the deleted env was the editing env, switch editing env
      if (editingEnv === envName) {
        const remaining = environments.filter(e => e.name !== envName);
        setEditingEnv(remaining[0]?.name || "");
      }
    }
  };

  const handleDuplicateEnv = async (envName: string) => {
    await duplicateEnvironment(envName);
  };

  const handleMoveEnv = async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    await moveEnvironment(fromIndex, toIndex);
  };

  const handleExport = () => {
    const json = exportEnvConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flare-environments-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      setImportError(t('env.pleaseInputJson'));
      return;
    }
    const result = await importEnvConfig(importText);
    if (result.success) {
      setShowImportModal(false);
      setImportText("");
      setImportError("");
    } else {
      setImportError(result.error || t('env.importFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        <div className="text-sm">{t('env.loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AddVariableModal
        isOpen={showAddVarModal}
        onConfirm={handleAddVariable}
        onCancel={() => setShowAddVarModal(false)}
        existingKeys={existingKeys}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-lg p-4 w-96 max-h-[80vh] overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h3 className="text-sm font-semibold mb-3">{t('env.importJson')}</h3>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={t('env.importPlaceholder')}
              className="w-full h-40 px-2 py-1 rounded text-xs font-mono mb-2"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
            {importError && <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{importError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-3 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {t('env.cancel')}
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                {t('env.import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Environment Selector Tabs */}
      <div className="flex items-center border-b px-4 pt-4" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-1 flex-wrap">
          {environments.map(env => (
            <button
              key={env.name}
              onClick={() => { setEditingEnv(env.name); setSelectedGroup(null); }}
              className="px-3 py-1.5 rounded-t text-xs font-medium transition-colors"
              style={{
                backgroundColor: editingEnv === env.name ? 'var(--accent-muted)' : 'transparent',
                color: editingEnv === env.name ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {env.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {showAddEnv ? (
            <div className="flex gap-1">
              <input
                type="text"
                value={newEnvName}
                onChange={e => setNewEnvName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateEnv(); if (e.key === 'Escape') setShowAddEnv(false); }}
                placeholder={t('env.envNamePlaceholder')}
                className="w-24 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                autoFocus
              />
              <button onClick={handleCreateEnv} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}>✓</button>
              <button onClick={() => { setShowAddEnv(false); setNewEnvName(""); }} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddEnv(true)}
              className="px-2 py-1 text-xs rounded"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              title={t('env.newEnv')}
            >
              + {t('env.newEnv')}
            </button>
          )}
          {environments.length > 1 && currentEnv && (
            <button
              onClick={() => handleDeleteEnv(currentEnv.name)}
              className="p-1 rounded"
              style={{ color: 'var(--danger)' }}
              title={t('env.deleteEnv')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
          <button
            onClick={() => handleDuplicateEnv(currentEnv?.name || '')}
            className="p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
            title={t('env.copyEnv')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 0122v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </button>
          <button
            onClick={handleExport}
            className="p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
            title={t('env.exportEnv')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </button>
          <button
            onClick={() => { setShowImportModal(true); setImportText(""); setImportError(""); }}
            className="p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
            title={t('env.importEnv')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          {environments.length > 1 && currentEnv && (
            <div className="flex items-center gap-0.5">
              {environments.findIndex(e => e.name === currentEnv.name) > 0 && (
                <button
                  onClick={() => {
                    const idx = environments.findIndex(e => e.name === currentEnv.name);
                    handleMoveEnv(idx, 'up');
                  }}
                  className="p-1 rounded"
                  style={{ color: 'var(--text-muted)' }}
                  title={t('env.moveUp')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
              )}
              {environments.findIndex(e => e.name === currentEnv.name) < environments.length - 1 && (
                <button
                  onClick={() => {
                    const idx = environments.findIndex(e => e.name === currentEnv.name);
                    handleMoveEnv(idx, 'down');
                  }}
                  className="p-1 rounded"
                  style={{ color: 'var(--text-muted)' }}
                  title={t('env.moveDown')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Group List */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border-color)' }}>
          {/* Header */}
          <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="text-sm font-semibold">{currentEnv?.name || t('env.environment')}</h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{totalVars} {t('env.variables')}</p>
          </div>

          {/* Add Group */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
            {showAddGroup ? (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); if (e.key === 'Escape') setShowAddGroup(false); }}
                  placeholder={t('env.groupNamePlaceholder')}
                  className="flex-1 px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  autoFocus
                />
                <button onClick={handleCreateGroup} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--success)', color: 'var(--text-inverse)' }}>✓</button>
                <button onClick={() => { setShowAddGroup(false); setNewGroupName(""); }} className="px-1.5 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddGroup(true)}
                className="w-full px-2 py-1 text-xs rounded"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
              >
                + {t('env.newGroup')}
              </button>
            )}
          </div>

          {/* Group List */}
          <div className="flex-1 overflow-y-auto p-2">
            {(currentEnv?.groups || []).map(group => (
              <div
                key={group.name}
                onClick={() => setSelectedGroup(group.name)}
                className="px-2 py-1.5 rounded text-xs cursor-pointer mb-1"
                style={selectedGroup === group.name || (!selectedGroup && group === (currentEnv?.groups || [])[0])
                  ? { backgroundColor: 'var(--accent-muted)', color: 'var(--accent)' }
                  : { backgroundColor: 'transparent', color: 'var(--text-primary)' }
                }
              >
                <div className="flex items-center justify-between">
                  {editingGroup?.oldName === group.name ? (
                    <input
                      type="text"
                      value={editingGroup.newName}
                      onChange={e => setEditingGroup({ ...editingGroup, newName: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameGroup(); if (e.key === 'Escape') setEditingGroup(null); }}
                      className="flex-1 px-1 py-0.5 rounded text-xs"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="font-medium">{group.name}</span>
                  )}
                  {(selectedGroup === group.name || (!selectedGroup && group === currentEnv?.groups?.[0])) && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingGroup({ oldName: group.name, newName: group.name }); }}
                        className="p-0.5 rounded"
                        style={{ color: 'var(--text-muted)' }}
                        title={t('env.rename')}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      {currentEnv && currentEnv.groups.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.name); }}
                          className="p-0.5 rounded"
                          style={{ color: 'var(--danger)' }}
                          title={t('env.delete')}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{group.variables.length} {t('env.variables')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Variables Editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {currentGroup ? (
            <>
              <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{currentGroup.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}>{t('env.group')}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {currentGroup.variables.length} {t('env.variables')}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddVarModal(true)}
                    className="px-3 py-1.5 text-xs rounded"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--text-inverse)' }}
                  >
                    + {t('env.addVariable')}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <EnvVariablesList
                  variables={currentGroup.variables}
                  onUpdateVariable={(key, value) => updateVariable(editingEnv, currentGroup.name, key, value)}
                  onDeleteVariable={(key) => deleteVariable(editingEnv, currentGroup.name, key)}
                />
              </div>
            </>
          ) : (
             <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('env.pleaseSelectGroup')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}