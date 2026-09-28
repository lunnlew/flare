/**
 * Mock Data Generator - Generate realistic sample data from OpenAPI schemas
 *
 * Supports:
 * - Primitive types (string, number, boolean)
 * - Formats (email, uri, date-time, uuid, etc.)
 * - Enums
 * - Arrays and Objects
 * - Default values from schema
 * - Multi-language/i18n via mockStore
 * - Custom field rules
 */

import { type MockLocale, type MockDataPool } from '../store/mockStore';

const DEFAULT_RANDOM_STRING_LENGTH = 8;

interface MockOptions {
  seed?: number; // For reproducible results
  locale?: MockLocale;
  customDataPool?: MockDataPool;
  // For explicit rule selection (from FieldEditor)
  explicitRule?: FieldGenType;
  // For sequence generation
  index?: number;
  // For smart detection with builtin rules filtering
  smartDetectionEnabled?: boolean;
  enabledRules?: FieldGenType[];
  // Custom field match rules (user-defined regex patterns)
  fieldRules?: CustomFieldRule[];
  // Skip field name detection when user explicitly set the type
  skipFieldNameDetection?: boolean;
}

// ============================================================================
// i18n Labels (for FieldEditor)
// ============================================================================

export type FieldGenType =
  | 'auto'      // Smart detection
  | 'name'      // Name
  | 'email'     // Email
  | 'phone'     // Phone
  | 'city'      // City
  | 'country'   // Country
  | 'company'   // Company
  | 'price'     // Price
  | 'address'   // Address
  | 'avatar'    // Avatar URL
  | 'uuid'      // UUID
  | 'url'       // URL
  | 'ipv4'      // IPv4
  | 'ipv6'      // IPv6
  | 'lat'       // Latitude
  | 'lng'       // Longitude
  | 'zip'       // Zip code
  | 'color'     // Color
  | 'rating'    // Rating
  | 'age'       // Age
  | 'date'      // Date
  | 'boolean'   // Boolean (true/false)
  | 'number'    // Number
  | 'sequence'  // Sequence
  | 'random'    // Random
  | 'nullify'   // Clear value
  // Dynamic generation types
  | '$timestamp' // Unix timestamp (ms)
  | '$date'      // Current date (YYYY-MM-DD)
  | '$time'      // Current time (HH:mm:ss)
  | '$datetime'  // ISO datetime
  | '$randomInt' // Random integer (0-10000)
  | '$randomFloat' // Random float (0-1000, 2 decimals)
  | '$seq'; // Sequence with configurable prefix

// i18n labels for field gen types
const GEN_TYPE_LABELS: Record<FieldGenType, Record<MockLocale, string>> = {
  auto: { 'zh-CN': '智能识别 (推荐)', 'en-US': 'Smart Detection (Recommended)' },
  name: { 'zh-CN': '姓名', 'en-US': 'Name' },
  email: { 'zh-CN': '邮箱', 'en-US': 'Email' },
  phone: { 'zh-CN': '电话', 'en-US': 'Phone' },
  city: { 'zh-CN': '城市', 'en-US': 'City' },
  country: { 'zh-CN': '国家', 'en-US': 'Country' },
  company: { 'zh-CN': '公司', 'en-US': 'Company' },
  price: { 'zh-CN': '价格', 'en-US': 'Price' },
  address: { 'zh-CN': '地址', 'en-US': 'Address' },
  avatar: { 'zh-CN': '头像URL', 'en-US': 'Avatar URL' },
  uuid: { 'zh-CN': 'UUID', 'en-US': 'UUID' },
  url: { 'zh-CN': '网址', 'en-US': 'URL' },
  ipv4: { 'zh-CN': 'IPv4', 'en-US': 'IPv4' },
  ipv6: { 'zh-CN': 'IPv6', 'en-US': 'IPv6' },
  lat: { 'zh-CN': '纬度', 'en-US': 'Latitude' },
  lng: { 'zh-CN': '经度', 'en-US': 'Longitude' },
  zip: { 'zh-CN': '邮编', 'en-US': 'Zip Code' },
  color: { 'zh-CN': '颜色', 'en-US': 'Color' },
  rating: { 'zh-CN': '评分', 'en-US': 'Rating' },
  age: { 'zh-CN': '年龄', 'en-US': 'Age' },
  date: { 'zh-CN': '日期', 'en-US': 'Date' },
  boolean: { 'zh-CN': '布尔', 'en-US': 'Boolean' },
  number: { 'zh-CN': '数字', 'en-US': 'Number' },
  sequence: { 'zh-CN': '序列递增', 'en-US': 'Sequence' },
  random: { 'zh-CN': '随机字符串', 'en-US': 'Random String' },
  nullify: { 'zh-CN': '清空值', 'en-US': 'Clear Value' },
  '$timestamp': { 'zh-CN': '时间戳 (ms)', 'en-US': 'Timestamp (ms)' },
  '$date': { 'zh-CN': '当前日期', 'en-US': 'Current Date' },
  '$time': { 'zh-CN': '当前时间', 'en-US': 'Current Time' },
  '$datetime': { 'zh-CN': 'ISO 日期时间', 'en-US': 'ISO DateTime' },
  '$randomInt': { 'zh-CN': '随机整数', 'en-US': 'Random Integer' },
  '$randomFloat': { 'zh-CN': '随机浮点数', 'en-US': 'Random Float' },
  '$seq': { 'zh-CN': '序列号', 'en-US': 'Sequence' },
};

