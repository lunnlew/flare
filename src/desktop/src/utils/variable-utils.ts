/**
 * Variable Utilities - Variable reference tracking and undefined variable detection
 *
 * Provides functionality for:
 * 1. Extracting variable references from text ({{variable}} syntax)
 * 2. Detecting undefined variables
 * 3. Variable reference tracking across requests
 */

export interface VariableReference {
  name: string;        // Variable name (e.g., "baseUrl" from "{{baseUrl}}")
  fullMatch: string;   // Full match (e.g., "{{baseUrl}}")
  startIndex: number;  // Start position in text
  endIndex: number;    // End position in text
  prefix?: 'global' | 'env' | 'workflow' | 'node';  // Variable type prefix if present
}

export interface UndefinedVariable {
  name: string;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
  context: string;  // Surrounding text for context
}

export interface VariableReferenceResult {
  references: VariableReference[];
  undefinedVariables: UndefinedVariable[];
}

/**
 * Extract all variable references from text
 * Handles: {{var}}, {{global.var}}, {{env.var}}, {{workflow.var}}, {{nodeId.response}}
 */
export function extractVariableReferences(text: string): VariableReference[] {
  const references: VariableReference[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const varName = match[1].trim();

    // Determine prefix type
    let prefix: VariableReference['prefix'];
    if (varName.startsWith('global.')) {
      prefix = 'global';
    } else if (varName.startsWith('env.')) {
      prefix = 'env';
    } else if (varName.startsWith('workflow.')) {
      prefix = 'workflow';
    } else if (varName.includes('.') && /^[a-zA-Z0-9_-]+\./.test(varName)) {
      // Likely a node output reference like "node123.response"
      prefix = 'node';
    }

    references.push({
      name: varName,
      fullMatch,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
      prefix,
    });
  }

  return references;
}

/**
 * Extract only the variable names (without prefix) for lookup
 */
export function extractVariableNames(text: string): string[] {
  const refs = extractVariableReferences(text);
  return refs.map(r => {
    // Remove prefix if present
    const parts = r.name.split('.');
    return parts[parts.length - 1];
  });
}

/**
 * Check for undefined variables in text
 * @param text - Text containing variable references
 * @param definedVariables - Set of defined variable names (from current environment)
 * @param globalVariables - Set of global variable names (optional)
 * @returns List of undefined variables with context
 */
export function findUndefinedVariables(
  text: string,
  definedVariables: Set<string>,
  globalVariables?: Set<string>
): UndefinedVariable[] {
  const references = extractVariableReferences(text);
  const undefinedVars: UndefinedVariable[] = [];

  for (const ref of references) {
    // Skip node output references (they have different resolution)
    if (ref.prefix === 'node') continue;

    // For prefixed variables, check the full name
    const simpleName = ref.name.replace(/^(global|env|workflow)\./, '');

    // Determine which set to check based on prefix
    const isDefined = ref.prefix === 'global'
      ? (globalVariables?.has(simpleName) ?? false)
      : ref.prefix
        ? definedVariables.has(ref.name)  // For env/workflow, check full name
        : definedVariables.has(simpleName);

    if (!isDefined) {
      // Provide context around the variable
      const contextStart = Math.max(0, ref.startIndex - 20);
      const contextEnd = Math.min(text.length, ref.endIndex + 20);
      const context = text.substring(contextStart, contextEnd);

      undefinedVars.push({
        name: ref.name,
        fullMatch: ref.fullMatch,
        startIndex: ref.startIndex,
        endIndex: ref.endIndex,
        context: (contextStart > 0 ? '...' : '') + context + (contextEnd < text.length ? '...' : ''),
      });
    }
  }

  return undefinedVars;
}

/**
 * Validate variable syntax
 * @returns true if variable name is valid
 */
export function isValidVariableName(name: string): boolean {
  // Allow: global.var, env.var, workflow.var, or simple names
  const validPattern = /^(global|env|workflow)\.[a-zA-Z_][a-zA-Z0-9_]*$/;
  const simplePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return validPattern.test(name) || simplePattern.test(name);
}

/**
 * Get all unique variable names from multiple texts
 * Useful for tracking all variables used in a request
 */
export function getAllVariableReferences(texts: string[]): Map<string, VariableReference[]> {
  const varMap = new Map<string, VariableReference[]>();

  for (const text of texts) {
    const refs = extractVariableReferences(text);
    for (const ref of refs) {
      const existing = varMap.get(ref.name) || [];
      existing.push(ref);
      varMap.set(ref.name, existing);
    }
  }

  return varMap;
}

/**
 * Replace undefined variables with warning markers
 * Used for visual indication in UI
 */
export function markUndefinedVariables(
  text: string,
  undefinedVariables: UndefinedVariable[]
): string {
  if (undefinedVariables.length === 0) return text;

  // Sort by startIndex in reverse order to preserve indices
  const sorted = [...undefinedVariables].sort((a, b) => b.startIndex - a.startIndex);

  let result = text;
  for (const uv of sorted) {
    const before = result.substring(0, uv.startIndex);
    const after = result.substring(uv.endIndex);
    result = `${before}{{${uv.name}?}}${after}`;
  }

  return result;
}

/**
 * Count total variable references in text
 */
export function countVariables(text: string): number {
  const regex = /\{\{([^}]+)\}\}/g;
  let count = 0;
  while (regex.exec(text) !== null) {
    count++;
  }
  return count;
}

/**
 * Get variable usage summary for a collection of requests
 */
export interface VariableUsageSummary {
  variableName: string;
  usageCount: number;
  locations: { requestId: string; field: string }[];
}

export function summarizeVariableUsage(
  requests: Array<{ id: string; fields: Record<string, string> }>
): VariableUsageSummary[] {
  const summaryMap = new Map<string, VariableUsageSummary>();

  for (const req of requests) {
    for (const [field, value] of Object.entries(req.fields)) {
      const refs = extractVariableReferences(value);
      for (const ref of refs) {
        const existing = summaryMap.get(ref.name);
        if (existing) {
          existing.usageCount++;
          existing.locations.push({ requestId: req.id, field });
        } else {
          summaryMap.set(ref.name, {
            variableName: ref.name,
            usageCount: 1,
            locations: [{ requestId: req.id, field }],
          });
        }
      }
    }
  }

  return Array.from(summaryMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}