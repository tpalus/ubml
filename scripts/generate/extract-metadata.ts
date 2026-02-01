/**
 * Metadata Extraction
 *
 * Extract metadata from schema files for code generation.
 *
 * @module generate/extract-metadata
 */

import { join } from 'path';
import { readdirSync } from 'fs';
import { loadYamlFile, SCHEMAS_DIR } from './utils.js';

// =============================================================================
// Types
// =============================================================================

export interface RefInfo {
  prefix: string;
  type: string;
  pattern: string;
  shortDescription?: string;
  humanName?: string;
  errorHint?: string;
}

export interface IdConfig {
  digitLength: number;
  pattern: string;
  initOffset: number;
  addOffset: number;
}

export interface TemplateSection {
  name: string;
  idPrefix: string | null;
  description: string;
  required: boolean;
}

export interface TemplateData {
  type: string;
  title: string;
  shortDescription: string;
  category: string;
  categoryDisplayName: string;
  workflowOrder: number;
  defaultFilename: string;
  gettingStarted: string[];
  exampleFilename: string;
  sections: TemplateSection[];
  templateDefaults?: Record<string, Record<string, unknown>>;
}

export interface PatternHint {
  pattern: string;
  humanName: string;
  errorHint: string;
  examples: string[];
  prefix?: string;
  commonMistakes?: Array<{ pattern: string; message: string }>;
}

export interface NestedPropertyHint {
  parentProperty: string;
  childProperties: string[];
  misplacementHint: string;
  misplacementExample: string;
}

export interface EnumValueHint {
  value: string;
  hint: string;
}

export interface EnumHint {
  propertyNames: string[];
  values: string[];
  valueMistakes?: Record<string, EnumValueHint>;
}

export interface ToolingHints {
  patterns: PatternHint[];
  nestedProperties: NestedPropertyHint[];
  enums: EnumHint[];
}

export interface ContentDetectionConfig {
  documentType: string;
  detectBy: string[];
}

export interface ValidationPatterns {
  duration: string;
  time: string;
}

export interface CommonPropertiesConfig {
  properties: string[];
}

export interface CategoryConfig {
  key: string;
  displayName: string;
  order: number;
}
// =============================================================================
// ID Pattern Extraction
// =============================================================================

/**
 * Extract ID patterns from refs.defs.yaml.
 */
export function extractIdPatterns(): RefInfo[] {
  const refsPath = join(SCHEMAS_DIR, 'defs', 'refs.defs.yaml');
  const defs = loadYamlFile(refsPath) as {
    $defs?: Record<string, {
      pattern?: string;
      description?: string;
      'x-ubml'?: {
        prefix?: string;
        humanName?: string;
        shortDescription?: string;
        errorHint?: string;
      };
    }>;
  };

  const refInfos: RefInfo[] = [];

  if (defs.$defs) {
    for (const [name, def] of Object.entries(defs.$defs)) {
      // Only process Ref types with patterns
      if (name.endsWith('Ref') && def.pattern) {
        const match = def.pattern.match(/^\^([A-Z]+)\\d/);
        if (match) {
          const prefix = match[1];
          const typeName = name.replace('Ref', '');
          const type = typeName.charAt(0).toLowerCase() + typeName.slice(1);
          
          const xubml = def['x-ubml'];
          
          refInfos.push({
            prefix,
            type,
            pattern: def.pattern,
            shortDescription: xubml?.shortDescription,
            humanName: xubml?.humanName,
            errorHint: xubml?.errorHint,
          });
        }
      }
    }
  }

  return refInfos.sort((a, b) => a.prefix.localeCompare(b.prefix));
}

/**
 * Extract ID generation config from shared.defs.yaml.
 * Throws if x-ubml-id-config is missing or incomplete.
 */
export function extractIdConfig(): IdConfig {
  const sharedPath = join(SCHEMAS_DIR, 'defs', 'shared.defs.yaml');
  const defs = loadYamlFile(sharedPath) as { 'x-ubml-id-config'?: Partial<IdConfig> };

  const config = defs['x-ubml-id-config'];
  if (!config) {
    throw new Error(
      'Schema error: shared.defs.yaml must define x-ubml-id-config'
    );
  }

  const required = ['digitLength', 'pattern', 'initOffset', 'addOffset'] as const;
  for (const field of required) {
    if (config[field] === undefined) {
      throw new Error(`Schema error: x-ubml-id-config.${field} is missing`);
    }
  }

  return config as IdConfig;
}

// =============================================================================
// Content Detection Config Extraction
// =============================================================================