export const getGenTypeLabel = (type: FieldGenType, locale: MockLocale = 'zh-CN'): string => {
  return GEN_TYPE_LABELS[type]?.[locale] || GEN_TYPE_LABELS[type]?.['zh-CN'] || type;
};

export const getAllGenTypes = (): FieldGenType[] => {
  return ['auto', 'name', 'email', 'phone', 'city', 'country', 'company', 'price', 'address', 'avatar', 'uuid', 'url', 'ipv4', 'ipv6', 'lat', 'lng', 'zip', 'color', 'rating', 'age', 'date', 'boolean', 'number', 'sequence', 'random', 'nullify', '$timestamp', '$date', '$time', '$datetime', '$randomInt', '$randomFloat', '$seq'];
};

// ============================================================================
// Data Pool - Unified with Backend (src-tauri/src/lib.rs MOCK_DATA_POOL)
// Frontend no longer maintains its own data pools for consistency.
// All value generation is delegated to backend via generateMockValue IPC call.
// ============================================================================

// ============================================================================
// Helper Functions
// ============================================================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ============================================================================
// Core Generation Function
// ============================================================================

/**
 * Format to rule mapping (for schema.format priority)
 */
const FORMAT_TO_RULE: Record<string, FieldGenType> = {
  'email': 'email',
  'uri': 'url',
  'url': 'url',
  'date-time': 'date',
  'date': 'date',
  'time': 'date',
  'uuid': 'uuid',
  'ipv4': 'ipv4',
  'ipv6': 'ipv6',
};

/**
 * Generate value by rule type via backend (unified generation)
 *
 * 各司其职：Frontend 只做 Schema 分析和约束处理，所有值生成委托给后端
 *
 * @param rule - The rule type to generate
 * @param index - Index for sequence generation
 * @param locale - Locale for data pool selection
 * @param schema - Optional schema for type-specific constraints (e.g., minimum/maximum for numbers)
 */
async function generateByRule(
  rule: FieldGenType,
  index = 0,
  locale: MockLocale = 'en-US',
  schema?: Record<string, any>,
  skipFieldNameDetection = false
): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core');

  // Dynamic types - handled by generateDynamicValue (backend)
  if (isDynamicType(rule)) {
    return generateDynamicValue(rule, index);
  }

  // All types - delegate to backend (唯一数据源) with full schema
  const result = await invoke<string>('generate_mock_from_schema', {
    schema: schema || {},
    locale: locale,
    skip_field_name_detection: skipFieldNameDetection,
  });
  return result;
}

// Types that require backend generation
const DYNAMIC_TYPES: FieldGenType[] = ['$timestamp', '$date', '$time', '$datetime', '$randomInt', '$randomFloat', '$seq'];

/**
 * Check if a rule type requires backend generation
 */
function isDynamicType(rule: FieldGenType): boolean {
  return DYNAMIC_TYPES.includes(rule);
}

/**
 * Generate dynamic value via backend (async)
 */
