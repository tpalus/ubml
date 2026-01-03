
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { parse } from 'yaml';

const SCHEMAS_DIR = './schemas';
const DEFAULT_WORKSPACE_DIR = './example';

// Map file extensions/patterns to schema files
const SCHEMA_MAPPING = {
  '.workspace.ubml.yaml': 'documents/workspace.document.yaml',
  '.process.ubml.yaml': 'documents/process.document.yaml',
  '.actors.ubml.yaml': 'documents/actors.document.yaml',
  '.entities.ubml.yaml': 'documents/entities.document.yaml',
  '.hypotheses.ubml.yaml': 'documents/hypotheses.document.yaml',
  '.strategy.ubml.yaml': 'documents/strategy.document.yaml',
  '.metrics.ubml.yaml': 'documents/metrics.document.yaml',
  '.mining.ubml.yaml': 'documents/mining.document.yaml',
  '.views.ubml.yaml': 'documents/views.document.yaml',
  '.links.ubml.yaml': 'documents/links.document.yaml',
  '.glossary.ubml.yaml': 'documents/glossary.document.yaml',
};

function findYamlFiles(dir) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findYamlFiles(fullPath));
      } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Directory might not exist yet, which is fine
    if (e.code !== 'ENOENT') {
      console.warn(`Could not read directory ${dir}: ${e.message}`);
    }
  }
  return files;
}

function loadSchemas() {
  const schemas = {};
  const schemaFiles = findYamlFiles(SCHEMAS_DIR);
  
  for (const file of schemaFiles) {
    const content = readFileSync(file, 'utf8');
    const schema = parse(content);
    schemas[schema.$id] = schema;
  }
  return schemas;
}

async function validateWorkspace() {
  const workspaceDir = process.argv[2] || DEFAULT_WORKSPACE_DIR;
  console.log(`Validating workspace in: ${workspaceDir}`);

  const schemas = loadSchemas();
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false, // Allow unknown keywords for now
    loadSchema: async (uri) => {
      if (schemas[uri]) return schemas[uri];
      throw new Error(`Schema not found: ${uri}`);
    }
  });
  addFormats(ajv);

  // Pre-compile schemas
  for (const id in schemas) {
    try {
      ajv.addSchema(schemas[id]);
    } catch (e) {
      console.error(`Error adding schema ${id}: ${e.message}`);
    }
  }

  const files = findYamlFiles(workspaceDir);
  
  if (files.length === 0) {
    console.log('No UBML files found to validate.');
    return;
  }

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    let schemaPath = null;
    
    // Determine which schema to use
    for (const [pattern, schemaFile] of Object.entries(SCHEMA_MAPPING)) {
      if (file.endsWith(pattern)) {
        schemaPath = schemaFile;
        break;
      }
    }

    if (!schemaPath) {
      // Skip files that don't match UBML patterns
      continue;
    }

    const schemaId = `https://ubml.io/schemas/1.0/${schemaPath}`;
    const validate = ajv.getSchema(schemaId);

    if (!validate) {
      console.error(`❌ Schema not found for ${file}: ${schemaId}`);
      failed++;
      continue;
    }

    try {
      const content = readFileSync(file, 'utf8');
      const data = parse(content);
      const valid = validate(data);

      if (valid) {
        console.log(`✅ ${relative('.', file)}`);
        passed++;
      } else {
        console.error(`❌ ${relative('.', file)}`);
        // Format errors for better readability
        validate.errors.forEach(err => {
          console.error(`   ${err.instancePath} ${err.message}`);
          if (err.params && Object.keys(err.params).length > 0) {
             console.error(`   Params: ${JSON.stringify(err.params)}`);
          }
        });
        failed++;
      }
    } catch (e) {
      console.error(`❌ ${relative('.', file)} - Parse error: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

validateWorkspace().catch(err => {
  console.error(err);
  process.exit(1);
});
