// HTTP-related types
export interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
  locked?: boolean;
  description?: string;
  isFile?: boolean;
  file?: File | null;
  required?: boolean; // from protocol schema
  paramType?: 'string' | 'number' | 'boolean' | 'array'; // parameter type for validation and conversion
  paramTypeModified?: boolean; // true if user explicitly changed paramType
}

// Validate and convert param value based on type
export function convertParamValue(value: string, type: KeyValue['paramType']): string {
  if (!type || type === 'string') return value;
  return value;
}

// Get display type label
export function getParamTypeLabel(type: KeyValue['paramType']): string {
  switch (type) {
    case 'number': return '数字';
    case 'boolean': return '布尔';
    case 'array': return '数组';
    default: return '字符串';
  }
}