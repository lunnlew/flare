/**
 * Extracts nested field paths from an object up to a maximum depth.
 * Useful for generating autocomplete suggestions for nested data structures.
 */
export function extractNestedFields(
  obj: unknown,
  prefix: string = "",
  maxDepth: number = 3
): string[] {
  if (!obj || typeof obj !== "object") return [];
  if (maxDepth <= 0) return [];

  const fields: string[] = [];

  if (Array.isArray(obj)) {
    // Array: extract indices and nested fields of elements
    for (let i = 0; i < Math.min(obj.length, 10); i++) {
      const indexPath = `${i}`;
      const fullPath = prefix ? `${prefix}.${indexPath}` : indexPath;
      fields.push(fullPath);

      // Recursively extract nested fields from array elements
      if (obj[i] && typeof obj[i] === "object") {
        const nestedFromArray = extractNestedFields(obj[i], fullPath, maxDepth - 1);
        fields.push(...nestedFromArray);
      }
    }
  } else {
    // Object: extract keys and nested fields
    for (const key of Object.keys(obj)) {
      const cleanPrefix = prefix.replace(/\.$/, "");
      const fullPath = cleanPrefix ? `${cleanPrefix}.${key}` : key;
      fields.push(fullPath);

      const value = (obj as Record<string, unknown>)[key];
      if (value && typeof value === "object") {
        fields.push(...extractNestedFields(value, fullPath, maxDepth - 1));
      }
    }
  }

  return fields;
}

interface KeyValue {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * Convert an array of KeyValue items to a Record object.
 * Filters out disabled items and items with empty keys.
 */
export function keyValueToRecord(items: KeyValue[]): Record<string, string> {
  return items
    .filter(item => item.enabled && item.key.trim())
    .reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {} as Record<string, string>);
}

/**
 * Convert an array of KeyValue items to a URL search params string.
 */
export function keyValueToQueryString(items: KeyValue[]): string {
  return items
    .filter(item => item.enabled && item.key.trim())
    .map(item => `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`)
    .join("&");
}