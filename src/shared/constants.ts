// Shared constants for Flare project

export const CAPTURE_WS_URL = 'ws://localhost:7890';

/**
 * Check if a regex pattern is potentially unsafe (catastrophic backtracking)
 * Uses simple string contains checks to avoid regex quantifier issues in detection
 */
export function isUnsafeRegex(pattern: string): boolean {
  // Check for nested quantifiers like (a+)+ or (a*)* - common ReDoS patterns
  if (pattern.includes('(+') || pattern.includes('*)') ||
      pattern.includes(')+') || pattern.includes(')*')) {
    const nestedQuantifier = pattern.includes('(+') && pattern.includes(')+');
    const nestedStar = pattern.includes('*)') && pattern.includes(')*');
    if (nestedQuantifier || nestedStar) return true;
  }
  // Check for lookahead/lookbehind with quantifiers
  if ((pattern.includes('(?=') || pattern.includes('(?!') || pattern.includes('(?<=') || pattern.includes('(?<!')) &&
      (pattern.includes('+') || pattern.includes('*'))) {
    return true;
  }
  return false;
}