async function generateDynamicValue(rule: FieldGenType, index = 0): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core');

  switch (rule) {
    case '$timestamp': {
      const result = await invoke<{ unix_ms: number; datetime: string; date: string; time: string }>('generate_timestamp');
      return result.unix_ms;
    }
    case '$date': {
      const result = await invoke<{ unix_ms: number; datetime: string; date: string; time: string }>('generate_timestamp');
      return result.date;
    }
    case '$time': {
      const result = await invoke<{ unix_ms: number; datetime: string; date: string; time: string }>('generate_timestamp');
      return result.time;
    }
    case '$datetime': {
      const result = await invoke<{ unix_ms: number; datetime: string; date: string; time: string }>('generate_timestamp');
      return result.datetime;
    }
    case '$randomInt': {
      const result = await invoke<{ value: number }>('generate_random_int', { min: null, max: null });
      return result.value;
    }
    case '$randomFloat': {
      const result = await invoke<{ value: number }>('generate_random_float', { min: null, max: null, decimals: null });
      return result.value;
    }
    case '$seq': {
      const result = await invoke<{ value: string; index: number }>('generate_sequence', { prefix: null, index: index + 1, padding: null });
      return result.value;
    }
    default:
      return null;
  }
}

/**
 * Custom field rule for user-defined patterns
 */
interface CustomFieldRule {
  pattern: string;  // regex pattern
  fieldType: FieldGenType;
  enabled: boolean;
}

/**
 * Match field name to rule type
 * Filters by enabledRules if provided
 * Custom rules are checked first before built-in rules
 *
 * Priority: custom rules (user-defined) > built-in rules
 */