/**
 * Extract content detection configuration from document schemas.
 * Reads x-ubml-cli.detectBy from each document schema.
 */
export function extractContentDetectionConfig(documentTypes: string[]): ContentDetectionConfig[] {
  const configs: ContentDetectionConfig[] = [];

  for (const type of documentTypes) {
    const schemaPath = join(SCHEMAS_DIR, 'documents', `${type}.schema.yaml`);
    const schema = loadYamlFile(schemaPath) as {
      'x-ubml-cli'?: {
        detectBy?: string[];
      };
    };

    const metadata = schema['x-ubml-cli'];
    const detectBy = metadata?.detectBy ?? [];

    if (detectBy.length > 0) {
      configs.push({
        documentType: type,
        detectBy,
      });
    }
  }

  return configs;
}

// =============================================================================
// Validation Pattern Extraction
// =============================================================================

/**
 * Extract validation patterns from primitives.defs.yaml.
 * Reads pattern from DurationString and TimeString $defs.
 * Throws if patterns are missing.
 */
export function extractValidationPatterns(): ValidationPatterns {
  const primitivesPath = join(SCHEMAS_DIR, 'defs', 'primitives.defs.yaml');
  const defs = loadYamlFile(primitivesPath) as {
    $defs?: Record<string, { pattern?: string }>;
  };

  // DurationString has the actual pattern (Duration is a oneOf wrapper)
  if (!defs.$defs?.DurationString?.pattern) {
    throw new Error('Schema error: primitives.defs.yaml must define DurationString with pattern');
  }
  if (!defs.$defs?.TimeString?.pattern) {
    throw new Error('Schema error: primitives.defs.yaml must define TimeString with pattern');
  }

  return {
    duration: defs.$defs.DurationString.pattern,
    time: defs.$defs.TimeString.pattern,
  };
}

// =============================================================================
// Common Properties Extraction
// =============================================================================

/**
 * Extract common properties from the workspace document schema.
 * These are properties that appear in all/most document types.
 * Throws if x-ubml-common-properties is missing.
 */
export function extractCommonProperties(): CommonPropertiesConfig {
  const workspacePath = join(SCHEMAS_DIR, 'documents', 'workspace.schema.yaml');
  const schema = loadYamlFile(workspacePath) as {
    properties?: Record<string, unknown>;
    'x-ubml-common-properties'?: string[];
  };

  const explicitCommon = schema['x-ubml-common-properties'];
  if (!explicitCommon || !Array.isArray(explicitCommon)) {
    throw new Error(
      'Schema error: workspace.schema.yaml must define x-ubml-common-properties array'
    );
  }

  return { properties: explicitCommon };
}

// =============================================================================
// Category Configuration Extraction
// =============================================================================

/**
 * Extract category configuration from shared.defs.yaml.
 * Reads x-ubml-categories for display order and naming.
 * Throws if x-ubml-categories is missing or empty.
 */
export function extractCategoryConfig(): CategoryConfig[] {
  const sharedPath = join(SCHEMAS_DIR, 'defs', 'shared.defs.yaml');
  const defs = loadYamlFile(sharedPath) as {
    'x-ubml-categories'?: CategoryConfig[];
  };

  const categories = defs['x-ubml-categories'];
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    throw new Error(
      'Schema error: shared.defs.yaml must define x-ubml-categories array'
    );
  }

  return categories.sort((a, b) => a.order - b.order);
}

// =============================================================================
// Reference Field Extraction
// =============================================================================

/**
 * Extract reference field names from all schemas.
 */
