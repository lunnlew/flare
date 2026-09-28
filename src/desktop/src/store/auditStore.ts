/**
 * Audit Store - 操作审计日志
 *
 * 记录所有敏感操作，支持审计追踪
 *
 * Key Patterns:
 * 1. 操作记录不可更改（只追加）
 * 2. 按时间倒序排列，最新在前
 * 3. 支持按操作类型筛选
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { logger } from '../utils/logger';

const auditLogger = logger.child('audit');

export type AuditAction =
  | 'REQUEST_SEND'
  | 'REQUEST_SAVE'
  | 'REQUEST_DELETE'
  | 'REQUEST_UPDATE'
  | 'ENV_CREATE'
  | 'ENV_UPDATE'
  | 'ENV_DELETE'
  | 'COLLECTION_CREATE'
  | 'COLLECTION_DELETE'
  | 'COLLECTION_UPDATE'
  | 'FLOW_SAVE'
  | 'FLOW_DELETE'
  | 'FLOW_EXECUTE'
  | 'MOCK_GENERATE'
  | 'SETTINGS_UPDATE'
  | 'OAUTH_CONNECT'
  | 'OAUTH_DISCONNECT';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  description: string;
  details?: Record<string, unknown>;
  userId?: string;
}

interface AuditFilter {
  actions?: AuditAction[];
  startDate?: string;
  endDate?: string;
  searchText?: string;
}

interface AuditStore {
  // 日志条目
  entries: AuditEntry[];

  // 最大存储条数
  maxEntries: number;

  // 添加审计日志
  log: (action: AuditAction, description: string, details?: Record<string, unknown>) => void;

  // 查询日志
  query: (filter?: AuditFilter) => AuditEntry[];

  // 清除日志
  clear: () => void;

  // 导出日志
  exportLogs: () => string;
}

// 操作描述映射
const ACTION_LABELS: Record<AuditAction, string> = {
  REQUEST_SEND: '发送请求',
  REQUEST_SAVE: '保存请求',
  REQUEST_DELETE: '删除请求',
  REQUEST_UPDATE: '更新请求',
  ENV_CREATE: '创建环境',
  ENV_UPDATE: '更新环境',
  ENV_DELETE: '删除环境',
  COLLECTION_CREATE: '创建集合',
  COLLECTION_DELETE: '删除集合',
  COLLECTION_UPDATE: '更新集合',
  FLOW_SAVE: '保存流程',
  FLOW_DELETE: '删除流程',
  FLOW_EXECUTE: '执行流程',
  MOCK_GENERATE: '生成Mock数据',
  SETTINGS_UPDATE: '更新设置',
  OAUTH_CONNECT: '连接OAuth',
  OAUTH_DISCONNECT: '断开OAuth',
};

// 操作分类（用于筛选）
const ACTION_CATEGORIES: Record<string, AuditAction[]> = {
  '请求相关': ['REQUEST_SEND', 'REQUEST_SAVE', 'REQUEST_DELETE', 'REQUEST_UPDATE'],
  '环境相关': ['ENV_CREATE', 'ENV_UPDATE', 'ENV_DELETE'],
  '集合相关': ['COLLECTION_CREATE', 'COLLECTION_DELETE', 'COLLECTION_UPDATE'],
  '流程相关': ['FLOW_SAVE', 'FLOW_DELETE', 'FLOW_EXECUTE'],
  '设置相关': ['SETTINGS_UPDATE', 'OAUTH_CONNECT', 'OAUTH_DISCONNECT'],
  '其他': ['MOCK_GENERATE'],
};

export const useAuditStore = create<AuditStore>()(
  persist(
    (set, get) => ({
      entries: [],
      maxEntries: 1000,

      log: (action, description, details) => {
        // Emit to unified logging system
        auditLogger.info(description, { action, details });

        const entry: AuditEntry = {
          id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          timestamp: new Date().toISOString(),
          action,
          description,
          details,
        };

        set((state) => {
          const newEntries = [entry, ...state.entries];
          // 保持最大条数限制
          if (newEntries.length > state.maxEntries) {
            return { entries: newEntries.slice(0, state.maxEntries) };
          }
          return { entries: newEntries };
        });
      },

      query: (filter) => {
        const { entries } = get();
        if (!filter) return entries;

        return entries.filter((entry) => {
          // 按操作类型筛选
          if (filter.actions && filter.actions.length > 0) {
            if (!filter.actions.includes(entry.action)) return false;
          }

          // 按日期范围筛选
          if (filter.startDate) {
            if (entry.timestamp < filter.startDate) return false;
          }
          if (filter.endDate) {
            if (entry.timestamp > filter.endDate) return false;
          }

          // 按文本搜索
          if (filter.searchText) {
            const searchLower = filter.searchText.toLowerCase();
            const matchText = entry.description.toLowerCase() + entry.action.toLowerCase();
            if (!matchText.includes(searchLower)) return false;
          }

          return true;
        });
      },

      clear: () => set({ entries: [] }),

      exportLogs: () => {
        const { entries } = get();
        return JSON.stringify(entries, null, 2);
      },
    }),
    {
      name: 'flare-audit-log',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);

// 便捷导出
export const useAuditLog = () => useAuditStore(
  useShallow((s) => ({
    entries: s.entries,
    log: s.log,
    query: s.query,
    clear: s.clear,
    exportLogs: s.exportLogs,
  }))
);

// 操作分类
export const useAuditCategories = () => ACTION_CATEGORIES;

// 操作标签
export const getActionLabel = (action: AuditAction): string => ACTION_LABELS[action] || action;