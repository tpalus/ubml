/**
 * Generate constants.ts
 *
 * Generate version constants from package.json.
 *
 * @module generate/generate-constants
 */

import { createBanner, PACKAGE_VERSION, SCHEMA_VERSION } from './utils.js';

// =============================================================================
// Generate constants.ts
// =============================================================================

/**
 * Generate constants.ts content.
 */
export function generateConstantsTs(): string {
  return `${createBanner('constants.ts', 'Constants for UBML package.\n\nVersion is derived from package.json')}

/**
 * UBML package version (from package.json).
 */
export const VERSION = "${PACKAGE_VERSION}";

/**
 * UBML schema version (major.minor).
 */
export const SCHEMA_VERSION = "${SCHEMA_VERSION}";

/**
 * Package name.
 */
export const PACKAGE_NAME = "ubml";

/**
 * Package repository URL.
 */
export const REPOSITORY_URL = "https://github.com/TALXIS/ubml";
`;
}
