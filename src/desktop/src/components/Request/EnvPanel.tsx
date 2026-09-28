import { EnvVariablesList, AddVariableModal } from "../Common/EnvVariablesList";
import { useEnvironmentStore, useUIStore, useSettingsStore } from "../../store";
import { useNotificationStore } from "../../store/notificationStore";
import { useTranslation } from "../../utils/i18n";
import type { EnvVariable } from "../../types/api";

interface EnvPanelProps {
  // Prop-based mode for ApiRequestConfigPanel
  currentEnv?: EnvVariable[];
  onUpdateVariable?: (key: string, value: string) => void;
  onDeleteVariable?: (key: string) => void;
  onToggleEnabled?: (key: string, enabled: boolean) => void;
  onExport?: () => void;
  onImport?: () => void;
  inheritedKeys?: Set<string>;
}

export function EnvPanel(props: EnvPanelProps = {}) {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const {
    currentEnv: propCurrentEnv,
    onUpdateVariable: propOnUpdateVariable,
    onDeleteVariable: propOnDeleteVariable,
    onToggleEnabled: propOnToggleEnabled,
    onExport: propOnExport,
    onImport: propOnImport,
    inheritedKeys: propInheritedKeys,
  } = props;

  // Check if prop mode
  const isPropMode = propCurrentEnv !== undefined;
  const { showToast } = useNotificationStore();

  const showAddVarModal = useUIStore((s) => s.showAddVarModal);
  const setShowAddVarModal = useUIStore((s) => s.setShowAddVarModal);

  if (isPropMode) {
    return (
      <div className="space-y-1">
        <AddVariableModal
          isOpen={showAddVarModal}
          onConfirm={(key) => { propOnUpdateVariable?.(key, ""); setShowAddVarModal(false); }}
          onCancel={() => setShowAddVarModal(false)}
        />
        <EnvVariablesList
          variables={propCurrentEnv}
          onUpdateVariable={propOnUpdateVariable || (() => {})}
          onDeleteVariable={propOnDeleteVariable || (() => {})}
          onToggleEnabled={propOnToggleEnabled}
          inheritedKeys={propInheritedKeys}
        />
        <button
          onClick={() => setShowAddVarModal(true)}
          className="text-xs"
          style={{ color: 'var(--accent)' }}
        >
          + {t('env.addVariable')}
        </button>
        {(propOnExport || propOnImport) && (
          <div className="border-t mt-3 pt-3" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('env.importExport')}</span>
            </div>
            <div className="flex gap-2">
              {propOnExport && <button onClick={propOnExport} className="px-2 py-1 text-xs rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('env.export')}</button>}
              {propOnImport && <button onClick={propOnImport} className="px-2 py-1 text-xs rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{t('env.import')}</button>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Store-based mode (no props) - shows all groups' variables with group indicator
  const environments = useEnvironmentStore((s) => s.environments);
  const selectedEnv = useEnvironmentStore((s) => s.selectedEnv);
  const updateVariable = useEnvironmentStore((s) => s.updateVariable);
  const toggleVariableEnabled = useEnvironmentStore((s) => s.toggleVariableEnabled);
  const deleteVariable = useEnvironmentStore((s) => s.deleteVariable);

  const currentEnvData = environments.find(e => e.name === selectedEnv);
  // Get all groups' variables with group info
  const envVariables = currentEnvData?.groups?.flatMap(g =>
    g.variables.map(v => ({ ...v, group: g.name }))
  ) || [];

  // All environment variables are "inherited" from the environment config
  const inheritedKeys = new Set(envVariables.map(v => v.key));

  // Import/Export handlers
  const exportEnvConfig = useEnvironmentStore((s) => s.exportEnvConfig);
  const importEnvConfig = useEnvironmentStore((s) => s.importEnvConfig);

  const handleExport = () => {
    const json = exportEnvConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `env-config-${selectedEnv}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const result = await importEnvConfig(text);
      if (!result.success) {
        showToast(`${t('env.importFailed')}: ${result.error}`, "error");
      }
    };
    input.click();
  };

  return (
    <div className="space-y-1">
      <AddVariableModal
        isOpen={showAddVarModal}
        onConfirm={(key) => {
          updateVariable(selectedEnv, "Default", key, "");
          setShowAddVarModal(false);
        }}
        onCancel={() => setShowAddVarModal(false)}
      />
      <EnvVariablesList
        variables={envVariables}
        onUpdateVariable={(key, value) => updateVariable(selectedEnv, "Default", key, value)}
        onDeleteVariable={(key) => deleteVariable(selectedEnv, "Default", key)}
        onToggleEnabled={(key, enabled) => toggleVariableEnabled(selectedEnv, "Default", key, enabled)}
        showGroup={currentEnvData && currentEnvData.groups.length > 1}
        inheritedKeys={inheritedKeys}
      />
      <button
        onClick={() => setShowAddVarModal(true)}
        className="text-xs"
        style={{ color: 'var(--accent)' }}
      >
        + {t('env.addVariable')}
      </button>
      <div className="border-t mt-3 pt-3 flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={handleExport}
          className="px-2 py-1 text-xs rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          title={t('env.exportEnvConfig')}
        >
          {t('env.export')}
        </button>
        <button
          onClick={handleImport}
          className="px-2 py-1 text-xs rounded"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          title={t('env.importEnvConfig')}
        >
          {t('env.import')}
        </button>
      </div>
    </div>
  );
}