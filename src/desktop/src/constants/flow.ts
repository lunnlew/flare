/**
 * Flow node output field definitions.
 * Defines the output fields available for each node type.
 */
export const NODE_OUTPUT_FIELDS: Record<string, string[]> = {
  apiCall: ["response", "statusCode", "headers", "executionTime", "error"],
  auth: ["headers", "token", "error"],
  condition: ["result", "branch", "error"],
  loop: ["currentIteration", "iterations", "outputs", "error"],
  transform: ["output", "original", "error"],
  assert: ["passed", "results", "error"],
  delay: ["completed", "error"],
  log: ["logged", "error"],
  script: ["result", "error"],
};