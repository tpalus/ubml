/**
 * Generate types.ts
 *
 * Generate TypeScript type definitions from YAML schemas using json-schema-to-typescript.
 *
 * This is the SCHEMA-DRIVEN implementation - types are GENERATED from YAML schemas,
 * not hardcoded. When you edit a schema, the generated types change.
 *
 * @module generate/generate-types
 */

import { compile, type Options } from 'json-schema-to-typescript';
import { join } from 'path';
import { readdirSync } from 'fs';
import { createBanner, loadYamlFile, SCHEMAS_DIR, SCHEMA_VERSION } from './utils.js';
import type { RefInfo } from './extract-metadata.js';

// =============================================================================
// Configuration
// =============================================================================

const DEFS_DIR = join(SCHEMAS_DIR, 'defs');
const TYPES_DIR = join(SCHEMAS_DIR, 'types');
const DOCUMENTS_DIR = join(SCHEMAS_DIR, 'documents');

const COMPILE_OPTIONS: Partial<Options> = {
  bannerComment: '',
  additionalProperties: false,
  strictIndexSignatures: true,
  enableConstEnums: false,
  declareExternallyReferenced: false,
  unknownAny: false,
  format: true,
};

// =============================================================================
// Type Name Utilities
// =============================================================================

/**
 * Convert a schema filename to a PascalCase type name.
 * Examples:
 *   actor.types.yaml → Actor
 *   actors.schema.yaml → Actors
 */
function schemaFileToTypeName(filename: string): string {
  const baseName = filename
    .replace(/\.(types|document|schema|defs)\.yaml$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ /g, '');
  return baseName;
}

// =============================================================================
// Schema Processing
// =============================================================================

interface SchemaWithDefs {
  $defs?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Strip x-ubml and other non-JSON-Schema extensions.
 */
function stripExtensions(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => stripExtensions(item));
  }

  if (schema !== null && typeof schema === 'object') {
    const obj = schema as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip x-ubml, x-ubml-cli, x-ubml-id-config extensions
      if (key.startsWith('x-')) {
        continue;
      }
      result[key] = stripExtensions(value);
    }

    return result;
  }

  return schema;
}

/**
 * Collect all $defs from all sources into a single map for unified reference resolution.
 */
function collectAllDefs(
  defsDefs: Record<string, unknown>,
  typesDefs: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const allDefs: Record<string, unknown> = { ...defsDefs };

  // Add all type defs
  for (const [, defs] of typesDefs) {
    for (const [defName, defValue] of Object.entries(defs)) {
      // Don't overwrite defs from defs/
      if (!allDefs[defName]) {
        allDefs[defName] = defValue;
      }
    }
  }

  return allDefs;
}

/**
 * Find a definition by name, with case-insensitive fallback for Ref types.
 * This handles inconsistencies like KPIRef vs KpiRef in schemas.
 */
function findDef(allDefs: Record<string, unknown>, defName: string): unknown | null {
  // Exact match first
  if (allDefs[defName]) {
    return allDefs[defName];
  }

  // For Ref types, try case-insensitive match
  if (defName.endsWith('Ref')) {
    const lowerName = defName.toLowerCase();
    for (const key of Object.keys(allDefs)) {
      if (key.toLowerCase() === lowerName) {
        return allDefs[key];
      }
    }
  }

  return null;
}

/**
 * Inline all $refs recursively using a unified defs map.
 * Handles:
 * - Local refs: #/$defs/SomeType
 * - External defs refs: ../defs/refs.defs.yaml#/$defs/SomeType, ../defs/primitives.defs.yaml#/$defs/SomeType, etc.
 * - Type refs: ../types/actor.types.yaml#/$defs/SomeType
 */
