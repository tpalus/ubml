/**
 * Generate metadata.ts
 *
 * Generate the metadata.ts file with document types, ID patterns, and tooling hints.
 *
 * @module generate/generate-metadata
 */

import {
  createBanner,
  SCHEMA_VERSION,
} from './utils.js';
import type { RefInfo, IdConfig, ToolingHints, ContentDetectionConfig, ValidationPatterns, CommonPropertiesConfig, CategoryConfig } from './extract-metadata.js';

// =============================================================================
// Generate metadata.ts
// =============================================================================

/**
 * Generate metadata.ts content.
 */
export function generateMetadataTs(
  documentTypes: string[],
  fragments: string[],
  refInfos: RefInfo[],
  refFields: string[],
  toolingHints: ToolingHints,
  idConfig: IdConfig,
  detectionConfig: ContentDetectionConfig[],
  validationPatterns: ValidationPatterns,
  commonPropertiesConfig: CommonPropertiesConfig,
  categoryConfig: CategoryConfig[]
): string {
  const idPrefixesEntries = refInfos.map((r) => `  ${r.prefix}: '${r.type}'`).join(',\n');
  const refFieldsEntries = refFields.map((f) => `  '${f}'`).join(',\n');

  // Generate pattern hints
  const patternHintsJson = JSON.stringify(toolingHints.patterns, null, 2);

  // Generate nested property hints
  const nestedPropsJson = JSON.stringify(toolingHints.nestedProperties, null, 2);

  // Generate enum hints
  const enumHintsJson = JSON.stringify(toolingHints.enums, null, 2);

  // Generate category config JSON
  const categoryConfigJson = JSON.stringify(categoryConfig, null, 2);

  return `${createBanner('metadata.ts', `Schema metadata derived from YAML schema files.

This file is the SINGLE SOURCE OF TRUTH for:
- Document types (discovered from schemas/documents/*.document.yaml)
- Fragment names (discovered from schemas/fragments/*.fragment.yaml)
- ID prefixes and patterns (extracted from common/defs.schema.yaml)
- Reference field names (extracted from all schemas)`)}

// ============================================================================
// DOCUMENT TYPES (discovered from schema files)
// ============================================================================

/**
 * Supported UBML document types.
 * Derived from: schemas/documents/*.document.yaml
 */
export const DOCUMENT_TYPES = [
${documentTypes.map((t) => `  '${t}'`).join(',\n')}
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

/**
 * Check if a string is a valid document type.
 */
export function isDocumentType(type: string): type is DocumentType {
  return DOCUMENT_TYPES.includes(type as DocumentType);
}

// ============================================================================
// FRAGMENT NAMES (discovered from schema files)
// ============================================================================

/**
 * Available fragment schema names.
 * Derived from: schemas/fragments/*.fragment.yaml
 */
export const FRAGMENT_NAMES = [
${fragments.map((f) => `  '${f}'`).join(',\n')}
] as const;

export type FragmentName = typeof FRAGMENT_NAMES[number];

// ============================================================================
// SCHEMA VERSION (re-exported from constants for convenience)
// ============================================================================

export { SCHEMA_VERSION } from '../constants.js';

// ============================================================================
// SCHEMA PATHS
// ============================================================================

/**
 * Schema file paths relative to the schemas directory.
 */
export const SCHEMA_PATHS = {
  root: 'ubml.schema.yaml',
  defs: 'common/defs.schema.yaml',
  documents: {
${documentTypes.map((t) => `    ${t}: 'documents/${t}.document.yaml'`).join(',\n')}
  } as const,
  fragments: {
${fragments.map((f) => `    ${f}: 'fragments/${f}.fragment.yaml'`).join(',\n')}
  } as const,
} as const;

/**
 * Get the schema path for a document type.
 */
export function getSchemaPathForDocumentType(type: DocumentType): string {
  return SCHEMA_PATHS.documents[type];
}

// ============================================================================
// ID GENERATION CONFIGURATION (extracted from defs.schema.yaml)
// ============================================================================

/**
 * Configuration for ID generation.
 * Extracted from: schemas/common/defs.schema.yaml x-ubml-id-config
 */
export const ID_CONFIG = {
  /** Number of digits in ID (zero-padded) */
  digitLength: ${idConfig.digitLength},
  /** Regex pattern for validation */
  pattern: '${idConfig.pattern.replace(/\\/g, '\\\\')}',
  /** Starting number for 'ubml init' templates */
  initOffset: ${idConfig.initOffset},
  /** Starting number for 'ubml add' templates */
  addOffset: ${idConfig.addOffset},
} as const;

// ============================================================================
// ID PATTERNS (extracted from defs.schema.yaml)
// ============================================================================

/**
 * ID prefix to element type mapping.
 * Extracted from: schemas/common/defs.schema.yaml $defs/*Ref patterns
 */
export const ID_PREFIXES = {
${idPrefixesEntries}
} as const;

export type IdPrefix = keyof typeof ID_PREFIXES;
export type ElementType = (typeof ID_PREFIXES)[IdPrefix];

/**
 * ID patterns for UBML elements (RegExp).
 * Uses ${idConfig.digitLength}+ digit format (zero-padded).
 */
export const ID_PATTERNS: Record<ElementType, RegExp> = Object.fromEntries(
  Object.entries(ID_PREFIXES).map(([prefix, type]) => [
    type,
    new RegExp(\`^\${prefix}\\\\d{${idConfig.digitLength},}$\`),
  ])
) as Record<ElementType, RegExp>;

/**
 * Combined pattern matching any valid UBML ID.
 */
export const ALL_ID_PATTERN = new RegExp(
  \`^(\${Object.keys(ID_PREFIXES).join('|')})\\\\d{${idConfig.digitLength},}$\`
);

// ============================================================================
// ID GENERATION UTILITIES
// ============================================================================

/**
 * Format an ID with the given prefix and number.
 * @example formatId('AC', 1) // → 'AC00001'
 * @example formatId('PR', 1000) // → 'PR01000'
 */
export function formatId(prefix: IdPrefix, num: number): string {
  return \`\${prefix}\${String(num).padStart(ID_CONFIG.digitLength, '0')}\`;
}

/**
 * Parse the numeric portion from an ID.
 * @example parseIdNumber('AC00001') // → 1
 * @example parseIdNumber('PR01000') // → 1000
 */
export function parseIdNumber(id: string): number | undefined {
  const match = id.match(/^[A-Z]+(\\d+)$/);
  return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Get the prefix from an ID.
 * @example getIdPrefix('AC00001') // → 'AC'
 */
export function getIdPrefix(id: string): IdPrefix | undefined {
  const match = id.match(/^([A-Z]+)\\d+$/);
  return match ? match[1] as IdPrefix : undefined;
}

/**
 * Find the next available ID for a given prefix.
 * @param prefix - The ID prefix (e.g., 'AC', 'PR')
 * @param existingIds - Set of existing IDs to avoid
 * @param startFrom - Starting number (defaults to 1)
 */
export function getNextId(prefix: IdPrefix, existingIds: Set<string>, startFrom = 1): string {
  let num = startFrom;
  let id = formatId(prefix, num);
  while (existingIds.has(id)) {
    num++;
    id = formatId(prefix, num);
  }
  return id;
}

/**
 * Validate an ID against its expected pattern.
 */
export function validateId(type: ElementType, id: string): boolean {
  const pattern = ID_PATTERNS[type];
  return pattern?.test(id) ?? false;
}

/**
 * Check if a string is a valid UBML ID of any type.
 */
export function isValidId(id: string): boolean {
  return ALL_ID_PATTERN.test(id);
}

/**
 * Get the element type from an ID.
 */
export function getElementTypeFromId(id: string): ElementType | undefined {
  const match = id.match(/^([A-Z]+)\\d+$/);
  if (match) {
    const prefix = match[1] as IdPrefix;
    return ID_PREFIXES[prefix];
  }
  return undefined;
}

// ============================================================================
// REFERENCE FIELD NAMES (extracted from all schemas)
// ============================================================================

/**
 * Property names that contain ID references to other elements.
 * Extracted from: All properties in schemas that use $ref to *Ref types
 * 
 * These fields are checked during semantic validation to find cross-document references.
 */
export const REFERENCE_FIELDS = [
${refFieldsEntries}
] as const;

/**
 * Check if a property name is a known reference field.
 */
export function isReferenceField(fieldName: string): boolean {
  return REFERENCE_FIELDS.includes(fieldName as typeof REFERENCE_FIELDS[number]);
}

// ============================================================================
// COMMON PROPERTIES (extracted from schemas)
// ============================================================================

/**
 * Property names that are common across all document types.
 * Extracted from: schemas at generation time
 */
export const COMMON_PROPERTIES = [
${commonPropertiesConfig.properties.map(p => `  '${p}'`).join(',\n')}
] as const;

/**
 * Check if a property is a common document property.
 */
export function isCommonProperty(propertyName: string): boolean {
  return COMMON_PROPERTIES.includes(propertyName as typeof COMMON_PROPERTIES[number]);
}

// ============================================================================
// VALIDATION PATTERNS (extracted from defs.schema.yaml)
// ============================================================================

/**
 * Duration pattern for validation.
 * Matches: 2d, 4h, 30min, 1.5wk, etc.
 * Extracted from: defs.schema.yaml $defs/Duration
 */
export const DURATION_PATTERN = /${validationPatterns.duration.replace(/\\/g, '\\\\')}/;

/**
 * Time pattern for validation (HH:MM format).
 * Extracted from: defs.schema.yaml $defs/TimeString
 */
export const TIME_PATTERN = /${validationPatterns.time.replace(/\\/g, '\\\\')}/;

// ============================================================================
// CATEGORY CONFIGURATION (extracted from defs.schema.yaml)
// ============================================================================

/**
 * Category configuration for display order and naming.
 * Extracted from: defs.schema.yaml x-ubml-categories
 */
export interface CategoryConfig {
  key: string;
  displayName: string;
  order: number;
}

export const CATEGORY_CONFIG: CategoryConfig[] = ${categoryConfigJson};

/**
 * Get the sort order for a category key.
 */
export function getCategorySortOrder(categoryKey: string): number {
  const config = CATEGORY_CONFIG.find(c => c.key === categoryKey);
  return config?.order ?? 999;
}

/**
 * Get the display name for a category key.
 */
export function getCategoryDisplayName(categoryKey: string): string {
  const config = CATEGORY_CONFIG.find(c => c.key === categoryKey);
  return config?.displayName ?? categoryKey;
}

// ============================================================================
// DOCUMENT TYPE DETECTION
// ============================================================================

/**
 * Detect document type from filename pattern.
 * 
 * Supports two patterns:
 * 1. Full pattern: prefix.type.ubml.yaml (e.g., organization.actors.ubml.yaml)
 * 2. Simple pattern: type.ubml.yaml (e.g., actors.ubml.yaml)
 * 
 * @example
 * detectDocumentType('foo.process.ubml.yaml') // → 'process'
 * detectDocumentType('process.ubml.yaml')     // → 'process'
 * detectDocumentType('actors.ubml.yaml')      // → 'actors'
 * detectDocumentType('generic.ubml.yaml')     // → undefined
 */
export function detectDocumentType(filename: string): DocumentType | undefined {
  const lower = filename.toLowerCase();
  for (const type of DOCUMENT_TYPES) {
    // Match both patterns: *.type.ubml.yaml AND type.ubml.yaml
    if (
      lower.includes(\`.\${type}.ubml.yaml\`) ||
      lower.includes(\`.\${type}.ubml.yml\`) ||
      lower.endsWith(\`\${type}.ubml.yaml\`) ||
      lower.endsWith(\`\${type}.ubml.yml\`)
    ) {
      return type;
    }
  }
  return undefined;
}

// ============================================================================
// CONTENT DETECTION CONFIG (extracted from x-ubml-cli.detectBy)
// ============================================================================

/**
 * Content detection configuration extracted from document schemas.
 * Maps property names to document types for content-based detection.
 * Extracted from: x-ubml-cli.detectBy in each document schema
 */
export const CONTENT_DETECTION_CONFIG: Record<DocumentType, string[]> = {
${detectionConfig.map(c => `  ${c.documentType}: [${c.detectBy.map(p => `'${p}'`).join(', ')}]`).join(',\n')}
};

/**
 * Detect document type from parsed content by examining properties.
 * Useful for generic .ubml.yaml files without type in filename.
 * Detection rules are derived from x-ubml-cli.detectBy in schemas.
 */
export function detectDocumentTypeFromContent(content: unknown): DocumentType | undefined {
  if (!content || typeof content !== 'object') {
    return undefined;
  }
  
  const obj = content as Record<string, unknown>;
  
  // Score each document type by how many detectBy properties are present
  let bestMatch: DocumentType | undefined;
  let bestScore = 0;
  
  for (const [docType, detectProps] of Object.entries(CONTENT_DETECTION_CONFIG)) {
    const score = detectProps.filter(prop => prop in obj).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = docType as DocumentType;
    }
  }
  
  return bestMatch;
}

/**
 * Get all glob patterns for finding UBML files.
 * Includes both full pattern (*.type.ubml.yaml) and simple pattern (type.ubml.yaml).
 */
export function getUBMLFilePatterns(): string[] {
  const patterns: string[] = [];
  for (const type of DOCUMENT_TYPES) {
    patterns.push(\`**/*.\${type}.ubml.yaml\`);  // Full pattern: prefix.type.ubml.yaml
    patterns.push(\`**/\${type}.ubml.yaml\`);    // Simple pattern: type.ubml.yaml
  }
  return patterns;
}

/**
 * Check if a filename is a valid UBML file.
 */
export function isUBMLFile(filename: string): boolean {
  return detectDocumentType(filename) !== undefined;
}

/**
 * Get the schema path for a file based on its suffix.
 * Supports both full pattern (*.type.ubml.yaml) and simple pattern (type.ubml.yaml).
 */
export function getSchemaPathForFileSuffix(filepath: string): string | undefined {
  for (const type of DOCUMENT_TYPES) {
    if (
      filepath.endsWith(\`.\${type}.ubml.yaml\`) ||
      filepath.endsWith(\`.\${type}.ubml.yml\`) ||
      filepath.endsWith(\`\${type}.ubml.yaml\`) ||
      filepath.endsWith(\`\${type}.ubml.yml\`)
    ) {
      return SCHEMA_PATHS.documents[type];
    }
  }
  return undefined;
}

// ============================================================================
// TOOLING HINTS (extracted from x-ubml schema metadata)
// ============================================================================

/**
 * Pattern validation hints.
 * Extracted from: x-ubml metadata on schema types with patterns
 * 
 * Used by the validation error formatter to provide helpful messages.
 */
export interface PatternHint {
  pattern: string;
  humanName: string;
  errorHint: string;
  examples: string[];
  prefix?: string;
  commonMistakes?: Array<{ pattern: string; message: string }>;
}

export const PATTERN_HINTS: PatternHint[] = ${patternHintsJson};

/**
 * Get pattern hint for a regex pattern.
 */
export function getPatternHint(pattern: string): PatternHint | undefined {
  return PATTERN_HINTS.find(h => h.pattern === pattern);
}

/**
 * Nested property hints for misplacement detection.
 * Extracted from: x-ubml.nestedProperties on parent types
 * 
 * Used to detect when properties are used at the wrong nesting level.
 */
export interface NestedPropertyHint {
  parentProperty: string;
  childProperties: string[];
  misplacementHint: string;
  misplacementExample: string;
}

export const NESTED_PROPERTY_HINTS: NestedPropertyHint[] = ${nestedPropsJson};

/**
 * Get nested property hint for a property that might be misplaced.
 */
export function getNestedPropertyHint(propertyName: string): NestedPropertyHint | undefined {
  return NESTED_PROPERTY_HINTS.find(h => h.childProperties.includes(propertyName));
}

/**
 * Check if a property should be nested inside another property.
 */
export function shouldBeNested(propertyName: string): { parent: string; hint: string; example: string } | undefined {
  const hint = getNestedPropertyHint(propertyName);
  if (hint) {
    return {
      parent: hint.parentProperty,
      hint: hint.misplacementHint,
      example: hint.misplacementExample,
    };
  }
  return undefined;
}

// ============================================================================
// ENUM HINTS (extracted from x-ubml schema metadata)
// ============================================================================

/**
 * Enum validation hints for property-specific enum errors.
 * Extracted from: x-ubml metadata on schema types with enums
 */
export interface EnumValueHint {
  value: string;
  hint: string;
}

export interface EnumHint {
  propertyNames: string[];
  values: string[];
  valueMistakes?: Record<string, EnumValueHint>;
}

export const ENUM_HINTS: EnumHint[] = ${enumHintsJson};

/**
 * Get enum hint for a property name.
 */
export function getEnumHint(propertyName: string): EnumHint | undefined {
  return ENUM_HINTS.find(h => h.propertyNames.includes(propertyName));
}

/**
 * Get hint for an invalid enum value on a specific property.
 * 
 * Because multiple enum types can share the same property name (e.g., "kind" for
 * Phase.kind, Step.kind, Loop.kind), we first try to find an enum that has the
 * specific invalid value in its valueMistakes, then fall back to the first match.
 */
export function getEnumValueMistakeHint(propertyName: string, invalidValue: string): string | undefined {
  // First, try to find an enum hint that specifically has this invalid value
  // This handles cases like "task" which should match Step.kind, not Phase.kind
  for (const enumHint of ENUM_HINTS) {
    if (enumHint.propertyNames.includes(propertyName) && enumHint.valueMistakes?.[invalidValue]) {
      return enumHint.valueMistakes[invalidValue].hint;
    }
  }
  return undefined;
}
`;
}
