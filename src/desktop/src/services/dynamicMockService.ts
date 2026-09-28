/**
 * Dynamic Mock Service - 动态Mock数据生成服务
 *
 * 基于请求参数和规则配置生成Mock响应
 * 支持直接在 body template 中使用规则类型，如 {{email}}, {{name}}
 *
 * Architecture: This service orchestrates dynamic mock execution.
 * Actual value generation is delegated to mock.ts which handles:
 * - Frontend generation for simple types
 * - Backend calls for dynamic types ($timestamp, $date, etc.)
 */

import type { DynamicMockRule, DynamicMockVariable, RequestData } from '../store/dynamicMockStore';
import type { FieldGenType } from '../utils/mock';
import { getAllGenTypes, generateByRuleFromMock } from '../utils/mock';
import { useMockStore } from '../store/mockStore';
import { useDynamicMockStore } from '../store/dynamicMockStore';
import { useEnvironmentStore } from '../store/environmentStore';
import { processMockTemplate } from './api';
import { logger } from '../utils/logger';

const mockLogger = logger.child('mock');

// Re-export generateByRule from mock.ts for external use
export { generateByRuleFromMock as generateByRule } from '../utils/mock';

/**
 * 从请求中提取变量值
 */
function extractVariableValue(
  request: RequestData,
  variable: DynamicMockVariable
): unknown {
  const { paramName, transform } = variable;
  let value: unknown = undefined;

  // Try to extract from params
  if (request.params[paramName] !== undefined) {
    value = request.params[paramName];
  }
  // Try to extract from headers
  else if (request.headers[paramName] !== undefined) {
    value = request.headers[paramName];
  }
  // Try to extract from body by JSON path
  else if (request.body && typeof request.body === 'object') {
    const pathParts = paramName.split('.');
    let current: unknown = request.body;
    for (const part of pathParts) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    value = current;
  }

  // Apply transform
  if (value !== undefined && transform) {
    switch (transform) {
      case 'uppercase':
        value = String(value).toUpperCase();
        break;
      case 'lowercase':
        value = String(value).toLowerCase();
        break;
      case 'trim':
        value = String(value).trim();
        break;
      case 'capitalize':
        value = String(value).charAt(0).toUpperCase() + String(value).slice(1);
        break;
    }
  }

  return value;
}

/**
 * 使用Mock规则生成值
 */
async function generateMockValueForVariable(
  mockRule: FieldGenType,
  contextValue?: unknown
): Promise<unknown> {
  const locale = useMockStore.getState().currentLocale;
  if (mockRule === 'auto' && contextValue !== undefined) {
    if (typeof contextValue === 'number') {
      return contextValue;
    }
    if (typeof contextValue === 'string') {
      if (contextValue.includes('@')) {
        return generateByRuleFromMock('email', locale);
      }
      if (/^\+?[\d\s-]{10,}$/.test(contextValue)) {
        return generateByRuleFromMock('phone', locale);
      }
    }
  }

  return generateByRuleFromMock(mockRule, locale);
}

/**
 * Extract delay value from template and return cleaned template
 * Supports {{$delay ms}} or {{$delay min-max}}
 */
function extractDelayFromTemplate(template: string): { template: string; delay: number } {
  // Match {{$delay}} or {{$delay value}} or {{$delay min-max}}
  const delayRegex = /\{\{\$delay(?:\s+([\d]+-[\d]+|[\d]+))?\}\}/g;
  let delay = 0;

  const cleanedTemplate = template.replace(delayRegex, (_match, delaySpec) => {
    if (delaySpec) {
      if (delaySpec.includes('-')) {
        // Range like "500-2000"
        const [min, max] = delaySpec.split('-').map(Number);
        delay = Math.floor(Math.random() * (max - min + 1)) + min;
      } else {
        // Fixed value like "1000"
        delay = parseInt(delaySpec, 10) || 0;
      }
    }
    return ''; // Remove delay placeholder from template
  });

  return { template: cleanedTemplate, delay };
}

/**
 * Substitute environment variables in template
 * Supports {{$env VAR_NAME}}
 */
function substituteEnvVariables(template: string, envVars: Record<string, string>): string {
  return template.replace(/\{\{\$env\s+(\w+)\}\}/g, (match, varName) => {
    return envVars[varName] ?? match;
  });
}

/**
 * 替换模板中的变量占位符
 * 1. 先用 variableValues 替换 (向后兼容)
 * 2. 然后调用后端 processMockTemplate 处理所有规则 (包括 custom rules)
 * 3. 提取 $delay 延迟值
 * 4. 替换 $env 环境变量
 */
