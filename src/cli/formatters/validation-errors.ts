/**
 * Validation Error Formatter
 *
 * Transforms cryptic JSON Schema errors into actionable guidance.
 *
 * @module ubml/cli/formatters/validation-errors
 */

import type { ErrorObject } from 'ajv';

/**
 * Format a validation error with helpful context and suggestions.
 */
export function formatValidationError(error: ErrorObject, schema?: any): string {
  switch (error.keyword) {
    case 'additionalProperties':
      return formatAdditionalPropertiesError(error, schema);
    
    case 'enum':
      return formatEnumError(error, schema);
    
    case 'pattern':
      return formatPatternError(error, schema);
    
    case 'required':
      return formatRequiredError(error, schema);
    
    case 'type':
      return formatTypeError(error, schema);
    
    default:
      return error.message || 'Validation error';
  }
}

/**
 * Format "additional properties not allowed" errors.
 */
function formatAdditionalPropertiesError(error: ErrorObject, schema?: any): string {
  const invalidProp = error.params.additionalProperty as string;
  
  if (!schema?.properties) {
    return `Unknown property: "${invalidProp}"`;
  }
  
  const validProps = Object.keys(schema.properties);
  const suggestion = findClosestMatch(invalidProp, validProps);
  
  let message = `Unknown property: "${invalidProp}"\n`;
  
  if (suggestion && levenshtein(invalidProp, suggestion) <= 2) {
    message += `\nDid you mean: "${suggestion}"?\n`;
  }
  
  // Check if this looks like a RACI property
  if (['responsible', 'accountable', 'consulted', 'informed'].includes(invalidProp)) {
    message += `\nDid you mean to put this inside 'raci'?\n`;
    message += `  raci:\n`;
    message += `    ${invalidProp}: [AC001]\n`;
  }
  
  message += `\nValid properties: ${validProps.slice(0, 10).join(', ')}`;
  if (validProps.length > 10) {
    message += `, ... (${validProps.length - 10} more)`;
  }
  
  return message;
}

/**
 * Format enum validation errors.
 */
function formatEnumError(error: ErrorObject, schema?: any): string {
  const allowedValues = error.params.allowedValues as string[];
  const actualValue = error.data;
  
  let message = `Invalid enum value: "${actualValue}"\n`;
  message += `\nAllowed values: ${allowedValues.join(', ')}\n`;
  
  if (typeof actualValue === 'string') {
    const closest = findClosestMatch(actualValue, allowedValues);
    if (closest && levenshtein(actualValue, closest) <= 2) {
      message += `\nDid you mean: "${closest}"?`;
    }
  }
  
  return message;
}

/**
 * Format pattern validation errors.
 */
function formatPatternError(error: ErrorObject, schema?: any): string {
  const pattern = error.params.pattern as string;
  const value = error.data;
  
  // Map common patterns to human-readable descriptions
  const hints: Record<string, string> = {
    '^[A-Z]{2}\\d{3,}$': 'Format: Two uppercase letters + 3+ digits (e.g., AC001, ST010)',
    '^AC\\d{3,}$': 'Format: AC + 3+ digits (e.g., AC001, AC010, AC100)',
    '^ST\\d{3,}$': 'Format: ST + 3+ digits (e.g., ST001, ST010, ST100)',
    '^PR\\d{3,}$': 'Format: PR + 3+ digits (e.g., PR001, PR010, PR100)',
    '^EN\\d{3,}$': 'Format: EN + 3+ digits (e.g., EN001, EN010, EN100)',
    '^[0-9]+(\\.[0-9]+)?(min|h|d|wk|mo)$': 'Format: Number + unit (e.g., 30min, 2h, 1.5d)',
  };
  
  const hint = hints[pattern] || `Must match pattern: ${pattern}`;
  const examples = schema?.examples || [];
  
  let message = `Invalid format: "${value}"\n\n${hint}`;
  
  if (examples.length > 0) {
    message += `\n\nExamples: ${examples.slice(0, 3).map((ex: any) => 
      typeof ex === 'string' ? `"${ex}"` : JSON.stringify(ex)
    ).join(', ')}`;
  }
  
  return message;
}

/**
 * Format required property errors.
 */
function formatRequiredError(error: ErrorObject, schema?: any): string {
  const missingProp = error.params.missingProperty as string;
  return `Missing required property: "${missingProp}"`;
}

/**
 * Format type mismatch errors.
 */
function formatTypeError(error: ErrorObject, schema?: any): string {
  const expectedType = error.params.type as string;
  const actualValue = error.data;
  const actualType = typeof actualValue;
  
  return `Type mismatch: expected ${expectedType}, got ${actualType}`;
}

/**
 * Find the closest matching string using Levenshtein distance.
 */
function findClosestMatch(input: string, options: string[]): string {
  if (options.length === 0) return '';
  
  let closest = options[0];
  let minDistance = levenshtein(input.toLowerCase(), options[0].toLowerCase());
  
  for (const option of options.slice(1)) {
    const distance = levenshtein(input.toLowerCase(), option.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closest = option;
    }
  }
  
  return closest;
}

/**
 * Calculate Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}
