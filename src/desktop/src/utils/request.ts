import type { KeyValue } from '../constants/http';
import { generateMockValue as mockGenerateMockValue, type FieldGenType } from './mock';
import type { MockLocale } from '../store/mockStore';

/**
 * Clear all unlocked key-value items while preserving locked ones.
 * Required items stay enabled, optional items are disabled after reset.
 */
export function clearKeyValueItems(items: KeyValue[]): KeyValue[] {
  return items.map(p => p.locked ? p : { ...p, value: "", enabled: p.required === true });
}

interface SmartGenerateOptions {
  locale: MockLocale;
  smartDetectionEnabled: boolean;
  enabledRules: FieldGenType[];
  // Optional schema map for field types (fieldName -> JSON Schema)
  schemaMap?: Record<string, Record<string, unknown>>;
}

/**
 * Smart generate values for key-value items based on field names.
 * Used by ParamsPanel, BodyPanel (form-data and urlencoded).
 *
 * Priority:
 * 1. User manually set paramType (p.paramType && p.paramTypeModified) - highest priority
 * 2. OpenAPI schema (schemaMap[p.key])
 * 3. Field name detection (smartDetectionEnabled)
 * 4. Random fallback
 */
export async function smartGenerateForKeyValue(
  items: KeyValue[],
  setItems: (items: KeyValue[]) => void,
  options: SmartGenerateOptions
): Promise<void> {
  const enabledRules = options.enabledRules;
  const schemaMap = options.schemaMap || {};
  const filled = await Promise.all(items.map(async (p) => {
    if (p.key.trim()) {
      // Build effective schema: user override > schemaMap > field name detection
      let effectiveSchema: Record<string, unknown> = {};

      // Priority 1: User explicitly modified paramType (highest priority)
      // paramTypeModified flag is set when user changes paramType via dropdown
      if (p.paramTypeModified && p.paramType) {
        effectiveSchema = {
          type: p.paramType,
          name: p.key,
        };
      } else {
        // Priority 2: OpenAPI schema from endpoint definition
        const fieldSchema = schemaMap[p.key] || {};
        effectiveSchema = { ...fieldSchema, name: p.key };
      }

      const mockValue = await mockGenerateMockValue(
        effectiveSchema as any,
        {
          locale: options.locale,
          smartDetectionEnabled: options.smartDetectionEnabled,
          enabledRules,
          // Skip field name detection when user explicitly set the type
          skipFieldNameDetection: p.paramTypeModified,
        }
      );
      const displayValue = typeof mockValue === 'object' ? JSON.stringify(mockValue) : String(mockValue ?? '');
      return { ...p, value: displayValue || `${p.key}_sample` };
    }
    return p;
  }));
  setItems(filled);
}