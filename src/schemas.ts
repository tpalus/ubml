/**
 * UBML Schema Provider (Browser-Safe)
 * 
 * Simple, unified API for accessing UBML schemas.
 * Works in both browser and Node.js environments.
 * 
 * @module ubml
 * 
 * @example
 * ```typescript
 * import { schemas } from 'ubml';
 * 
 * // Get a document schema
 * const processSchema = schemas.document('process');
 * 
 * // Get all schemas for Ajv
 * const allSchemas = schemas.all();
 * ```
 */

import { type DocumentType, SCHEMA_VERSION, DOCUMENT_TYPES } from './metadata.js';
import {
  rootSchema,
  refsDefsSchema,
  primitivesDefsSchema,
  sharedDefsSchema,
  documentSchemas,
  typeSchemas,
  getAllSchemasById,
} from './generated/bundled.js';

// Re-export types
export type { DocumentType };

/**
 * JSON Schema type for convenience.
 * Contains standard JSON Schema properties used by UBML.
 */
export type JSONSchema = Record<string, unknown> & {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
};

/**
 * Schema access API.
 * 
 * All schemas are bundled at build time, so no file system access is required.
 * This works in browsers, Node.js, and any JavaScript runtime.
 */
export const schemas = {
  /**
   * UBML schema version.
   */
  version: SCHEMA_VERSION,

  /**
   * Get a document schema by type.
   * 
   * @example
   * ```typescript
   * const schema = schemas.document('process');
   * const actorsSchema = schemas.document('actors');
   * ```
   */
  document(type: DocumentType): JSONSchema {
    const schema = documentSchemas[type];
    if (!schema) {
      throw new Error(`Unknown document type: ${type}`);
    }
    return schema as JSONSchema;
  },

  /**
   * Get a type schema by name.
   * 
   * @example
   * ```typescript
   * const stepSchema = schemas.type('step');
   * ```
   */
  type(name: string): JSONSchema {
    const schema = typeSchemas[name];
    if (!schema) {
      throw new Error(`Unknown type: ${name}`);
    }
    return schema as JSONSchema;
  },

  /**
   * Get the root UBML schema.
   */
  root(): JSONSchema {
    return rootSchema as JSONSchema;
  },

  /**
   * Get the common definitions schemas.
   * Returns an object with refs, primitives, and shared defs.
   */
  defs(): { refs: JSONSchema; primitives: JSONSchema; shared: JSONSchema } {
    return {
      refs: refsDefsSchema as JSONSchema,
      primitives: primitivesDefsSchema as JSONSchema,
      shared: sharedDefsSchema as JSONSchema,
    };
  },

  /**
   * Get all schemas as a Map keyed by $id.
   * 
   * Useful for configuring Ajv's loadSchema callback.
   * 
   * @example
   * ```typescript
   * const allSchemas = schemas.all();
   * const ajv = new Ajv({
   *   loadSchema: async (uri) => allSchemas.get(uri),
   * });
   * ```
   */
  all(): Map<string, JSONSchema> {
    return getAllSchemasById() as Map<string, JSONSchema>;
  },

  /**
   * List all available document types.
   */
  documentTypes(): readonly DocumentType[] {
    return DOCUMENT_TYPES;
  },
} as const;
