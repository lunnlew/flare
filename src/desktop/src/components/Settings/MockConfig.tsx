/**
 * MockConfig - 统一Mock配置面板
 *
 * 包含四个功能 Tab:
 * 1. 规则 - 统一管理所有规则（内置 + 自定义 + 匹配规则）
 * 2. 生成 - 字段模拟配置 + 快速预览
 * 3. 模拟 - 响应模拟配置 + 测试
 * 4. Server - Mock Server 控制面板
 */

import { useState } from "react";
import { MockServerPanel } from "./MockServerPanel";
import { PreviewSection } from "./MockConfig.PreviewSection";
import { GeneratePanel } from "./MockConfig.GeneratePanel";
import { RulesPanel } from "./MockConfig.RulesPanel";
import { MockPanel } from "./MockConfig.MockPanel";
import { useSettingsStore } from "../../store";
import { useTranslation } from "../../utils/i18n";

type MockTab = 'rules' | 'generate' | 'mock' | 'server';

// ============================================================================
// Main Component
// ============================================================================

export function MockConfig() {
  const language = useSettingsStore((s) => s.language);
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<MockTab>('rules');

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h1 className="text-base font-semibold">{t('mock.title')}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {t('mock.title.description')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
        <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>
          {t('mock.rules')}
        </TabButton>
        <TabButton active={activeTab === 'generate'} onClick={() => setActiveTab('generate')}>
          {t('mock.generate')}
        </TabButton>
        <TabButton active={activeTab === 'mock'} onClick={() => setActiveTab('mock')}>
          {t('mock.mock')}
        </TabButton>
        <TabButton active={activeTab === 'server'} onClick={() => setActiveTab('server')}>
          {t('mock.server')}
        </TabButton>
      </div>

      {/* Content + Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'rules' ? <RulesPanel /> : activeTab === 'generate' ? <GeneratePanel /> : activeTab === 'mock' ? <MockPanel /> : <MockServerPanel />}
        </div>

        {/* Preview Footer - Always Visible */}
        <div
          className="flex-shrink-0 border-t"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
        >
          <PreviewSection />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-xs font-medium transition-colors"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {children}
    </button>
  );
}