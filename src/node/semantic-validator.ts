/**
 * Semantic validation for cross-document references.
 */

import { resolve } from 'path';
import { type FileSystem, nodeFS } from './fs.js';
import { parseFile } from './parser.js';
import { isValidId, getUBMLFilePatterns } from '../generated/metadata.js';
import type { UBMLDocument } from '../parser.js';

/**
 * Validation error for reference issues.
 */
export interface ReferenceError {
  /** Error message */
  message: string;
  /** File path where error occurred */
  filepath: string;
  /** JSON path to the error location */
  path?: string;
  /** Error code */
  code?: string;
}

/**
 * Validation warning for reference issues.
 */
export interface ReferenceWarning {
  /** Warning message */
  message: string;
  /** File path where warning occurred */
  filepath: string;
  /** JSON path to the warning location */
  path?: string;
  /** Warning code */
  code?: string;
}

/**
 * Result of reference validation.
 */
export interface ReferenceValidationResult {
  /** Whether all references are valid */
  valid: boolean;
  /** Validation errors for broken references */
  errors: ReferenceError[];
  /** Validation warnings */
  warnings: ReferenceWarning[];
  /** All defined IDs in the workspace */
  definedIds: Map<string, string>; // ID -> filepath
  /** All referenced IDs in the workspace */
  referencedIds: Map<string, string[]>; // ID -> filepaths where referenced
}

/**
 * Options for reference validation.
 */
export interface ReferenceValidateOptions {
  /** Custom file system implementation */
  fs?: FileSystem;
}

/**
 * Extract all defined IDs from a document.
 */
function extractDefinedIds(
  content: unknown,
  filepath: string,
  path: string = ''
): Map<string, { filepath: string; path: string }> {
  const ids = new Map<string, { filepath: string; path: string }>();

  if (content && typeof content === 'object') {
    if (Array.isArray(content)) {
      content.forEach((item, index) => {
        const childIds = extractDefinedIds(item, filepath, `${path}[${index}]`);
        for (const [id, info] of childIds) {
          ids.set(id, info);
        }
      });
    } else {
      const obj = content as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Check if this key is an ID definition
        if (isValidId(key)) {
          ids.set(key, { filepath, path: currentPath });
        }
        
        // Recursively check nested objects
        const childIds = extractDefinedIds(value, filepath, currentPath);
        for (const [id, info] of childIds) {
          ids.set(id, info);
        }
      }
    }
  }

  return ids;
}

/**
 * Extract all referenced IDs from a document.
 */
function extractReferencedIds(
  content: unknown,
  filepath: string,
  path: string = ''
): Map<string, { filepath: string; path: string }[]> {
  const refs = new Map<string, { filepath: string; path: string }[]>();

  function addRef(id: string, refPath: string) {
    const existing = refs.get(id) ?? [];
    existing.push({ filepath, path: refPath });
    refs.set(id, existing);
  }

  if (content && typeof content === 'object') {
    if (Array.isArray(content)) {
      content.forEach((item, index) => {
        // Check if array item is an ID reference (string)
        if (typeof item === 'string' && isValidId(item)) {
          addRef(item, `${path}[${index}]`);
        }
        
        const childRefs = extractReferencedIds(item, filepath, `${path}[${index}]`);
        for (const [id, locations] of childRefs) {
          const existing = refs.get(id) ?? [];
          existing.push(...locations);
          refs.set(id, existing);
        }
      });
    } else {
      const obj = content as Record<string, unknown>;
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Check reference fields
        const refFields = [
          'responsible', 'accountable', 'consulted', 'informed', 
          'actor', 'actors', 'from', 'to', 'source', 'target', 
          'parent', 'children', 'relatedTo', 'inputs', 'outputs', 
          'resources', 'tools', 'systems', 'owner', 'members',
          'subprocess', 'skills', 'entity', 'linkedHypotheses',
        ];
        
        if (refFields.includes(key)) {
          if (typeof value === 'string' && isValidId(value)) {
            addRef(value, currentPath);
          } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
              if (typeof item === 'string' && isValidId(item)) {
                addRef(item, `${currentPath}[${index}]`);
              }
            });
          }
        }
        
        // Recursively check nested objects
        const childRefs = extractReferencedIds(value, filepath, currentPath);
        for (const [id, locations] of childRefs) {
          const existing = refs.get(id) ?? [];
          existing.push(...locations);
          refs.set(id, existing);
        }
      }
    }
  }

  return refs;
}

/**
 * Validate cross-document references in a workspace.
 * 
 * @param dir - Workspace directory to validate
 * @param options - Validation options
 * 
 * @example
 * ```typescript
 * import { validateReferences } from 'ubml/node';
 * 
 * const result = await validateReferences('./my-workspace');
 * if (!result.valid) {
 *   for (const error of result.errors) {
 *     console.error(error.message);
 *   }
 * }
 * ```
 */
export async function validateReferences(
  dir: string,
  options: ReferenceValidateOptions = {}
): Promise<ReferenceValidationResult> {
  const fs = options.fs ?? nodeFS;
  const absoluteDir = resolve(dir);
  const errors: ReferenceError[] = [];
  const warnings: ReferenceWarning[] = [];
  const definedIds = new Map<string, string>();
  const referencedIds = new Map<string, string[]>();

  // Find all UBML files
  const patterns = getUBMLFilePatterns();
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await fs.glob(pattern, { cwd: absoluteDir });
    files.push(...matches);
  }

  // Parse all documents and extract IDs
  const documents: UBMLDocument[] = [];
  for (const filepath of files) {
    const result = await parseFile(filepath, { fs });
    if (result.ok && result.document) {
      documents.push(result.document);
      
      // Extract defined IDs
      const ids = extractDefinedIds(result.document.content, filepath);
      for (const [id, info] of ids) {
        if (definedIds.has(id)) {
          errors.push({
            message: `Duplicate ID "${id}" (also defined in ${definedIds.get(id)!})`,
            filepath: info.filepath,
            path: info.path,
            code: 'ubml/duplicate-id',
          });
        } else {
          definedIds.set(id, info.filepath);
        }
      }
      
      // Extract referenced IDs
      const refs = extractReferencedIds(result.document.content, filepath);
      for (const [id, locations] of refs) {
        const existing = referencedIds.get(id) ?? [];
        existing.push(...locations.map(l => l.filepath));
        referencedIds.set(id, existing);
      }
    }
  }

  // Check for undefined references
  for (const [id, filepaths] of referencedIds) {
    if (!definedIds.has(id)) {
      const uniqueFiles = [...new Set(filepaths)];
      for (const filepath of uniqueFiles) {
        errors.push({
          message: `Reference to undefined ID "${id}"`,
          filepath,
          code: 'ubml/undefined-reference',
        });
      }
    }
  }

  // Check for unused IDs (warning only)
  for (const [id, filepath] of definedIds) {
    if (!referencedIds.has(id)) {
      warnings.push({
        message: `ID "${id}" is defined but never referenced`,
        filepath,
        code: 'ubml/unused-id',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    definedIds,
    referencedIds,
  };
}