export function matchFieldNameToRule(name: string, enabledRules?: FieldGenType[], customRules?: CustomFieldRule[]): FieldGenType | null {
  // First, check custom user-defined rules (highest priority)
  if (customRules && customRules.length > 0) {
    for (const rule of customRules) {
      if (!rule.enabled) continue;
      if (enabledRules && !enabledRules.includes(rule.fieldType)) continue;
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(name)) {
          return rule.fieldType;
        }
      } catch {
        // Invalid regex, skip this rule
        continue;
      }
    }
  }

  // Order matters! More specific patterns must come first
  const rules: [string[], FieldGenType][] = [
    // Boolean patterns (prefix-based, highest priority)
    [['is_'], 'boolean'],
    [['has_'], 'boolean'],
    [['can_'], 'boolean'],
    [['should_'], 'boolean'],
    [['_flag'], 'boolean'],
    [['_enabled'], 'boolean'],
    [['_active'], 'boolean'],
    [['_locked'], 'boolean'],
    [['_visible'], 'boolean'],
    [['_deleted'], 'boolean'],
    [['_verified'], 'boolean'],

    // Datetime patterns (suffix-based)
    [['_at'], 'date'],
    [['_time'], 'date'],
    [['_date'], 'date'],
    [['created_at'], 'date'],
    [['updated_at'], 'date'],
    [['deleted_at'], 'date'],
    [['last_login'], 'date'],
    [['last_activity'], 'date'],
    [['last_modified'], 'date'],
    [['expires_at'], 'date'],
    [['start_date'], 'date'],
    [['end_date'], 'date'],
    [['birth'], 'date'],
    [['birthday'], 'date'],

    // Counter/numeric patterns (suffix-based)
    [['_count'], 'number'],
    [['_total'], 'number'],
    [['_num'], 'number'],
    [['_size'], 'number'],
    [['_length'], 'number'],
    [['_index'], 'number'],
    [['_qty'], 'number'],
    [['_quantity'], 'number'],
    [['_limit'], 'number'],
    [['_offset'], 'number'],
    [['_page'], 'number'],
    [['_per_page'], 'number'],
    [['_pages'], 'number'],
    [['_height'], 'number'],
    [['_width'], 'number'],
    [['_weight'], 'number'],
    [['_price'], 'price'],
    [['_cost'], 'price'],
    [['_amount'], 'price'],
    [['_fee'], 'price'],
    [['_tax'], 'price'],
    [['_discount'], 'price'],

    // ID patterns (expanded)
    [['_id'], 'uuid'],
    [['_ids'], 'uuid'],
    [['user_id'], 'uuid'],
    [['order_id'], 'uuid'],
    [['product_id'], 'uuid'],
    [['category_id'], 'uuid'],
    [['session_id'], 'uuid'],
    [['transaction_id'], 'uuid'],
    [['guid', 'uid'], 'uuid'],
    [['id'], 'uuid'],

    // Status/category patterns
    [['status'], 'name'],
    [['state'], 'name'],
    [['_type'], 'name'],
    [['category'], 'name'],
    [['role'], 'name'],
    [['priority'], 'name'],
    [['level'], 'name'],
    [['gender'], 'name'],
    [['locale'], 'name'],
    [['language'], 'name'],
    [['timezone'], 'name'],

    // File patterns
    [['filename'], 'name'],
    [['filepath'], 'name'],
    [['file_path'], 'name'],
    [['file_name'], 'name'],
    [['mime_type'], 'name'],
    [['file_type'], 'name'],
    [['extension'], 'name'],
    [['media_type'], 'name'],

    // Password/secret patterns
    [['password'], 'random'],
    [['secret'], 'random'],
    [['token'], 'random'],
    [['api_key'], 'random'],
    [['api-key'], 'random'],
    [['private_key'], 'random'],
    [['public_key'], 'random'],
    [['access_token'], 'random'],
    [['refresh_token'], 'random'],
    [['client_secret'], 'random'],

    // Currency patterns
    [['currency'], 'name'],

    // Network patterns
    [['ip', 'ipv4'], 'ipv4'],
    [['ipv6'], 'ipv6'],
    [['ip_address'], 'ipv4'],
    [['host'], 'name'],
    [['port'], 'number'],
    [['domain'], 'name'],
    [['subdomain'], 'name'],
    [['protocol'], 'name'],
    [['path'], 'name'],

    // Contact patterns (high priority exact matches)
    [['email'], 'email'],
    [['phone', 'tel', 'mobile'], 'phone'],

    // User patterns
    [['name', 'first', 'last', 'user', 'username'], 'name'],
    [['first_name'], 'name'],
    [['last_name'], 'name'],
    [['full_name'], 'name'],
    [['display_name'], 'name'],
    [['nickname'], 'name'],
    [['avatar'], 'avatar'],
    [['profile'], 'avatar'],
    [['photo'], 'avatar'],
    [['image'], 'avatar'],
    [['thumbnail'], 'avatar'],
    [['icon'], 'avatar'],

    // Location patterns
    [['city'], 'city'],
    [['location'], 'city'],
    [['address'], 'address'],
    [['street'], 'address'],
    [['zip'], 'zip'],
    [['postal'], 'zip'],
    [['country'], 'country'],
    [['province'], 'city'],
    [['state'], 'city'],
    [['region'], 'city'],
    [['latitude'], 'lat'],
    [['lat'], 'lat'],
    [['longitude'], 'lng'],
    [['lng'], 'lng'],
    [['coordinate'], 'lat'],

    // Company patterns
    [['company'], 'company'],
    [['organization'], 'company'],
    [['org'], 'company'],
    [['business'], 'company'],
    [['brand'], 'company'],

    // Content patterns
    [['title'], 'name'],
    [['heading'], 'name'],
    [['subject'], 'name'],
    [['description'], 'name'],
    [['summary'], 'name'],
    [['bio'], 'name'],
    [['about'], 'name'],
    [['content'], 'name'],
    [['body'], 'name'],
    [['text'], 'name'],
    [['message'], 'name'],
    [['comment'], 'name'],
    [['note'], 'name'],
    [['memo'], 'name'],
    [['html'], 'name'],
    [['content'], 'name'],

    // URL patterns
    [['url', 'link', 'website', 'uri'], 'url'],
    [['href'], 'url'],
    [['src'], 'url'],
    [['src_url'], 'url'],
    [['image_url'], 'url'],
    [['avatar_url'], 'url'],
    [['logo'], 'avatar'],

    // Other patterns
    [['color'], 'color'],
    [['rating', 'score'], 'rating'],
    [['age'], 'age'],
    [['price', 'amount', 'cost'], 'price'],
    [['quantity'], 'number'],
    [['order'], 'number'],
    [['version'], 'name'],
    [['code'], 'name'],
    [['key'], 'name'],
    // Generic data patterns (fallback to 'name' for string content)
    [['data'], 'name'],
    [['value'], 'name'],
    [['item'], 'name'],
    [['result'], 'name'],
    [['response'], 'name'],
    [['request'], 'name'],
    [['info'], 'name'],
    [['details'], 'name'],
    [['settings'], 'name'],
    [['config'], 'name'],
    [['options'], 'name'],
    [['params'], 'name'],
    [['query'], 'name'],
    [['record'], 'name'],
    [['entry'], 'name'],
    [['object'], 'name'],
    [['payload'], 'name'],
  ];

  for (const [keywords, rule] of rules) {
    if (enabledRules && !enabledRules.includes(rule)) continue;
    if (keywords.some(k => name.includes(k))) return rule;
  }

  return null;
}