async function substituteTemplateAsync(
  template: string,
  variableValues: Record<string, unknown>
): Promise<{ template: string; delay: number }> {
  let processedTemplate = template;

  // Step 0: Extract delay first
  const { template: afterDelay, delay } = extractDelayFromTemplate(processedTemplate);
  processedTemplate = afterDelay;

  // Step 1: Replace variableValues (backward compatibility)
  processedTemplate = processedTemplate.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variableValues[varName];
    if (value !== undefined) {
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    }
    return match;
  });

  // Step 2: Substitute environment variables
  const envStore = useEnvironmentStore.getState();
  const envVars: Record<string, string> = {};
  for (const env of envStore.environments) {
    if (env.name === envStore.selectedEnv) {
      for (const group of env.groups || []) {
        for (const v of group.variables || []) {
          if (v.enabled) {
            envVars[v.key] = v.value;
          }
        }
      }
    }
  }
  processedTemplate = substituteEnvVariables(processedTemplate, envVars);

  // Step 3: Call backend to handle custom rules + built-in rules
  // Backend knows about custom rule mappings (e.g., userEmail → email)
  // Use locale from mockStore for consistent i18n data
  const locale = useMockStore.getState().currentLocale;
  try {
    processedTemplate = await processMockTemplate(processedTemplate, locale);
  } catch (e) {
    // Re-throw to let caller handle the error, don't silently swallow
    throw new Error(`Template processing failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return { template: processedTemplate, delay };
}

/**
 * 解析并执行动态Mock规则
 */
export interface DynamicMockResult {
  success: boolean;
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  delay: number;
  matchedRule: DynamicMockRule | null;
  error?: string;
}

export async function executeDynamicMock(
  request: RequestData,
  rule: DynamicMockRule
): Promise<DynamicMockResult> {
  try {
    const variableValues: Record<string, unknown> = {};
    for (const variable of rule.variables) {
      const contextValue = extractVariableValue(request, variable);
      variableValues[variable.paramName] = await generateMockValueForVariable(
        variable.mockRule,
        contextValue
      );
    }

    const { template: substitutedTemplate, delay: templateDelay } = await substituteTemplateAsync(
      rule.response.bodyTemplate,
      variableValues
    );

    let body: unknown;
    try {
      body = JSON.parse(substitutedTemplate);
    } catch {
      mockLogger.warn('Failed to parse JSON, using raw template');
      body = substitutedTemplate;
    }

    // Use template delay if set, otherwise use rule's delay
    const finalDelay = templateDelay > 0 ? templateDelay : (rule.response.delay || 0);

    return {
      success: true,
      statusCode: rule.response.statusCode,
      headers: rule.response.headers || {},
      body,
      delay: finalDelay,
      matchedRule: rule,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      headers: {},
      body: { error: 'Dynamic mock execution failed' },
      delay: 0,
      matchedRule: rule,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 测试动态Mock规则
 */
export async function testDynamicMock(
  testRequest: RequestData,
  rule: DynamicMockRule
): Promise<DynamicMockResult> {
  const variableValues: Record<string, unknown> = {};
  for (const variable of rule.variables) {
    const contextValue = extractVariableValue(testRequest, variable);
    variableValues[variable.paramName] = await generateMockValueForVariable(
      variable.mockRule,
      contextValue
    );
  }

  const { template: substitutedTemplate, delay: templateDelay } = await substituteTemplateAsync(
    rule.response.bodyTemplate,
    variableValues
  );

  let body: unknown;
  try {
    body = JSON.parse(substitutedTemplate);
  } catch {
    body = substitutedTemplate;
  }

  return {
    success: true,
    statusCode: rule.response.statusCode,
    headers: rule.response.headers || {},
    body,
    delay: templateDelay > 0 ? templateDelay : (rule.response.delay || 0),
    matchedRule: rule,
  };
}

/**
 * 预览动态Mock响应（不实际执行）
 */
export function previewDynamicMock(
  rule: DynamicMockRule
): {
    trigger: string;
    response: string;
    variables: string[];
    customRulesInfo: string[];
    commonRulesInfo: string[];
  } {
  const triggerDesc: string[] = [];

  if (rule.trigger.method && rule.trigger.method.length > 0) {
    triggerDesc.push(`Method: ${rule.trigger.method.join(' | ')}`);
  }
  if (rule.trigger.pathPattern) {
    triggerDesc.push(`Path: ${rule.trigger.pathPattern}`);
  }
  if (rule.trigger.params) {
    const params = Object.entries(rule.trigger.params)
      .map(([k, v]) => v ? `${k}=${v}` : k)
      .join(', ');
    if (params) triggerDesc.push(`Params: ${params}`);
  }

  // Get custom rules from stores
  const mockStore = useMockStore.getState();
  const dynamicMockStore = useDynamicMockStore.getState();

  // Extract {{variable}} patterns from template
  const templateVariables = rule.response.bodyTemplate.match(/\{\{(\w+)\}\}/g) || [];
  const varNames = templateVariables.map(v => v.replace(/\{\{(\w+)\}\}/g, '$1'));

  // Check which are covered by response custom rules
  const responseCustomRules = dynamicMockStore.customRules;
  const customRulesInfo: string[] = [];
  const commonRulesInfo: string[] = [];

  for (const varName of varNames) {
    const responseRule = responseCustomRules.find(r => r.variable === varName && r.enabled);
    if (responseRule) {
      customRulesInfo.push(`${varName} → ${responseRule.targetType} (response custom)`);
      continue;
    }

    const commonRule = mockStore.commonRules.find(r => r.name === varName && r.enabled);
    if (commonRule) {
      commonRulesInfo.push(`${varName} → ${commonRule.targetType} (common)`);
      continue;
    }

    const validRuleTypes = new Set(getAllGenTypes());
    if (validRuleTypes.has(varName as FieldGenType)) {
      // Built-in rule, skip
      continue;
    }
  }

  return {
    trigger: triggerDesc.join(' | ') || '(always match)',
    response: rule.response.bodyTemplate.substring(0, 100) +
      (rule.response.bodyTemplate.length > 100 ? '...' : ''),
    variables: rule.variables.map(v => `${v.paramName} → ${v.mockRule}`),
    customRulesInfo,
    commonRulesInfo,
  };
}