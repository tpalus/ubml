/**
 * Bundle Schemas
 *
 * Bundle YAML schemas into TypeScript for browser usage.
 *
 * @module generate/bundle-schemas
 */

import { join } from 'path';
import { loadYamlFile, loadDirectory, SCHEMAS_DIR, createBanner } from './utils.js';

// =============================================================================
// Types
// =============================================================================

export interface BundledSchemas {
  root: object;
  defs: {
    refs: object;
    primitives: object;
    shared: object;
  };
  documents: Record<string, object>;
  types: Record<string, object>;
}

// =============================================================================
// Bundle Functions
// =============================================================================

/**
 * Load and bundle all schemas for embedding.
 */
export function bundleSchemas(documentTypes: string[], typeNames: string[]): BundledSchemas {
  // Load main schema
  const root = loadYamlFile(join(SCHEMAS_DIR, 'ubml.schema.yaml')) as object;

  // Load defs from split files
  const defs = {
    refs: loadYamlFile(join(SCHEMAS_DIR, 'defs', 'refs.defs.yaml')) as object,
    primitives: loadYamlFile(join(SCHEMAS_DIR, 'defs', 'primitives.defs.yaml')) as object,
    shared: loadYamlFile(join(SCHEMAS_DIR, 'defs', 'shared.defs.yaml')) as object,
  };

  // Load documents using loadDirectory
  const documents = loadDirectory(join(SCHEMAS_DIR, 'documents')) as Record<string, object>;

  // Load types using loadDirectory
  const types = loadDirectory(join(SCHEMAS_DIR, 'types')) as Record<string, object>;

  return { root, defs, documents, types };
}

/**
 * Generate bundled.ts content.
 */
export function generateBundledTs(schemas: BundledSchemas): string {
  return `${createBanner('bundled.ts', `Bundled UBML schemas.

These schemas are embedded at build time for browser compatibility.
They can be used without any file system access.`)}

import type { DocumentType } from './data.js';

/** Root UBML schema */
export const rootSchema = ${JSON.stringify(schemas.root, null, 2)} as const;

/** Common definitions schemas */
export const refsDefsSchema = ${JSON.stringify(schemas.defs.refs, null, 2)} as const;
export const primitivesDefsSchema = ${JSON.stringify(schemas.defs.primitives, null, 2)} as const;
export const sharedDefsSchema = ${JSON.stringify(schemas.defs.shared, null, 2)} as const;

/** Document schemas by type */
export const documentSchemas: Record<DocumentType, object> = ${JSON.stringify(schemas.documents, null, 2)};

/** Type definition schemas by name */
export const typeSchemas: Record<string, object> = ${JSON.stringify(schemas.types, null, 2)};

/**
 * Get all schemas as a map keyed by $id.
 * Useful for Ajv's loadSchema callback.
 */
export function getAllSchemasById(): Map<string, object> {
  const schemas = new Map<string, object>();
  
  const addSchema = (schema: object) => {
    const id = (schema as { $id?: string }).$id;
    if (id) {
      schemas.set(id, schema);
    }
  };
  
  addSchema(rootSchema);
  addSchema(refsDefsSchema);
  addSchema(primitivesDefsSchema);
  addSchema(sharedDefsSchema);
  Object.values(documentSchemas).forEach(addSchema);
  Object.values(typeSchemas).forEach(addSchema);
  
  return schemas;
}
`;
}