// Emoji mapping for type indicators
const RULE_TO_EMOJI: Record<FieldGenType, string> = {
  auto: '🎯',
  name: '👤',
  email: '📧',
  phone: '📞',
  city: '🏙️',
  country: '🌍',
  company: '🏢',
  price: '💰',
  address: '📍',
  avatar: '🖼️',
  uuid: '🎫',
  url: '🔗',
  ipv4: '🌐',
  ipv6: '🌐',
  lat: '📍',
  lng: '📍',
  zip: '📮',
  color: '🎨',
  rating: '⭐',
  age: '🎂',
  date: '📅',
  boolean: '✅',
  number: '🔢',
  sequence: '🔢',
  random: '🎲',
  nullify: '🗑️',
  '$timestamp': '⏱️',
  '$date': '📅',
  '$time': '🕐',
  '$datetime': '📅',
  '$randomInt': '🎲',
  '$randomFloat': '🎲',
  '$seq': '🔢',
};

export const getGenTypeEmoji = (type: FieldGenType): string => {
  return RULE_TO_EMOJI[type] || '📋';
};

export interface DetectedFieldType {
  rule: FieldGenType | null;
  emoji: string;
  label: string;
}

/**
 * Detect field type from field name using the same logic as mock generation.
 * Returns rule, emoji, and localized label.
 */
export function detectFieldType(fieldName: string, locale: MockLocale = 'zh-CN'): DetectedFieldType {
  const rule = matchFieldNameToRule(fieldName.toLowerCase());
  const emoji = rule ? RULE_TO_EMOJI[rule] : '📋';
  const label = rule ? getGenTypeLabel(rule, locale) : '未知';
  return { rule, emoji, label };
}

/**
 * Generate mock data for a single schema property
 *
 * Priority:
 * 1. explicitRule - user selected specific rule (from FieldEditor)
 * 2. enum/default/example/const - schema metadata
 * 3. schema.format - exact format match (highest)
 * 4. field name - smart detection fallback
 * 5. schema.type - last resort for non-string types
 * 6. random - final fallback
 *
 * All value generation is delegated to backend for consistency.
 */
export async function generateMockValue(schema: Record<string, any>, options: MockOptions = {}): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core');
  const random = options.seed ? seededRandom(options.seed) : Math.random;
  const enabledRules = options.enabledRules;
  const locale = options.locale || 'en-US';

  // 1. User explicitly selected a rule (from FieldEditor)
  if (options.explicitRule && options.explicitRule !== 'auto') {
    if (isDynamicType(options.explicitRule)) {
      return generateDynamicValue(options.explicitRule, options.index || 0);
    }
    // User explicitly selected rule - skip field name detection
    return generateByRule(options.explicitRule, options.index || 0, locale, schema, true);
  }

  // 2. Schema metadata (enum, default, example, const)
  if (schema.enum?.length) return schema.enum[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.example !== undefined) return schema.example;
  if (schema.const !== undefined) return schema.const;

  // 3. Schema format (highest priority for type-specific generation)
  if (schema.format && FORMAT_TO_RULE[schema.format]) {
    const formatRule = FORMAT_TO_RULE[schema.format];
    if (isDynamicType(formatRule)) {
      return generateDynamicValue(formatRule, options.index || 0);
    }
    // Format is explicit - skip field name detection
    return generateByRule(formatRule, options.index || 0, locale, schema, true);
  }

  // 4. Field name matching (main fallback, respects enabledRules)
  // Skip if user explicitly set the type (paramTypeModified)
  const name = (schema.name || schema.title || '').toLowerCase();
  if (name && !options.skipFieldNameDetection) {
    const smartEnabled = options.smartDetectionEnabled !== false;
    if (smartEnabled) {
      const nameRule = matchFieldNameToRule(name, enabledRules, options.fieldRules);
      if (nameRule) {
        if (isDynamicType(nameRule)) {
          return generateDynamicValue(nameRule, options.index || 0);
        }
        return generateByRule(nameRule, options.index || 0, locale, schema);
      }
    }
  }

  // 5. Schema type (last resort for non-string types)
  const type = schema.type;
  // Handle OpenAPI nullable types like ["string", "null"]
  const normalizedType = Array.isArray(type) ? type.find(t => t !== 'null') : type;
  // If type is null, undefined, or empty string, try to infer from schema.items
  if (!normalizedType && schema.items) {
    return generateMockValue(schema.items, options);
  }
  if (normalizedType === 'number' || normalizedType === 'integer') {
    // Use backend for number generation (respects skipFieldNameDetection)
    return generateByRule('number', options.index || 0, locale, schema, options.skipFieldNameDetection);
  }
  if (normalizedType === 'boolean') {
    // Use backend for boolean generation (respects skipFieldNameDetection)
    return generateByRule('boolean', options.index || 0, locale, schema, options.skipFieldNameDetection);
  }
  if (normalizedType === 'string') {
    // String type - pass schema to backend for smart generation based on type/format
    return invoke<string>('generate_mock_from_schema', {
      schema: schema,
      locale: locale,
      skip_field_name_detection: options.skipFieldNameDetection,
    });
  }
  if (normalizedType === 'array') {
    const minItems = schema.minItems || 1;
    const maxItems = schema.maxItems || 3;
    const itemCount = Math.min(minItems + Math.floor(random() * (maxItems - minItems + 1)), 10);
    if (!schema.items) return Array(itemCount).fill(null);
    const items: unknown[] = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(await generateMockValue(schema.items, options));
    }
    return items;
  }
  if (normalizedType === 'object') {
    if (!schema.properties) return {};
    const result: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (schema.required?.includes(key)) {
        result[key] = await generateMockValue(propSchema as Record<string, any>, options);
      } else if (random() > 0.3) {
        result[key] = await generateMockValue(propSchema as Record<string, any>, options);
      }
    }
    return result;
  }

  // 6. Final fallback - call backend for random
  return generateByRule('random', options.index || 0, locale);
}

