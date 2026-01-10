/**
 * Generate templates.ts
 *
 * Generate template factories and metadata from document schemas.
 *
 * @module generate/generate-templates
 */

import { createBanner } from './utils.js';
import type { TemplateData, TemplateSection } from './extract-metadata.js';

// =============================================================================
// Types
// =============================================================================

export interface DocumentTemplateInfo {
  type: string;
  shortDescription: string;
  gettingStarted: string[];
  sections: SectionInfo[];
  requiredDocProps: string[];
}

export interface SectionInfo {
  name: string;
  idPrefix: string;
  description: string;
  requiredProps: string[];
  properties: PropertyInfo[];
  defaults?: Record<string, unknown>;
}

export interface PropertyInfo {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enumValues?: string[];
  default?: unknown;
}

// =============================================================================
// Transform Template Data
// =============================================================================

/**
 * Transform extracted template data to the format expected by templates.ts.
 */
export function transformTemplateData(templates: TemplateData[]): DocumentTemplateInfo[] {
  return templates.map((t) => ({
    type: t.type,
    shortDescription: t.shortDescription,
    gettingStarted: t.gettingStarted,
    sections: t.sections.map((s) => ({
      name: s.name,
      idPrefix: s.idPrefix ?? '',
      description: s.description,
      requiredProps: s.required ? [s.name] : [],
      properties: [],
      defaults: t.templateDefaults?.[s.name],
    })),
    requiredDocProps: [],
  }));
}

// =============================================================================
// Generate templates.ts
// =============================================================================

/**
 * Generate templates.ts content.
 */