export function extractReferenceFields(): string[] {
  const refFieldsSet = new Set<string>();

  function walkSchema(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach((item) => walkSchema(item));
      return;
    }

    const record = obj as Record<string, unknown>;

    if (record.properties && typeof record.properties === 'object') {
      const props = record.properties as Record<string, unknown>;

      for (const [propName, propDef] of Object.entries(props)) {
        if (propDef && typeof propDef === 'object') {
          const def = propDef as Record<string, unknown>;

          // Check for direct $ref to a *Ref type
          if (typeof def.$ref === 'string' && def.$ref.includes('Ref')) {
            refFieldsSet.add(propName);
          }

          // Check for array items with $ref
          if (def.items && typeof def.items === 'object') {
            const items = def.items as Record<string, unknown>;
            if (typeof items.$ref === 'string' && items.$ref.includes('Ref')) {
              refFieldsSet.add(propName);
            }
            // Handle oneOf/anyOf in items
            const variants = (items.oneOf || items.anyOf) as unknown[] | undefined;
            if (Array.isArray(variants)) {
              for (const variant of variants) {
                if (variant && typeof variant === 'object') {
                  const v = variant as Record<string, unknown>;
                  if (typeof v.$ref === 'string' && v.$ref.includes('Ref')) {
                    refFieldsSet.add(propName);
                  }
                }
              }
            }
          }

          // Check for oneOf/anyOf at property level
          const propVariants = (def.oneOf || def.anyOf) as unknown[] | undefined;
          if (Array.isArray(propVariants)) {
            for (const variant of propVariants) {
              if (variant && typeof variant === 'object') {
                const v = variant as Record<string, unknown>;
                if (typeof v.$ref === 'string' && v.$ref.includes('Ref')) {
                  refFieldsSet.add(propName);
                }
              }
            }
          }
        }
      }
    }

    // Recursively walk nested structures
    for (const value of Object.values(record)) {
      walkSchema(value);
    }
  }

  // Walk all document and type schemas
  const documentsDir = join(SCHEMAS_DIR, 'documents');
  const typesDir = join(SCHEMAS_DIR, 'types');
  const defsDir = join(SCHEMAS_DIR, 'defs');

  // Walk all defs files
  for (const file of readdirSync(defsDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkSchema(loadYamlFile(join(defsDir, file)));
  }

  for (const file of readdirSync(documentsDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkSchema(loadYamlFile(join(documentsDir, file)));
  }

  for (const file of readdirSync(typesDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkSchema(loadYamlFile(join(typesDir, file)));
  }

  return Array.from(refFieldsSet).sort();
}

// =============================================================================
// Template Data Extraction
// =============================================================================

/**
 * Extract template data from document schemas.
 */
export function extractTemplateData(documentTypes: string[]): TemplateData[] {
  const templates: TemplateData[] = [];
  
  // Get common properties from schema-driven config
  const commonProps = extractCommonProperties();
  const skipProps = new Set(commonProps.properties);

  for (const type of documentTypes) {
    const schemaPath = join(SCHEMAS_DIR, 'documents', `${type}.schema.yaml`);
    const schema = loadYamlFile(schemaPath) as {
      title?: string;
      description?: string;
      required?: string[];
      properties?: Record<string, Record<string, unknown>>;
      'x-ubml-cli'?: {
        category?: string;
        categoryDisplayName?: string;
        workflowOrder?: number;
        shortDescription?: string;
        defaultFilename?: string;
        gettingStarted?: string[];
        exampleFilename?: string;
        templateDefaults?: Record<string, Record<string, unknown>>;
      };
    };

    const metadata = schema['x-ubml-cli'] ?? {};
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    // Extract sections (skip common properties - now schema-driven!)
    const sections: TemplateSection[] = [];

    for (const [propName, propSchema] of Object.entries(properties)) {
      if (skipProps.has(propName)) continue;

      // Extract ID prefix from patternProperties
      let idPrefix: string | null = null;
      const patternProps = propSchema.patternProperties as Record<string, unknown> | undefined;
      if (patternProps) {
        for (const pattern of Object.keys(patternProps)) {
          const match = pattern.match(/^\^([A-Z]{2})/);
          if (match) {
            idPrefix = match[1];
            break;
          }
        }
      }

      const description = propSchema.description as string | undefined;
      sections.push({
        name: propName,
        idPrefix,
        description: description ? description.split('\n')[0] : '',
        required: required.includes(propName),
      });
    }

    // Validate required metadata - no silent fallbacks
    if (!metadata.shortDescription) {
      throw new Error(
        `Schema error: ${type}.schema.yaml missing required x-ubml-cli.shortDescription`
      );
    }
    if (!metadata.category) {
      throw new Error(
        `Schema error: ${type}.schema.yaml missing required x-ubml-cli.category`
      );
    }
    if (metadata.workflowOrder === undefined) {
      throw new Error(
        `Schema error: ${type}.schema.yaml missing required x-ubml-cli.workflowOrder`
      );
    }

    templates.push({
      type,
      title: schema.title ?? type,
      shortDescription: metadata.shortDescription,
      category: metadata.category,
      categoryDisplayName: metadata.categoryDisplayName ?? metadata.category,
      workflowOrder: metadata.workflowOrder,
      defaultFilename: metadata.defaultFilename ?? type,
      gettingStarted: metadata.gettingStarted ?? [],
      exampleFilename: metadata.exampleFilename ?? `${type}.ubml.yaml`,
      sections,
      templateDefaults: metadata.templateDefaults,
    });
  }

  return templates;
}

// =============================================================================
// Tooling Hints Extraction (matches original extractToolingHints)
// =============================================================================

/**
 * Extract tooling hints from x-ubml metadata.
 * This function matches the original generate-all.ts extractToolingHints logic.
 */
export function extractToolingHints(): ToolingHints {
  const patterns: PatternHint[] = [];
  const nestedProperties: NestedPropertyHint[] = [];
  const enums: EnumHint[] = [];

  function extractFromDef(name: string, def: Record<string, unknown>): void {
    // Extract pattern hints from types with patterns and x-ubml
    if (def.pattern && typeof def.pattern === 'string') {
      const xubml = def['x-ubml'] as Record<string, unknown> | undefined;
      const examples = (def.examples as string[]) || [];

      // Generate default hint from pattern if not specified
      let humanName = name.replace(/Ref$/, ' ID').replace(/String$/, '');
      let errorHint = `Must match pattern: ${def.pattern}`;
      let prefix: string | undefined;
      let commonMistakes: Array<{ pattern: string; message: string }> | undefined;

      if (xubml) {
        if (xubml.humanName) humanName = xubml.humanName as string;
        if (xubml.errorHint) errorHint = xubml.errorHint as string;
        if (xubml.prefix) prefix = xubml.prefix as string;
        if (xubml.commonMistakes) {
          commonMistakes = xubml.commonMistakes as Array<{ pattern: string; message: string }>;
        }
      }

      // Auto-detect prefix from pattern like "^AC\\d{3,}$"
      if (!prefix) {
        const match = (def.pattern as string).match(/^\^([A-Z]+)\\d/);
        if (match) prefix = match[1];
      }

      patterns.push({
        pattern: def.pattern as string,
        humanName,
        errorHint,
        examples,
        prefix,
        commonMistakes,
      });
    }

    // Extract nested property hints from x-ubml.nestedProperties
    const xubml = def['x-ubml'] as Record<string, unknown> | undefined;
    if (xubml?.nestedProperties && Array.isArray(xubml.nestedProperties)) {
      // Property name matches type name exactly (e.g., SCQH type → SCQH property, RACI type → RACI property)
      const parentProp = name;
      nestedProperties.push({
        parentProperty: parentProp,
        childProperties: xubml.nestedProperties as string[],
        misplacementHint: (xubml.misplacementHint as string) || `These properties belong inside '${parentProp}:'`,
        misplacementExample: (xubml.misplacementExample as string) || '',
      });
    }

    // Extract enum hints from types with enum and x-ubml
    if (def.enum && Array.isArray(def.enum) && xubml) {
      const propertyNames = (xubml.propertyNames as string[]) || [name.toLowerCase()];
      const values = def.enum as string[];
      const valueMistakes = xubml.valueMistakes as Record<string, EnumValueHint> | undefined;

      enums.push({
        propertyNames,
        values,
        valueMistakes,
      });
    }

    // Also check inside properties for inline enums with x-ubml
    if (def.properties && typeof def.properties === 'object') {
      const props = def.properties as Record<string, Record<string, unknown>>;
      for (const [propName, propDef] of Object.entries(props)) {
        if (propDef.enum && Array.isArray(propDef.enum)) {
          const propXubml = propDef['x-ubml'] as Record<string, unknown> | undefined;
          if (propXubml) {
            const propertyNames = (propXubml.propertyNames as string[]) || [propName];
            const values = propDef.enum as string[];
            const valueMistakes = propXubml.valueMistakes as Record<string, EnumValueHint> | undefined;

            enums.push({
              propertyNames,
              values,
              valueMistakes,
            });
          }
        }
      }
    }
  }

  function walkDefs(obj: unknown): void {
    if (!obj || typeof obj !== 'object') return;

    const record = obj as Record<string, unknown>;

    // Process $defs
    if (record.$defs && typeof record.$defs === 'object') {
      const defs = record.$defs as Record<string, Record<string, unknown>>;
      for (const [name, def] of Object.entries(defs)) {
        extractFromDef(name, def);
      }
    }
  }

  // Load all schemas and extract hints
  const defsDir = join(SCHEMAS_DIR, 'defs');
  const typesDir = join(SCHEMAS_DIR, 'types');
  
  // Walk all defs files
  for (const file of readdirSync(defsDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkDefs(loadYamlFile(join(defsDir, file)));
  }
  
  // Walk all type files
  for (const file of readdirSync(typesDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkDefs(loadYamlFile(join(typesDir, file)));
  }

  return { patterns, nestedProperties, enums };
}