/**
 * Generate mock request body from OpenAPI schema
 */
export async function generateMockBody(schema: Record<string, any> | undefined, options: MockOptions = {}): Promise<string> {
  if (!schema) return '';

  if (schema.example !== undefined) {
    return typeof schema.example === 'string' ? schema.example : JSON.stringify(schema.example, null, 2);
  }

  if (schema.properties) {
    const obj: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (schema.required?.includes(key)) {
        obj[key] = await generateMockValue(propSchema as Record<string, any>, options);
      } else {
        obj[key] = await generateMockValue(propSchema as Record<string, any>, options);
      }
    }
    return JSON.stringify(obj, null, 2);
  }

  if (schema.type === 'array' && schema.items?.properties) {
    const item = schema.items;
    const obj: Record<string, unknown> = {};
    for (const [key, propSchema] of Object.entries(item.properties)) {
      obj[key] = await generateMockValue(propSchema as Record<string, any>, options);
    }
    return JSON.stringify([obj], null, 2);
  }

  return '';
}

/**
 * Generate mock parameters from OpenAPI parameter array
 */
export async function generateMockParams(params: Array<{ name: string; schema?: Record<string, any>; example?: any; required?: boolean }>, options: MockOptions = {}): Promise<Array<{ key: string; value: string; enabled: boolean }>> {
  const results = await Promise.all(params.map(async p => ({
    key: p.name,
    value: p.example !== undefined ? String(p.example) : (p.schema ? String(await generateMockValue(p.schema, options)) : ''),
    enabled: p.required === true,
  })));
  return results;
}

/**
 * Generate preview value for FieldEditor
 */
export async function generateFieldPreview(
  fieldName: string,
  genType: FieldGenType,
  index: number,
  options: MockOptions = {}
): Promise<string> {
  // Handle special cases
  if (genType === 'nullify') return '';
  if (genType === 'sequence') return `${fieldName}_${String(index + 1).padStart(3, '0')}`;
  if (genType === 'random') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < DEFAULT_RANDOM_STRING_LENGTH; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    return `${fieldName}_${r}`;
  }

  // If auto, let generateMockValue do smart detection
  // If explicit rule, pass it via options.explicitRule
  const mockOptions: MockOptions = {
    ...options,
    index,
  };

  if (genType !== 'auto') {
    mockOptions.explicitRule = genType;
    mockOptions.smartDetectionEnabled = false; // Skip smart detection when explicit rule is set
  }

  const schema = { name: fieldName };
  const result = await generateMockValue(schema, mockOptions);
  return typeof result === 'object' ? JSON.stringify(result) : String(result ?? '');
}

// ============================================================================
// Simple GenerateByRule - Exported for use by dynamicMockService
// Delegates to backend for unified generation (no local data pools)
// ============================================================================

/**
 * Generate mock value via backend (async)
 * For dynamicMockService.ts which orchestrates dynamic mock execution
 * Rule is explicitly specified, so skip field name detection
 */
export async function generateByRuleFromMock(rule: FieldGenType, locale: MockLocale = 'en-US'): Promise<unknown> {
  return generateByRule(rule, 0, locale, undefined, true);
}