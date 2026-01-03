# UBML — Unified Business Modeling Language

[![npm version](https://img.shields.io/npm/v/ubml.svg)](https://www.npmjs.com/package/ubml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**UBML** is a YAML-based notation for capturing business processes, organizational structures, and strategic initiatives. It provides a structured, human-readable format that can be validated, versioned with Git, and processed programmatically.

## Why UBML?

Traditional business process documentation lives in slides, diagrams, and wikis—difficult to validate, hard to version, and impossible to integrate with development workflows. UBML addresses this by treating business models as code:

- **Version control** — Track changes to business processes with Git
- **Validation** — Catch structural errors before they become misunderstandings
- **Tooling** — Editor support with error highlighting, CLI for CI/CD pipelines
- **Interoperability** — Parse and render UBML in any application

### What You Can Model

| Domain | Elements |
|--------|----------|
| Processes | Workflows (L1–L4), steps, gateways, phases |
| Organization | Roles, teams, systems, resource pools, skills |
| Information | Entities, documents, locations, relationships |
| Strategy | Value streams, capabilities, products, portfolios |
| Analysis | KPIs, ROI models, simulation scenarios |
| Problem Framing | Hypothesis trees with SCQH framework |

---

## Quick Start: VS Code & CLI

For consultants and analysts authoring UBML files locally.

### 1. Install the package

```bash
npm install -g ubml
```

### 2. Initialize a workspace

```bash
ubml init my-project
cd my-project
```

This creates a workspace with starter files:

```
my-project/
├── my-project.workspace.ubml.yaml
├── main.process.ubml.yaml
└── organization.actors.ubml.yaml
```

### 3. Configure VS Code

Install the [YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml), then add to `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "node_modules/ubml/schemas/documents/workspace.document.yaml": "*.workspace.ubml.yaml",
    "node_modules/ubml/schemas/documents/process.document.yaml": "*.process.ubml.yaml",
    "node_modules/ubml/schemas/documents/actors.document.yaml": "*.actors.ubml.yaml",
    "node_modules/ubml/schemas/documents/entities.document.yaml": "*.entities.ubml.yaml",
    "node_modules/ubml/schemas/documents/metrics.document.yaml": "*.metrics.ubml.yaml",
    "node_modules/ubml/schemas/documents/hypotheses.document.yaml": "*.hypotheses.ubml.yaml",
    "node_modules/ubml/schemas/documents/strategy.document.yaml": "*.strategy.ubml.yaml",
    "node_modules/ubml/schemas/documents/scenarios.document.yaml": "*.scenarios.ubml.yaml"
  }
}
```

You'll get inline validation (red squiggles) for structural errors as you type.

### 4. Validate from the command line

```bash
# Validate a single file
ubml validate process.ubml.yaml

# Validate an entire workspace
ubml validate ./my-project

# Output as JSON (for CI/CD)
ubml validate . --format json
```

---

## Quick Start: Browser Integration

For developers embedding UBML editing in web applications (Monaco, CodeMirror, etc.).

### Installation

```bash
npm install ubml
```

### Parse and validate documents

```typescript
import { parse, createValidator } from 'ubml';

// Parse UBML content (browser-safe, no file system needed)
const parseResult = parse(yamlContent, 'process.ubml.yaml');

if (!parseResult.ok) {
  // Handle parse errors with line/column info
  for (const error of parseResult.errors) {
    editor.addDiagnostic({
      line: error.line,
      column: error.column,
      message: error.message,
      severity: 'error',
    });
  }
}

// Create a validator (reuse for performance)
const validator = await createValidator();
const result = validator.validateDocument(parseResult.document);

if (!result.valid) {
  for (const error of result.errors) {
    editor.addDiagnostic({
      message: error.message,
      path: error.path,
      severity: 'error',
    });
  }
}

// Or use the convenience function
import { parseAndValidate } from 'ubml';
const { document, validation, errors, ok } = await parseAndValidate(yamlContent, 'process.ubml.yaml');
```

### Serialize changes back to YAML

```typescript
import { serialize } from 'ubml';

const updatedYaml = serialize(modifiedDocument, { indent: 2 });
// Write to your virtual file system
```

### Schema access API

All schemas are bundled at build time—no file system access required:

```typescript
import { schemas } from 'ubml';

// Get a document schema
const processSchema = schemas.document('process');
const actorsSchema = schemas.document('actors');

// Get all schemas keyed by $id (for Ajv)
const allSchemas = schemas.all();

// List available types
schemas.documentTypes(); // ['workspace', 'process', 'actors', ...]
```

### TypeScript types

Work with UBML documents in a type-safe way:

```typescript
import type { Process, Step, Actor, ProcessDocument } from 'ubml';

const process: Process = {
  id: 'PR001',
  name: 'Customer Onboarding',
  level: 3,
  steps: {
    ST001: {
      name: 'Receive Application',
      kind: 'action',
    }
  }
};

// Full document type
const doc: ProcessDocument = {
  ubml: '1.0',
  processes: { PR001: process }
};
```

### Node.js file operations

For file system operations, import from `ubml/node`:

```typescript
import { parseFile, validateFile, validateWorkspace, serializeToFile } from 'ubml/node';

// Parse a file from disk
const parseResult = await parseFile('./process.ubml.yaml');

// Validate a single file
const fileResult = await validateFile('./process.ubml.yaml');

// Validate an entire workspace
const workspaceResult = await validateWorkspace('./my-project');

// Write to disk
await serializeToFile(document, './output.ubml.yaml');
```

---

## Import Patterns

```typescript
// 🌐 Browser & Node — zero Node.js deps, works everywhere
import { parse, createValidator, serialize, schemas } from 'ubml';

// 📁 Node.js only — file system operations
import { parseFile, validateWorkspace, serializeToFile } from 'ubml/node';

// 🔌 ESLint plugin
import ubml from 'ubml/eslint';
```

---

## File Naming Convention

UBML uses filename patterns to associate schemas:

| Pattern | Purpose |
|---------|---------|
| `*.workspace.ubml.yaml` | Workspace configuration |
| `*.process.ubml.yaml` | Process definitions |
| `*.actors.ubml.yaml` | Roles, teams, systems |
| `*.entities.ubml.yaml` | Data model |
| `*.hypotheses.ubml.yaml` | Problem framing |
| `*.strategy.ubml.yaml` | Strategic elements |
| `*.metrics.ubml.yaml` | KPIs and analysis |
| `*.scenarios.ubml.yaml` | Simulations |

---

## Element ID Patterns

All elements use typed ID prefixes for consistency and tooling support:

| Prefix | Element | Prefix | Element |
|--------|---------|--------|---------|
| `PR###` | Process | `EN###` | Entity |
| `ST###` | Step | `DC###` | Document |
| `AC###` | Actor | `LO###` | Location |
| `SK###` | Skill | `HT###` | Hypothesis Tree |
| `KP###` | KPI | `VS###` | Value Stream |

---

## API Reference

### Parser (browser-safe)

```typescript
import { parse } from 'ubml';

// Parse from string (works in browser)
const result = parse(content, 'process.ubml.yaml');

// Result shape
interface ParseResult<T = unknown> {
  document: UBMLDocument<T> | undefined;
  errors: ParseError[];
  warnings: ParseWarning[];
  ok: boolean;
}
```

### Validator (browser-safe)

```typescript
import { createValidator, parseAndValidate } from 'ubml';

// Create validator (reuse for performance)
const validator = await createValidator();

// Validate parsed content
const result = validator.validate(content, 'process');
const result = validator.validateDocument(parsedDoc);

// Convenience: parse + validate in one call
const { document, validation, ok } = await parseAndValidate(content, 'file.ubml.yaml');

// Result shape
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### Serializer (browser-safe)

```typescript
import { serialize } from 'ubml';

// To string (works in browser)
const yaml = serialize(content, { indent: 2, lineWidth: 120 });
```

### Node.js Operations

```typescript
import { parseFile, validateFile, validateWorkspace, serializeToFile } from 'ubml/node';

// File operations
const result = await parseFile('./process.ubml.yaml');
const result = await validateFile('./process.ubml.yaml');
const result = await validateWorkspace('./my-project');
await serializeToFile(content, './output.ubml.yaml');
```

### Schemas

```typescript
import { schemas } from 'ubml';

// Get document schema by type
const schema = schemas.document('process');

// Get all schemas as Map<$id, schema>
const all = schemas.all();

// Available methods
schemas.document(type)      // Document schema by type
schemas.fragment(name)      // Fragment schema by name
schemas.all()               // All schemas by $id
schemas.documentTypes()     // List document types
```

### Types

```typescript
import type {
  // Documents
  ProcessDocument,
  ActorsDocument,
  EntitiesDocument,
  WorkspaceDocument,
  
  // Domain objects
  Process,
  Step,
  Actor,
  Entity,
  Link,
  Phase,
} from 'ubml';
```

### ESLint Integration

```javascript
// eslint.config.js (flat config)
import ubml from 'ubml/eslint';

export default [
  {
    files: ['**/*.ubml.yaml'],
    ...ubml.configs.recommended,
  },
];
```

---

## Schema Architecture

```
schemas/
├── ubml.schema.yaml          # Root schema
├── common/
│   └── defs.schema.yaml      # Shared type definitions
├── documents/                # Per-file-type schemas
│   ├── workspace.document.yaml
│   ├── process.document.yaml
│   └── ...
└── fragments/                # Reusable type definitions
    ├── actor.fragment.yaml
    ├── process.fragment.yaml
    └── ...
```

Schemas use JSON Schema Draft 2020-12 and can be used with any compliant validator.

---

## Example

```yaml
# customer-onboarding.process.ubml.yaml
ubml: "1.0"

processes:
  PR001:
    name: "Customer Onboarding"
    description: "End-to-end onboarding from application to activation"
    level: L3
    owner: AC001

    steps:
      ST001:
        name: "Receive Application"
        type: task
        responsible: AC002
        duration: "15min"

      ST002:
        name: "Verify Identity"
        type: task
        responsible: AC003
        duration: "2h"
        inputs:
          - DC001
        outputs:
          - DC002

      ST003:
        name: "Approved?"
        type: gateway
        gatewayType: exclusive
```

See the [example/](./example) directory for a complete workspace.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

```bash
npm install
npm test
npm run validate:example
```

---

## License

MIT — see [LICENSE](./LICENSE)
