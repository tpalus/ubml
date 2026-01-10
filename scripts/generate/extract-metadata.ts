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
 * Extract ID patterns from defs.schema.yaml.
 */
export function extractIdPatterns(): RefInfo[] {
  const defsPath = join(SCHEMAS_DIR, 'common', 'defs.schema.yaml');
  const defs = loadYamlFile(defsPath) as {
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
 * Extract ID generation config from defs.schema.yaml.
 */
export function extractIdConfig(): IdConfig {
  const defsPath = join(SCHEMAS_DIR, 'common', 'defs.schema.yaml');
  const defs = loadYamlFile(defsPath) as { 'x-ubml-id-config'?: IdConfig };

  const config = defs['x-ubml-id-config'];
  if (!config) {
    return {
      digitLength: 5,
      pattern: '^[A-Z]+\\d{5}$',
      initOffset: 1,
      addOffset: 1000,
    };
  }

  return {
    digitLength: config.digitLength ?? 5,
    pattern: config.pattern ?? '^[A-Z]+\\d{5}$',
    initOffset: config.initOffset ?? 1,
    addOffset: config.addOffset ?? 1000,
  };
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
    const schemaPath = join(SCHEMAS_DIR, 'documents', `${type}.document.yaml`);
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
 * Extract validation patterns from defs.schema.yaml.
 * Reads pattern from Duration and TimeString $defs.
 */
export function extractValidationPatterns(): ValidationPatterns {
  const defsPath = join(SCHEMAS_DIR, 'common', 'defs.schema.yaml');
  const defs = loadYamlFile(defsPath) as {
    $defs?: Record<string, { pattern?: string }>;
  };

  let duration = '^[0-9]+(\\.[0-9]+)?(min|h|d|wk|mo)$';
  let time = '^[0-2][0-9]:[0-5][0-9]$';

  if (defs.$defs) {
    if (defs.$defs.Duration?.pattern) {
      duration = defs.$defs.Duration.pattern;
    }
    if (defs.$defs.TimeString?.pattern) {
      time = defs.$defs.TimeString.pattern;
    }
  }

  return { duration, time };
}

// =============================================================================
// Common Properties Extraction
// =============================================================================

/**
 * Extract common properties from the workspace document schema.
 * These are properties that appear in all/most document types.
 */
export function extractCommonProperties(): CommonPropertiesConfig {
  // Common properties are derived from ubml.schema.yaml or workspace.document.yaml
  // For now, we use a well-known set that could later be moved to schema metadata
  const workspacePath = join(SCHEMAS_DIR, 'documents', 'workspace.document.yaml');
  const schema = loadYamlFile(workspacePath) as {
    properties?: Record<string, unknown>;
    'x-ubml-common-properties'?: string[];
  };

  // Check if schema defines common properties explicitly
  const explicitCommon = schema['x-ubml-common-properties'];
  if (explicitCommon && Array.isArray(explicitCommon)) {
    return { properties: explicitCommon };
  }

  // Fall back to well-known common properties
  return {
    properties: ['ubml', 'name', 'description', 'metadata', 'tags', 'custom', 'version', 'status'],
  };
}

// =============================================================================
// Category Configuration Extraction
// =============================================================================

/**
 * Extract category configuration from defs.schema.yaml.
 * Reads x-ubml-categories for display order and naming.
 */
export function extractCategoryConfig(): CategoryConfig[] {
  const defsPath = join(SCHEMAS_DIR, 'common', 'defs.schema.yaml');
  const defs = loadYamlFile(defsPath) as {
    'x-ubml-categories'?: CategoryConfig[];
  };

  const categories = defs['x-ubml-categories'];
  if (categories && Array.isArray(categories)) {
    return categories.sort((a, b) => a.order - b.order);
  }

  // Fall back to default categories
  return [
    { key: 'process-elements', displayName: 'Process Elements', order: 1 },
    { key: 'actors-resources', displayName: 'Actors & Resources', order: 2 },
    { key: 'information-model', displayName: 'Information Model', order: 3 },
    { key: 'strategy', displayName: 'Strategy', order: 4 },
    { key: 'analysis', displayName: 'Analysis', order: 5 },
    { key: 'other', displayName: 'Other', order: 99 },
  ];
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

  // Walk all document and fragment schemas
  const documentsDir = join(SCHEMAS_DIR, 'documents');
  const fragmentsDir = join(SCHEMAS_DIR, 'fragments');
  const defsPath = join(SCHEMAS_DIR, 'common', 'defs.schema.yaml');

  walkSchema(loadYamlFile(defsPath));

  for (const file of readdirSync(documentsDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkSchema(loadYamlFile(join(documentsDir, file)));
  }

  for (const file of readdirSync(fragmentsDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkSchema(loadYamlFile(join(fragmentsDir, file)));
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
    const schemaPath = join(SCHEMAS_DIR, 'documents', `${type}.document.yaml`);
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

      sections.push({
        name: propName,
        idPrefix,
        description: ((propSchema.description as string) ?? '').split('\n')[0],
        required: required.includes(propName),
      });
    }

    templates.push({
      type,
      title: schema.title ?? type,
      shortDescription: metadata.shortDescription ?? '',
      category: metadata.category ?? 'advanced',
      categoryDisplayName: metadata.categoryDisplayName ?? 'Advanced',
      workflowOrder: metadata.workflowOrder ?? 99,
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
      const parentProp = findPropertyNameForType(name);
      if (parentProp) {
        nestedProperties.push({
          parentProperty: parentProp,
          childProperties: xubml.nestedProperties as string[],
          misplacementHint: (xubml.misplacementHint as string) || `These properties belong inside '${parentProp}'`,
          misplacementExample: (xubml.misplacementExample as string) || '',
        });
      }
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

  function findPropertyNameForType(typeName: string): string | undefined {
    const typeToProperty: Record<string, string> = {
      'RACI': 'raci',
      'Loop': 'loop',
      'Block': 'block',
      'Approval': 'approval',
      'Review': 'review',
    };
    return typeToProperty[typeName] || typeName.toLowerCase();
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
  const defsSchema = loadYamlFile(join(SCHEMAS_DIR, 'common', 'defs.schema.yaml'));
  const fragmentsDir = join(SCHEMAS_DIR, 'fragments');
  
  walkDefs(defsSchema);
  
  for (const file of readdirSync(fragmentsDir).filter((f: string) => f.endsWith('.yaml'))) {
    walkDefs(loadYamlFile(join(fragmentsDir, file)));
  }

  return { patterns, nestedProperties, enums };
}
