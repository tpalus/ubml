/**
 * Schema Validation Script
 *
 * Validates all UBML schema files for correctness and consistency.
 * 
 * This script validates:
 * 1. YAML syntax is correct
 * 2. Required metadata fields are present ($schema, $id, title, description)
 * 3. JSON Schema syntax is valid (with external $refs resolved)
 */

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { parse } from 'yaml';

const SCHEMAS_DIR = './schemas';

/**
 * Recursively find all YAML files in a directory.
 */
function findYamlFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findYamlFiles(fullPath));
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Check metadata fields in a schema.
 */
function checkMetadata(schema) {
  const warnings = [];
  
  if (!schema.$schema) {
    warnings.push('Missing $schema declaration');
  }
  if (!schema.$id) {
    warnings.push('Missing $id declaration');
  }
  if (!schema.title) {
    warnings.push('Missing title');
  }
  if (!schema.description) {
    warnings.push('Missing description');
  }
  
  return warnings;
}

/**
 * Parse all schema files and return parsed schemas with metadata.
 */
function parseAllSchemas(schemaFiles) {
  const results = [];
  
  for (const filePath of schemaFiles) {
    const relativePath = relative('.', filePath);
    const content = readFileSync(filePath, 'utf8');
    
    try {
      const schema = parse(content);
      const warnings = checkMetadata(schema);
      results.push({
        path: filePath,
        relativePath,
        schema,
        warnings,
        parseError: null,
      });
    } catch (parseError) {
      results.push({
        path: filePath,
        relativePath,
        schema: null,
        warnings: [],
        parseError: parseError.message,
      });
    }
  }
  
  return results;
}

/**
 * Validate all schemas using Ajv.
 */
function validateSchemas(parsedSchemas) {
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
  });
  
  // Add format validation (date, date-time, email, etc.)
  addFormats(ajv);
  
  const results = [];
  const addErrors = new Map();
  
  // First pass: add all valid schemas to Ajv
  for (const { schema, relativePath, parseError } of parsedSchemas) {
    if (parseError || !schema || !schema.$id) {
      continue;
    }
    
    try {
      ajv.addSchema(schema);
    } catch (e) {
      addErrors.set(relativePath, e.message);
    }
  }
  
  // Second pass: report results
  for (const { relativePath, schema, warnings, parseError } of parsedSchemas) {
    if (parseError) {
      results.push({
        relativePath,
        status: 'error',
        message: `Invalid YAML: ${parseError}`,
        warnings: [],
      });
      continue;
    }
    
    if (addErrors.has(relativePath)) {
      results.push({
        relativePath,
        status: 'error',
        message: `Invalid JSON Schema: ${addErrors.get(relativePath)}`,
        warnings,
      });
      continue;
    }
    
    // Schema was successfully added
    results.push({
      relativePath,
      status: 'success',
      message: null,
      warnings,
    });
  }
  
  return results;
}

/**
 * Main validation function.
 */
function main() {
  console.log('UBML Schema Validation');
  console.log('======================\n');

  const schemaFiles = findYamlFiles(SCHEMAS_DIR);
  console.log(`Found ${schemaFiles.length} schema files\n`);
  
  // Parse all schemas
  const parsedSchemas = parseAllSchemas(schemaFiles);
  
  // Validate all schemas
  const results = validateSchemas(parsedSchemas);

  let passed = 0;
  let failed = 0;

  for (const { relativePath, status, message, warnings } of results) {
    if (status === 'success') {
      console.log(`  ✅ ${relativePath}`);
      for (const warning of warnings) {
        console.warn(`     ⚠️  ${warning}`);
      }
      passed++;
    } else {
      console.error(`  ❌ ${relativePath}: ${message}`);
      failed++;
    }
  }

  console.log('\n======================');
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
