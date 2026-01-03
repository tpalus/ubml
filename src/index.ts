/**
 * UBML Schema Package
 *
 * Provides utilities for loading and validating UBML schema files.
 *
 * @module @ubml/schema
 */

import { readFile } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import { existsSync } from 'fs';

/**
 * Get the schemas directory path.
 * Uses a relative path from the package root which works in both ESM and CJS.
 */
function getSchemasPath(): string {
  // Handle ESM __dirname equivalent
  const __filename = typeof import.meta !== 'undefined' && import.meta.url 
    ? fileURLToPath(import.meta.url) 
    : __filename || ''; // Fallback for CJS if not shimmed
    
  const __dirname = dirname(__filename);

  // When installed as a package, schemas are at node_modules/@ubml/schema/schemas
  // When running from source, they're at ./schemas relative to package root
  const possiblePaths = [
    resolve(__dirname, '..', 'schemas'),  // from dist/
    resolve(__dirname, 'schemas'),         // from package root
    resolve(process.cwd(), 'schemas'),     // fallback to cwd
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  throw new Error('Could not locate schemas directory');
}

const SCHEMAS_DIR = getSchemasPath();

/**
 * Current UBML schema version.
 */
export const SCHEMA_VERSION = '1.0';

/**
 * Available document types.
 */
export const DOCUMENT_TYPES = [
  'workspace',
  'process',
  'actors',
  'entities',
  'scenarios',
  'hypotheses',
  'strategy',
  'metrics',
  'mining',
  'views',
  'links',
  'glossary',
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Schema file paths relative to the schemas directory.
 */
export const SCHEMA_PATHS = {
  root: 'ubml.schema.yaml',
  defs: 'common/defs.schema.yaml',
  documents: {
    workspace: 'documents/workspace.document.yaml',
    process: 'documents/process.document.yaml',
    actors: 'documents/actors.document.yaml',
    entities: 'documents/entities.document.yaml',
    scenarios: 'documents/scenarios.document.yaml',
    hypotheses: 'documents/hypotheses.document.yaml',
    strategy: 'documents/strategy.document.yaml',
    metrics: 'documents/metrics.document.yaml',
    mining: 'documents/mining.document.yaml',
    views: 'documents/views.document.yaml',
    links: 'documents/links.document.yaml',
    glossary: 'documents/glossary.document.yaml',
  },
  fragments: {
    actor: 'fragments/actor.fragment.yaml',
    entity: 'fragments/entity.fragment.yaml',
    hypothesis: 'fragments/hypothesis.fragment.yaml',
    link: 'fragments/link.fragment.yaml',
    metrics: 'fragments/metrics.fragment.yaml',
    mining: 'fragments/mining.fragment.yaml',
    process: 'fragments/process.fragment.yaml',
    resource: 'fragments/resource.fragment.yaml',
    scenario: 'fragments/scenario.fragment.yaml',
    step: 'fragments/step.fragment.yaml',
    strategy: 'fragments/strategy.fragment.yaml',
    view: 'fragments/view.fragment.yaml',
  },
} as const;

/**
 * ID patterns for UBML elements.
 * All IDs follow the pattern: PREFIX + 3+ digits
 */
export const ID_PATTERNS = {
  actor: /^AC\d{3,}$/,
  persona: /^PS\d{3,}$/,
  skill: /^SK\d{3,}$/,
  resourcePool: /^RP\d{3,}$/,
  equipment: /^EQ\d{3,}$/,
  entity: /^EN\d{3,}$/,
  document: /^DC\d{3,}$/,
  location: /^LO\d{3,}$/,
  process: /^PR\d{3,}$/,
  step: /^ST\d{3,}$/,
  block: /^BK\d{3,}$/,
  phase: /^PH\d{3,}$/,
  scenario: /^SC\d{3,}$/,
  hypothesisTree: /^HT\d{3,}$/,
  hypothesis: /^HY\d{3,}$/,
  evidence: /^EV\d{3,}$/,
  valueStream: /^VS\d{3,}$/,
  capability: /^CP\d{3,}$/,
  product: /^PD\d{3,}$/,
  service: /^SV\d{3,}$/,
  portfolio: /^PF\d{3,}$/,
  kpi: /^KP\d{3,}$/,
  roiAnalysis: /^ROI\d{3,}$/,
  miningSource: /^MS\d{3,}$/,
  view: /^VW\d{3,}$/,
} as const;

/**
 * Duration pattern for validation.
 * Matches: 2d, 4h, 30min, 1.5wk, etc.
 */
export const DURATION_PATTERN = /^[0-9]+(\.[0-9]+)?(min|h|d|wk|mo)$/;

/**
 * Time pattern for validation (HH:MM format).
 */
export const TIME_PATTERN = /^[0-2][0-9]:[0-5][0-9]$/;

/**
 * Load a schema file by document type.
 *
 * @param type - The document type to load
 * @returns Parsed JSON Schema object
 */
export async function loadSchema(type: DocumentType): Promise<unknown> {
  const schemaPath = SCHEMA_PATHS.documents[type];
  const fullPath = join(SCHEMAS_DIR, schemaPath);
  const content = await readFile(fullPath, 'utf8');
  return parse(content);
}

/**
 * Load the root UBML schema.
 *
 * @returns Parsed JSON Schema object
 */
export async function loadRootSchema(): Promise<unknown> {
  const fullPath = join(SCHEMAS_DIR, SCHEMA_PATHS.root);
  const content = await readFile(fullPath, 'utf8');
  return parse(content);
}

/**
 * Load the common definitions schema.
 *
 * @returns Parsed JSON Schema object
 */
export async function loadDefsSchema(): Promise<unknown> {
  const fullPath = join(SCHEMAS_DIR, SCHEMA_PATHS.defs);
  const content = await readFile(fullPath, 'utf8');
  return parse(content);
}

/**
 * Get the absolute path to the schemas directory.
 *
 * @returns Absolute path to schemas directory
 */
export function getSchemasDirectory(): string {
  return SCHEMAS_DIR;
}

/**
 * Get the absolute path to a specific schema file.
 *
 * @param relativePath - Path relative to schemas directory
 * @returns Absolute path to schema file
 */
export function getSchemaPath(relativePath: string): string {
  return join(SCHEMAS_DIR, relativePath);
}

/**
 * Detect document type from filename.
 *
 * @param filename - The filename to analyze
 * @returns Document type or undefined if not recognized
 */
export function detectDocumentType(filename: string): DocumentType | undefined {
  const lower = filename.toLowerCase();

  for (const type of DOCUMENT_TYPES) {
    if (lower.includes(`.${type}.ubml.yaml`) || lower.includes(`.${type}.ubml.yml`)) {
      return type;
    }
  }

  return undefined;
}

/**
 * Validate an ID against its expected pattern.
 *
 * @param type - The element type
 * @param id - The ID to validate
 * @returns True if valid, false otherwise
 */
export function validateId(type: keyof typeof ID_PATTERNS, id: string): boolean {
  const pattern = ID_PATTERNS[type];
  return pattern.test(id);
}