function inlineAllRefs(
  schema: unknown,
  allDefs: Record<string, unknown>,
  visited: Set<string> = new Set()
): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => inlineAllRefs(item, allDefs, visited));
  }

  if (schema !== null && typeof schema === 'object') {
    const obj = schema as Record<string, unknown>;

    // Check if this is a $ref
    if ('$ref' in obj && typeof obj.$ref === 'string') {
      const ref = obj.$ref;

      // Extract the definition name from various ref patterns
      let defName: string | null = null;

      // Pattern 1: Local ref - #/$defs/SomeType
      const localMatch = ref.match(/^#\/\$defs\/(\w+)$/);
      if (localMatch) {
        defName = localMatch[1];
      }

      // Pattern 2: External defs ref - ../defs/refs.defs.yaml#/$defs/SomeType
      const defsMatch = ref.match(/\.defs\.yaml#\/\$defs\/(\w+)$/);
      if (defsMatch) {
        defName = defsMatch[1];
      }

      // Pattern 3: Type ref - ../types/actor.types.yaml#/$defs/SomeType
      const typesMatch = ref.match(/\.types\.yaml#\/\$defs\/(\w+)$/);
      if (typesMatch) {
        defName = typesMatch[1];
      }

      if (defName) {
        const foundDef = findDef(allDefs, defName);
        if (foundDef) {
          // Prevent infinite recursion
          if (visited.has(defName)) {
            // For recursive types, just return a simple object type
            return { type: 'object' };
          }

          const newVisited = new Set(visited);
          newVisited.add(defName);

          // Recursively inline the definition
          const inlined = inlineAllRefs(foundDef, allDefs, newVisited);

          // If there were other properties besides $ref, merge them
          const { $ref, ...rest } = obj;
          if (Object.keys(rest).length > 0) {
            return { ...(inlined as object), ...rest };
          }
          return inlined;
        }
      }
    }

    // Process other properties
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = inlineAllRefs(value, allDefs, visited);
    }
    return result;
  }

  return schema;
}

// =============================================================================
// Type Generation
// =============================================================================

/**
 * Generate branded reference types from RefInfo.
 */
function generateBrandedRefTypes(refInfos: RefInfo[]): string {
  return refInfos
    .map((r) => {
      const typeName = r.type.charAt(0).toUpperCase() + r.type.slice(1) + 'Ref';
      return `/** ${typeName} (${r.prefix}### pattern) */
export type ${typeName} = string & { readonly __brand: '${typeName}' };`;
    })
    .join('\n\n');
}

/**
 * Generate TypeScript types from a schema's $defs.
 */
async function generateTypesFromDefs(
  defs: Record<string, unknown>,
  allDefs: Record<string, unknown>
): Promise<string[]> {
  const results: string[] = [];

  for (const [defName, defSchema] of Object.entries(defs)) {
    // Skip if this is a Ref type (we handle those specially as branded types)
    if (defName.endsWith('Ref')) {
      continue;
    }

    try {
      // Inline all refs and strip extensions
      let processedSchema = inlineAllRefs(defSchema, allDefs);
      processedSchema = stripExtensions(processedSchema);

      // Add required JSON Schema metadata
      const schemaWithMeta = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...(processedSchema as object),
      };

      const compiled = await compile(schemaWithMeta as object, defName, COMPILE_OPTIONS);

      // Only include if it generated something meaningful
      if (
        compiled.includes(`export type ${defName} =`) ||
        compiled.includes(`export interface ${defName}`)
      ) {
        results.push(compiled);
      }
    } catch (error) {
      console.warn(`   ⚠ Could not compile ${defName}: ${(error as Error).message}`);
    }
  }

  return results;
}

/**
 * Generate document interface types from document schemas.
 */
async function generateDocumentTypes(
  allDefs: Record<string, unknown>
): Promise<string[]> {
  const results: string[] = [];
  const documentFiles = readdirSync(DOCUMENTS_DIR).filter((f) => f.endsWith('.schema.yaml'));

  for (const file of documentFiles) {
    const filePath = join(DOCUMENTS_DIR, file);
    const docName = schemaFileToTypeName(file) + 'Document';

    try {
      let schema = loadYamlFile(filePath) as SchemaWithDefs;

      // Inline all refs
      schema = inlineAllRefs(schema, allDefs) as SchemaWithDefs;
      schema = stripExtensions(schema) as SchemaWithDefs;

      // Remove $defs from the schema itself (we want just the document structure)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { $defs, $schema, $id, title, ...documentSchema } = schema;

      const schemaWithMeta = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...documentSchema,
      };

      const compiled = await compile(schemaWithMeta, docName, COMPILE_OPTIONS);
      results.push(compiled);
    } catch (error) {
      console.warn(`   ⚠ Could not compile document ${file}: ${(error as Error).message}`);
    }
  }

  return results;
}

// =============================================================================
// Post-Processing
// =============================================================================

/**
 * Post-process generated types to fix common issues and add enhancements.
 */
function postProcessTypes(types: string): string {
  let result = types;

  // Remove duplicate interface declarations by tracking what we've seen
  const seenDeclarations = new Set<string>();
  const lines = result.split('\n');
  const outputLines: string[] = [];
  let currentBlock: string[] = [];
  let currentDeclName = '';
  let braceDepth = 0;
  let inDeclaration = false;

  for (const line of lines) {
    // Check for start of a declaration
    const declMatch = line.match(/^export\s+(interface|type)\s+(\w+)/);

    if (declMatch && !inDeclaration) {
      currentDeclName = declMatch[2];
      currentBlock = [line];
      inDeclaration = true;
      braceDepth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      // For type aliases that end on same line
      if (line.includes('=') && line.endsWith(';') && braceDepth === 0) {
        if (!seenDeclarations.has(currentDeclName)) {
          seenDeclarations.add(currentDeclName);
          outputLines.push(...currentBlock);
        }
        inDeclaration = false;
        currentBlock = [];
        currentDeclName = '';
      }
    } else if (inDeclaration) {
      currentBlock.push(line);
      braceDepth += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;

      // End of declaration
      if (braceDepth <= 0 && (line.trim() === '}' || line.endsWith(';'))) {
        if (!seenDeclarations.has(currentDeclName)) {
          seenDeclarations.add(currentDeclName);
          outputLines.push(...currentBlock);
        }
        inDeclaration = false;
        currentBlock = [];
        currentDeclName = '';
        braceDepth = 0;
      }
    } else {
      outputLines.push(line);
    }
  }

  // Add any remaining block
  if (currentBlock.length > 0 && currentDeclName && !seenDeclarations.has(currentDeclName)) {
    outputLines.push(...currentBlock);
  }

  result = outputLines.join('\n');

  // Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  // Fix any [k: string]: unknown patterns that should be more specific
  // (json-schema-to-typescript sometimes generates these)

  return result;
}