export function generateTemplatesTs(templateData: DocumentTemplateInfo[]): string {
  return `${createBanner('templates.ts', `UBML Document Templates

Templates are derived from YAML schemas including:
- Section structure from document schemas
- Required/optional properties from fragment schemas
- Default values from x-ubml-cli.templateDefaults
- Descriptions for inline documentation`)}

import { SCHEMA_VERSION, type DocumentType } from './metadata.js';

// ============================================================================
// TEMPLATE METADATA TYPES
// ============================================================================

export interface PropertyInfo {
  name: string;
  type: string;
  description: string;
  required: boolean;
  enumValues?: string[];
  default?: unknown;
}

export interface SectionInfo {
  name: string;
  idPrefix: string;
  description: string;
  requiredProps: string[];
  properties: PropertyInfo[];
  defaults?: Record<string, unknown>;
}

export interface DocumentTemplateInfo {
  type: string;
  shortDescription: string;
  gettingStarted: string[];
  sections: SectionInfo[];
  requiredDocProps: string[];
}

// ============================================================================
// TEMPLATE DATA (extracted from schemas)
// ============================================================================

export const TEMPLATE_DATA: Record<DocumentType, DocumentTemplateInfo> = ${JSON.stringify(
    Object.fromEntries(templateData.map((t) => [t.type, t])),
    null,
    2
  )};

// ============================================================================
// TEMPLATE FACTORIES
// ============================================================================

/**
 * Create a minimal valid document of the specified type.
 * Uses schema defaults and required properties only.
 */
export function createMinimalDocument(type: DocumentType, name?: string): Record<string, unknown> {
  const template = TEMPLATE_DATA[type];
  if (!template) {
    return { ubml: SCHEMA_VERSION };
  }
  
  const doc: Record<string, unknown> = { ubml: SCHEMA_VERSION };
  
  // Add first section with minimal required item
  for (const section of template.sections) {
    const sectionData: Record<string, unknown> = {};
    const itemId = \`\${section.idPrefix}001\`;
    const itemData: Record<string, unknown> = {};
    
    // Add required properties with defaults or placeholders
    for (const prop of section.properties) {
      if (prop.required) {
        if (prop.name === 'id') {
          itemData.id = itemId;
        } else if (prop.name === 'name') {
          itemData.name = name || 'TODO: Add name';
        } else if (prop.default !== undefined) {
          itemData[prop.name] = prop.default;
        } else if (prop.enumValues && prop.enumValues.length > 0) {
          itemData[prop.name] = prop.enumValues[0];
        } else if (prop.type === 'string') {
          itemData[prop.name] = 'TODO';
        } else if (prop.type === 'number') {
          itemData[prop.name] = 0;
        } else if (prop.type === 'boolean') {
          itemData[prop.name] = false;
        } else if (prop.type === 'array') {
          itemData[prop.name] = [];
        } else if (prop.type === 'object') {
          itemData[prop.name] = {};
        }
      }
    }
    
    // Apply templateDefaults
    if (section.defaults) {
      Object.assign(itemData, section.defaults);
    }
    
    sectionData[itemId] = itemData;
    doc[section.name] = sectionData;
  }
  
  return doc;
}

/**
 * Get YAML comment header for a document type.
 * Includes getting started tips from schema.
 */
export function getDocumentHeader(type: DocumentType, name?: string): string {
  const template = TEMPLATE_DATA[type];
  if (!template) {
    return '# UBML Document\\n';
  }
  
  const displayName = name || type.charAt(0).toUpperCase() + type.slice(1);
  const lines: string[] = [
    '# ============================================================================',
    \`# \${displayName}\`,
    '# ============================================================================',
  ];
  
  if (template.shortDescription) {
    lines.push(\`# \${template.shortDescription}\`);
  }
  
  lines.push('#');
  
  // Add ID pattern quick reference
  const idPatterns = template.sections.map(s => \`\${s.idPrefix}### for \${s.name}\`);
  if (idPatterns.length > 0) {
    lines.push(\`# ID patterns: \${idPatterns.join(', ')}\`);
  }
  
  lines.push('# Run: ubml validate . to check for errors');
  lines.push('# ============================================================================');
  lines.push('');
  
  return lines.join('\\n');
}

/**
 * Convert section name (plural) to element type (singular) for CLI commands.
 * Uses algorithmic approach: strips trailing 's', 'es', handles 'ies' → 'y'.
 * Falls back to explicit mappings for irregular plurals.
 */
function sectionToElementType(sectionName: string): string {
  // Explicit mappings for irregular plurals or special cases
  const irregulars: Record<string, string> = {
    'hypothesisTrees': 'hypothesis',
    'entities': 'entity',
    'capabilities': 'capability',
    'roiAnalyses': 'roiAnalysis',
  };
  
  if (irregulars[sectionName]) {
    return irregulars[sectionName];
  }
  
  // Algorithmic singular derivation
  if (sectionName.endsWith('ies')) {
    return sectionName.slice(0, -3) + 'y';
  }
  if (sectionName.endsWith('ses') || sectionName.endsWith('xes') || sectionName.endsWith('ches') || sectionName.endsWith('shes')) {
    return sectionName.slice(0, -2);
  }
  if (sectionName.endsWith('s') && !sectionName.endsWith('ss')) {
    return sectionName.slice(0, -1);
  }
  
  return sectionName;
}

/**
 * Get section properties as YAML comments for inline documentation.
 */
export function getSectionComment(type: DocumentType, sectionName: string): string {
  const template = TEMPLATE_DATA[type];
  if (!template) return '';
  
  const section = template.sections.find(s => s.name === sectionName);
  if (!section) return '';
  
  const lines: string[] = [
    \`  # Available properties for \${section.idPrefix}### items:\`,
  ];
  
  // Show required first
  const required = section.properties.filter(p => p.required);
  const optional = section.properties.filter(p => !p.required);
  
  for (const prop of required) {
    const enumInfo = prop.enumValues ? \` [\${prop.enumValues.join(' | ')}]\` : '';
    lines.push(\`  #   *\${prop.name}: <\${prop.type}>\${enumInfo} - \${prop.description}\`);
  }
  
  for (const prop of optional.slice(0, 5)) { // Show first 5 optional
    const enumInfo = prop.enumValues ? \` [\${prop.enumValues.join(' | ')}]\` : '';
    lines.push(\`  #    \${prop.name}: <\${prop.type}>\${enumInfo}\`);
  }
  
  if (optional.length > 5) {
    const elementType = sectionToElementType(sectionName);
    lines.push(\`  #   ... and \${optional.length - 5} more (run: ubml syntax \${elementType})\`);
  }
  
  return lines.join('\\n');
}

/**
 * Get enum values comment for a property.
 */
export function getEnumComment(type: DocumentType, sectionName: string, propName: string): string {
  const template = TEMPLATE_DATA[type];
  if (!template) return '';
  
  const section = template.sections.find(s => s.name === sectionName);
  if (!section) return '';
  
  const prop = section.properties.find(p => p.name === propName);
  if (!prop?.enumValues) return '';
  
  return \`# Valid values: \${prop.enumValues.join(' | ')}\`;
}
`;
}
