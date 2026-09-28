/**
 * Mock Store - MOCK数据生成的配置管理
 *
 * 支持:
 * - 多语言/多地区配置
 * - 自定义字段规则
 * - 自定义数据池
 * - 内置预设 (中文/英文)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FieldGenType } from '../utils/mock';
import {
  addMockCustomRule as apiAddMockCustomRule,
  updateMockCustomRule as apiUpdateMockCustomRule,
  deleteMockCustomRule as apiDeleteMockCustomRule,
  toggleMockCustomRule as apiToggleMockCustomRule,
} from '../services/api';
import { toast } from './notificationStore';

// ============================================================================
// Type Definitions
// ============================================================================

export type MockLocale = 'zh-CN' | 'en-US';

export interface MockDataPool {
  firstName: string[];
  lastName: string[];
  emailDomain: string[];
  city: string[];
  country: string[];
  company: string[];
  color: string[];
  userAgent: string[];
  // Localized sample texts
  sampleText: {
    short: string;      // Short text (max 50 chars)
    medium: string;     // Medium text
    long: string;       // Long paragraph
    title: string;      // Title text
    description: string; // Description text
    address: string;    // Address format
  };
}

// 通用自定义规则 - 字段模拟和响应模拟都能用
export interface CommonRule {
  id: string;
  name: string;        // 规则名，如 "userEmail"
  targetType: string; // 目标类型，如 "email"
  enabled: boolean;
}

// 字段专用规则 - 模式匹配字段名
export interface FieldRule {
  id: string;
  pattern: string;     // regex pattern to match field name
  fieldType: string;   // 'name' | 'email' | 'phone' | 'city' | etc.
  format?: string;     // optional format like 'email', 'ipv4', 'uri'
  enabled: boolean;
}

export interface MockConfigState {
  // Locale settings
  currentLocale: MockLocale;

  // 内置规则 enable/disable state
  builtinRules: Record<FieldGenType, boolean>;

  // 通用自定义规则 (字段和响应都能用)
  commonRules: CommonRule[];

  // 字段模拟专用规则 (模式匹配)
  fieldRules: FieldRule[];

  // Custom field rules (user-defined pattern → type mappings)
  customRules: FieldRule[];

  // Enable smart detection based on field name
  smartDetectionEnabled: boolean;

  // Sequence settings
  sequencePrefix: string;
  sequenceStart: number;
  sequencePadding: number; // e.g., 3 → _001

  // Suffix settings
  defaultSuffixType: 'none' | 'seq' | 'custom';
  customSuffix: string;

  // Custom data pool (overrides default)
  customDataPool?: MockDataPool;
}

// ============================================================================
// Locale Presets
// ============================================================================

const ZH_CN_POOL: MockDataPool = {
  firstName: ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴'],
  lastName: ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军'],
  emailDomain: ['example.com', 'test.com', 'demo.com', 'sample.org'],
  city: ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '西安'],
  country: ['中国', '美国', '英国', '德国', '法国', '日本', '澳大利亚', '巴西'],
  company: ['阿里巴巴', '腾讯', '百度', '京东', '字节跳动', '美团', '滴滴', '小米'],
  color: ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#33FFF5'],
  userAgent: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  ],
  sampleText: {
    short: '示例文本',
    medium: '这是一段示例文本，用于测试和演示目的。',
    long: '这是一段较长的示例文本，用于模拟真实场景中的文本内容。它可以包含多个句子和段落，以帮助开发者更好地测试文本处理功能。在实际应用中，这样的文本可以用于测试文本截断、格式化、和展示效果。',
    title: '示例标题',
    description: '这是一个示例描述文本，用于说明某项功能或内容。它通常用于测试界面布局和文本显示效果。',
    address: '北京市朝阳区建国路88号',
  },
};

const EN_US_POOL: MockDataPool = {
  firstName: ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth'],
  lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
  emailDomain: ['example.com', 'test.com', 'demo.com', 'sample.org'],
  city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'],
  country: ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia', 'Brazil'],
  company: ['Acme Corp', 'TechCo', 'GlobalTech', 'Innovation Labs', 'Digital Dynamics', 'Future Systems'],
  color: ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33', '#33FFF5'],
  userAgent: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  ],
  sampleText: {
    short: 'Sample text',
    medium: 'This is a sample text for testing and demonstration purposes.',
    long: 'This is a longer sample text that simulates real-world content. It can contain multiple sentences and paragraphs to help developers better test text processing features. In real applications, such text can be used to test text truncation, formatting, and display effects.',
    title: 'Sample Title',
    description: 'This is a sample description text, used to explain a feature or content. It is typically used to test interface layout and text display effects.',
    address: '123 Main Street, New York, NY 10001',
  },
};

export const LOCALE_PRESETS: Record<MockLocale, MockDataPool> = {
  'zh-CN': ZH_CN_POOL,
  'en-US': EN_US_POOL,
};

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_MOCK_STATE: MockConfigState = {
  currentLocale: 'zh-CN',
  commonRules: [],
  fieldRules: [],
  customRules: [],
  builtinRules: {
    auto: true,
    name: true,
    email: true,
    phone: true,
    city: true,
    country: true,
    company: true,
    price: true,
    address: true,
    avatar: true,
    uuid: true,
    url: true,
    ipv4: true,
    ipv6: true,
    lat: true,
    lng: true,
    zip: true,
    color: true,
    rating: true,
    age: true,
    date: true,
    boolean: true,
    number: true,
    sequence: true,
    random: true,
    nullify: true,
    '$timestamp': true,
    '$date': true,
    '$time': true,
    '$datetime': true,
    '$randomInt': true,
    '$randomFloat': true,
    '$seq': true,
  },
  smartDetectionEnabled: true,
  sequencePrefix: '',
  sequenceStart: 1,
  sequencePadding: 3,
  defaultSuffixType: 'none',
  customSuffix: '',
};

// ============================================================================
// Store Interface
// ============================================================================

interface MockStore extends MockConfigState {
  // Locale actions
  setLocale: (locale: MockLocale) => void;

  // Common rules actions (shared by field and response)
  addCommonRule: (rule: CommonRule) => void;
  updateCommonRule: (id: string, updates: Partial<CommonRule>) => void;
  removeCommonRule: (id: string) => void;

  // Field rules actions (field-specific)
  addFieldRule: (rule: FieldRule) => void;
  updateFieldRule: (id: string, updates: Partial<FieldRule>) => void;
  removeFieldRule: (id: string) => void;

  // Legacy rule actions (for backward compatibility)
  addRule: (rule: FieldRule) => void;
  updateRule: (id: string, updates: Partial<FieldRule>) => void;
  removeRule: (id: string) => void;
  reorderRules: (rules: FieldRule[]) => void;

  // Builtin rules actions
  setBuiltinRuleEnabled: (type: FieldGenType, enabled: boolean) => void;
  resetBuiltinRules: () => void;
  getEnabledBuiltinRules: () => FieldGenType[];

  // Settings actions
  setSmartDetection: (enabled: boolean) => void;
  setSequencePrefix: (prefix: string) => void;
  setSequenceStart: (start: number) => void;
  setSequencePadding: (padding: number) => void;
  setDefaultSuffixType: (type: 'none' | 'seq' | 'custom') => void;
  setCustomSuffix: (suffix: string) => void;

  // Custom data pool actions
  setCustomDataPool: (pool: MockDataPool | undefined) => void;
  resetToLocalePreset: () => void;

  // Helpers
  getDataPool: () => MockDataPool;
  getLocaleLabel: () => string;
  getRuleByName: (name: string) => { targetType: string; source: 'common' | 'builtin' } | null;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useMockStore = create<MockStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_MOCK_STATE,

      setLocale: (locale) => set({ currentLocale: locale }),

      // Common rules actions (synced with backend)
      addCommonRule: async (rule) => {
        // Sync to backend first
        try {
          await apiAddMockCustomRule(rule.name, rule.targetType);
          await apiToggleMockCustomRule(rule.name, rule.enabled);
          // Only update local state after successful sync
          set((state) => ({
            commonRules: [...state.commonRules, rule]
          }));
        } catch (e) {
          toast.error(`同步通用规则失败: ${rule.name}`);
        }
      },

      updateCommonRule: async (id, updates) => {
        const existingRule = get().commonRules.find(r => r.id === id);
        if (!existingRule) return;

        // Sync to backend
        try {
          if (updates.name !== undefined && updates.name !== existingRule.name) {
            // Name changed: delete old, add new
            await apiDeleteMockCustomRule(existingRule.name);
            await apiAddMockCustomRule(updates.name, updates.targetType || existingRule.targetType);
            if (updates.enabled !== undefined) {
              await apiToggleMockCustomRule(updates.name, updates.enabled);
            }
          } else {
            // Just update targetType and/or enabled
            if (updates.targetType !== undefined) {
              await apiUpdateMockCustomRule(existingRule.name, updates.targetType);
            }
            if (updates.enabled !== undefined) {
              await apiToggleMockCustomRule(existingRule.name, updates.enabled);
            }
          }
        } catch (e) {
          toast.error(`同步通用规则更新失败: ${existingRule.name}`);
          return;
        }

        // Only update local state after successful sync
        set((state) => ({
          commonRules: state.commonRules.map(r => r.id === id ? { ...r, ...updates } : r)
        }));
      },

      removeCommonRule: async (id) => {
        const rule = get().commonRules.find(r => r.id === id);
        if (rule) {
          // Sync to backend first
          try {
            await apiDeleteMockCustomRule(rule.name);
            // Only update local state after successful sync
            set((state) => ({
              commonRules: state.commonRules.filter(r => r.id !== id)
            }));
          } catch (e) {
            toast.error(`删除通用规则失败: ${rule.name}`);
          }
        }
      },

      // Field rules actions
      addFieldRule: (rule) => set((state) => ({
        fieldRules: [...state.fieldRules, rule]
      })),

      updateFieldRule: (id, updates) => set((state) => ({
        fieldRules: state.fieldRules.map(r => r.id === id ? { ...r, ...updates } : r)
      })),

      removeFieldRule: (id) => set((state) => ({
        fieldRules: state.fieldRules.filter(r => r.id !== id)
      })),

      // Legacy rule actions
      addRule: (rule) => set((state) => ({
        customRules: [...state.customRules, rule]
      })),

      updateRule: (id, updates) => set((state) => ({
        customRules: state.customRules.map(r => r.id === id ? { ...r, ...updates } : r)
      })),

      removeRule: (id) => set((state) => ({
        customRules: state.customRules.filter(r => r.id !== id)
      })),

      reorderRules: (rules) => set({ customRules: rules }),

      setBuiltinRuleEnabled: (type, enabled) => set((state) => ({
        builtinRules: { ...state.builtinRules, [type]: enabled }
      })),

      resetBuiltinRules: () => set({
        builtinRules: DEFAULT_MOCK_STATE.builtinRules
      }),

      getEnabledBuiltinRules: () => {
        const state = get();
        return (Object.entries(state.builtinRules) as [FieldGenType, boolean][])
          .filter(([, enabled]) => enabled)
          .map(([type]) => type);
      },

      setSmartDetection: (enabled) => set({ smartDetectionEnabled: enabled }),
      setSequencePrefix: (prefix) => set({ sequencePrefix: prefix }),
      setSequenceStart: (start) => set({ sequenceStart: start }),
      setSequencePadding: (padding) => set({ sequencePadding: Math.max(1, Math.min(10, padding)) }),
      setDefaultSuffixType: (type) => set({ defaultSuffixType: type }),
      setCustomSuffix: (suffix) => set({ customSuffix: suffix }),

      setCustomDataPool: (pool) => set({ customDataPool: pool }),

      resetToLocalePreset: () => set({
        customDataPool: undefined
      }),

      getDataPool: () => {
        const state = get();
        return state.customDataPool || LOCALE_PRESETS[state.currentLocale];
      },

      getLocaleLabel: () => {
        const state = get();
        return state.currentLocale === 'zh-CN' ? '中文' : 'English';
      },

      getRuleByName: (name: string) => {
        const state = get();
        // First check common rules
        const commonRule = state.commonRules.find(r => r.name === name && r.enabled);
        if (commonRule) {
          return { targetType: commonRule.targetType, source: 'common' as const };
        }
        // Then check builtin rules
        if (state.builtinRules[name as FieldGenType]) {
          return { targetType: name, source: 'builtin' as const };
        }
        return null;
      },
    }),
    {
      name: 'flare-mock-config',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// ============================================================================
// Convenience Selectors
// ============================================================================

export const useMockConfig = () => useMockStore((state) => ({
  locale: state.currentLocale,
  localeLabel: state.currentLocale === 'zh-CN' ? '中文' : 'English',
  smartDetection: state.smartDetectionEnabled,
  customRules: state.customRules,
  sequencePrefix: state.sequencePrefix,
  sequenceStart: state.sequenceStart,
  sequencePadding: state.sequencePadding,
  defaultSuffixType: state.defaultSuffixType,
  customSuffix: state.customSuffix,
}));