// =============================================================================
// Main Generator
// =============================================================================

/**
 * Generate types.ts content from YAML schemas.
 */
export async function generateTypesTs(refInfos: RefInfo[]): Promise<string> {
  const output: string[] = [];

  // 1. Load all defs from defs/ directory
  const defsDefsMap = new Map<string, Record<string, unknown>>();
  const defsFiles = readdirSync(DEFS_DIR).filter((f) => f.endsWith('.defs.yaml'));
  
  for (const file of defsFiles) {
    const filePath = join(DEFS_DIR, file);
    const schema = loadYamlFile(filePath) as SchemaWithDefs;
    const defsName = file.replace('.defs.yaml', '');

    if (schema.$defs) {
      for (const [defName, defValue] of Object.entries(schema.$defs)) {
        defsDefsMap.set(defName, defValue as Record<string, unknown>);
      }
    }
  }
  const defsDefs = Object.fromEntries(defsDefsMap);

  // 2. Load type defs (raw, without processing yet)
  const typesDefsMap = new Map<string, Record<string, unknown>>();
  const typesFiles = readdirSync(TYPES_DIR).filter((f) => f.endsWith('.types.yaml'));

  for (const file of typesFiles) {
    const filePath = join(TYPES_DIR, file);
    const schema = loadYamlFile(filePath) as SchemaWithDefs;
    const typesName = file.replace('.types.yaml', '');

    if (schema.$defs) {
      typesDefsMap.set(typesName, schema.$defs as Record<string, unknown>);
    }
  }

  // 3. Build unified defs map for ref resolution
  const allDefs = collectAllDefs(defsDefs, typesDefsMap);

  // 4. Generate branded reference types
  output.push('// =============================================================================');
  output.push('// REFERENCE TYPES (Branded strings for type safety)');
  output.push('// =============================================================================\n');
  output.push(generateBrandedRefTypes(refInfos));
  output.push('\n');

  // 5. Helper function for creating typed references
  output.push('/** Helper to create typed references */');
  output.push('export function createRef<T extends string>(id: string): T {');
  output.push('  return id as T;');
  output.push('}\n');

  // 6. Generate types from defs (primitives, refs, shared, etc.)
  output.push('// =============================================================================');
  output.push('// COMMON TYPES (from defs/*.defs.yaml)');
  output.push('// =============================================================================\n');

  const defsTypes = await generateTypesFromDefs(defsDefs, allDefs);
  output.push(defsTypes.join('\n\n'));
  output.push('\n');

  // 7. Generate types from types/
  output.push('// =============================================================================');
  output.push('// ENTITY TYPES (from types/*.types.yaml)');
  output.push('// =============================================================================\n');

  for (const [typesName, defs] of typesDefsMap) {
    const entityTypes = await generateTypesFromDefs(defs, allDefs);
    if (entityTypes.length > 0) {
      output.push(`// --- ${typesName} ---`);
      output.push(entityTypes.join('\n\n'));
      output.push('');
    }
  }

  // 8. Generate document types
  output.push('// =============================================================================');
  output.push('// DOCUMENT TYPES (from document schemas)');
  output.push('// =============================================================================\n');

  const documentTypes = await generateDocumentTypes(allDefs);
  output.push(documentTypes.join('\n\n'));
  output.push('\n');

  // 9. Add schema version type
  output.push('// =============================================================================');
  output.push('// VERSION TYPE');
  output.push('// =============================================================================\n');
  output.push(`/** Current UBML schema version type */`);
  output.push(`export type SchemaVersionString = '${SCHEMA_VERSION}';\n`);

  // 10. Add union type for all documents
  output.push('// =============================================================================');
  output.push('// DOCUMENT UNION TYPE');
  output.push('// =============================================================================\n');

  const docFiles = readdirSync(DOCUMENTS_DIR).filter((f) => f.endsWith('.schema.yaml'));
  const docTypeNames = docFiles.map((f) => schemaFileToTypeName(f) + 'Document');
  output.push('export type UBMLDocumentContent =');
  output.push('  | ' + docTypeNames.join('\n  | ') + ';\n');

  // 11. Assemble final output
  const banner = createBanner(
    'types.ts',
    `UBML TypeScript Types

These types are GENERATED from the YAML schemas in /schemas.
They provide type-safe access to UBML document structures.

DO NOT EDIT - Changes will be overwritten by 'npm run generate'.
To modify types, edit the corresponding YAML schema and regenerate.`
  );

  let finalOutput =
    banner + '\n\n/* eslint-disable @typescript-eslint/no-explicit-any */\n\n' + output.join('\n');

  // Post-process to remove duplicates and clean up
  finalOutput = postProcessTypes(finalOutput);

  return finalOutput;
}
