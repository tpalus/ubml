# UBML Implementation Plan

> **Goal:** Make UBML the best-in-class notation for business process modeling—bridging the gap between informal discovery and formal modeling, with first-class AI assistance and a developer experience that rivals Prisma, Zod, and similar modern TypeScript libraries.

## Why This Matters

The specification bottleneck is real. AI-assisted coding has dramatically accelerated implementation, but understanding what to build remains as hard as ever. Organizations will produce more software, faster, that doesn't match how the business actually works—unless we solve the specification problem.

**UBML addresses this by:**
- Capturing business understanding in a structured, validated format
- Enabling AI to assist with analysis and model extraction
- Supporting multiple views for different stakeholders
- Providing progressive formalization—start loose, add rigor as understanding deepens

## Target Audiences

### 1. Business Practitioners (Primary)
Practitioners who understand business but aren't software engineers:

| Role | Needs | Comfort Level |
|------|-------|---------------|
| **Management consultants** | Workshop capture, stakeholder validation, business case building | Can follow setup instructions, use VS Code |
| **Business analysts** | Process mapping, gap analysis, requirements context | Familiar with modeling tools |
| **Strategy teams** | Value stream analysis, capability mapping, ROI-backed recommendations | Comfortable with structured frameworks |
| **Operations leaders** | Bottleneck identification, improvement prioritization, KPI tracking | Pragmatic about tooling |

These practitioners think in: *Who does what? Where does time go? What's causing pain? How do we make more money?*

### 2. Tool Developers (Secondary)
Developers building UBML-powered applications:

- Embed UBML editing in web apps (Monaco, CodeMirror)
- Build AI-assisted modeling tools that process transcripts into structured models
- Create visualization and export pipelines
- Need: parse → validate → show errors → mutate → serialize
- Constraint: **must work in browser** with virtual file systems

### 3. AI Agents (Emerging)
AI systems that work with UBML:

- Process interview transcripts and meeting notes into model fragments
- Identify gaps, inconsistencies, and improvement opportunities
- Generate hypotheses from observed patterns
- Translate models back to plain language for stakeholder review

---

## Design Principles

| Principle | Implementation | Vision Alignment |
|-----------|----------------|------------------|
| **Zero-config for common cases** | `ubml validate .` just works | Spend time understanding business, not fighting tools |
| **Progressive disclosure** | Simple API surface, advanced options available | Progressive formalization—start loose, add rigor |
| **Browser-first** | All parsing/validation works without Node.js | Enable web-based workshop tools |
| **Minimal dependencies** | Only `yaml` + `ajv` in browser bundle | Keep tooling lightweight |
| **Type-safe by default** | Full TypeScript types, no `any` | Semantic property names AI can understand |
| **Open for extension** | Interfaces for custom file systems | Support multiple ways of working |
| **Tree-shakeable** | Import only what you need | Embeddable in any context |
| **No workspace structure imposed** | Users organize files however they want | Actionable over comprehensive |
| **AI-friendly format** | Clear structure, validation that catches errors | Good target format for AI extraction |
| **Multiple perspectives** | Same model, different views | Different consultants think differently |

---

## Workspace Philosophy

**We do NOT impose folder structure rules.** Users can organize their UBML files however they want:

```
# All valid workspace structures:

project/
├── workspace.ubml.yaml
├── process.ubml.yaml        # Flat structure
└── actors.ubml.yaml

project/
├── workspace.ubml.yaml
├── sales/
│   └── lead-to-cash.process.ubml.yaml
├── hr/
│   └── hiring.process.ubml.yaml
└── shared/
    └── organization.actors.ubml.yaml

project/
├── my-project.workspace.ubml.yaml
└── docs/
    └── processes/
        └── main.process.ubml.yaml
```

### Document Discovery

The **workspace file** is the source of truth for which files belong to a project:

```yaml
# my-project.workspace.ubml.yaml
ubml: "1.0"
name: "My Project"

documents:
  - sales/lead-to-cash.process.ubml.yaml
  - hr/hiring.process.ubml.yaml
  - shared/organization.actors.ubml.yaml
```

When validating without a workspace file, we scan for `*.ubml.yaml` files.

### Document Type Detection

Document type is determined by (in order):

1. **File extension pattern**: `*.{type}.ubml.yaml` (e.g., `foo.process.ubml.yaml` → `process`)
2. **Document header** (fallback): Look for type-specific properties in content

```typescript
// Detection from filename (preferred)
detectDocumentType('anything.process.ubml.yaml') // → 'process'
detectDocumentType('my-actors.actors.ubml.yaml') // → 'actors'

// Detection from content (fallback for generic .ubml.yaml files)
detectDocumentTypeFromContent({ ubml: '1.0', processes: { ... } }) // → 'process'
detectDocumentTypeFromContent({ ubml: '1.0', actors: { ... } }) // → 'actors'
```

---

## Package Structure

### Single Package, Clean Entry Points

No "core" naming — just root imports for browser-safe API and `/node` for file system operations:

```
ubml/
├── package.json
├── src/
│   ├── index.ts              # Main entry (browser-safe exports)
│   │
│   ├── parser.ts             # 🌐 parse() - browser-safe
│   ├── validator.ts          # 🌐 createValidator() - browser-safe
│   ├── serializer.ts         # 🌐 serialize() - browser-safe
│   ├── schemas.ts            # 🌐 schemas API - browser-safe
│   ├── types.ts              # 🌐 TypeScript types
│   ├── detect.ts             # 🌐 Document type detection
│   │
│   ├── node/                 # 📁 Node.js only (file system ops)
│   │   ├── index.ts
│   │   ├── parser.ts         # parseFile()
│   │   ├── serializer.ts     # serializeToFile()
│   │   ├── validator.ts      # validateFile(), validateWorkspace()
│   │   └── fs.ts             # FileSystem interface + Node impl
│   │
│   ├── cli/                  # 🖥️ CLI (dynamic imports)
│   │   ├── index.ts
│   │   └── commands/
│   │
│   └── eslint/               # 🔌 ESLint plugin
│       ├── index.ts
│       └── rules/
```

### Package.json Exports

```json
{
  "name": "ubml",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./node": {
      "types": "./dist/node/index.d.ts",
      "import": "./dist/node/index.js"
    },
    "./eslint": {
      "types": "./dist/eslint/index.d.ts",
      "import": "./dist/eslint/index.js"
    },
    "./schemas/*": "./schemas/*"
  },
  "bin": {
    "ubml": "./dist/cli/index.js"
  }
}
```

### Import Patterns

```typescript
// 🌐 Browser & Node — zero Node.js deps, works everywhere
import { parse, createValidator, serialize, schemas } from 'ubml';

// 📁 Node.js only — file system operations
import { parseFile, validateWorkspace, serializeToFile } from 'ubml/node';

// 🔌 ESLint plugin
import ubml from 'ubml/eslint';
```

---

## API Design

### Main API (Browser-Safe) — `import from 'ubml'`

```typescript
// ═══════════════════════════════════════════════════════════════
// PARSING
// ═══════════════════════════════════════════════════════════════

/**
 * Parse UBML content from a string.
 * Works in any JavaScript runtime (browser, Node, Deno, Bun).
 * 
 * @param content - YAML string to parse
 * @param filename - Optional filename for document type detection
 */
function parse(content: string, filename?: string): ParseResult;

interface ParseResult {
  /** Parsed document, undefined if parsing failed */
  document: UBMLDocument | undefined;
  /** Parse errors with source locations */
  errors: ParseError[];
  /** Parse warnings */
  warnings: ParseWarning[];
  /** Whether parsing succeeded (no errors) */
  ok: boolean;
}

interface ParseError {
  message: string;
  line?: number;
  column?: number;
  /** End position for range highlighting */
  endLine?: number;
  endColumn?: number;
}

interface UBMLDocument<T = unknown> {
  /** The parsed content */
  content: T;
  /** Document metadata */
  meta: DocumentMeta;
  /** Original source string */
  source: string;
}

interface DocumentMeta {
  /** UBML version from document */
  version: string;
  /** Detected document type */
  type: DocumentType;
  /** Original filename (if provided) */
  filename?: string;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TYPE DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Detect document type from filename pattern.
 * Returns undefined if pattern doesn't match.
 * 
 * @example
 * detectDocumentType('foo.process.ubml.yaml') // → 'process'
 * detectDocumentType('bar.actors.ubml.yaml')  // → 'actors'
 * detectDocumentType('generic.ubml.yaml')     // → undefined
 */
function detectDocumentType(filename: string): DocumentType | undefined;

/**
 * Detect document type from parsed content by examining properties.
 * Useful for generic .ubml.yaml files without type in filename.
 * 
 * @example
 * detectDocumentTypeFromContent({ ubml: '1.0', processes: {...} }) // → 'process'
 * detectDocumentTypeFromContent({ ubml: '1.0', actors: {...} })    // → 'actors'
 */
function detectDocumentTypeFromContent(content: unknown): DocumentType | undefined;

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Create a validator instance. Reuse for performance.
 */
function createValidator(): Promise<Validator>;

interface Validator {
  /** Validate parsed content against a document type schema */
  validate(content: unknown, type: DocumentType): ValidationResult;
  
  /** Validate with auto-detected type (from content if not in meta) */
  validateDocument(doc: UBMLDocument): ValidationResult;
}

interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
}

interface ValidationError {
  message: string;
  /** JSON pointer path (e.g., "/processes/PR001/steps/ST001") */
  path: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Schema keyword that failed (e.g., "required", "pattern") */
  keyword?: string;
}

/**
 * Convenience: parse + validate in one call
 */
function parseAndValidate(content: string, filename?: string): Promise<ParseAndValidateResult>;

interface ParseAndValidateResult extends ParseResult {
  validation: ValidationResult | undefined;
}

// ═══════════════════════════════════════════════════════════════
// SERIALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Serialize a JavaScript object to YAML string.
 */
function serialize(content: unknown, options?: SerializeOptions): string;

interface SerializeOptions {
  /** Indentation (default: 2) */
  indent?: number;
  /** Line width before wrapping (default: 120) */
  lineWidth?: number;
  /** Sort object keys alphabetically */
  sortKeys?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

const schemas: {
  /** Get document schema by type */
  document(type: DocumentType): JSONSchema;
  
  /** Get fragment schema by name */
  fragment(name: string): JSONSchema;
  
  /** Get all schemas as Map<$id, schema> for Ajv */
  all(): Map<string, JSONSchema>;
  
  /** List available document types */
  documentTypes(): DocumentType[];
  
  /** UBML schema version */
  version: '1.0';
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

// Document types
type DocumentType = 
  | 'workspace' | 'process' | 'actors' | 'entities' 
  | 'hypotheses' | 'metrics' | 'scenarios' | 'strategy'
  | 'mining' | 'views' | 'links' | 'glossary';

// Domain objects (generated from schemas)
interface Process { ... }
interface Step { ... }
interface Actor { ... }
interface Entity { ... }
// ... etc

// Branded reference types for type safety
type ActorRef = string & { readonly __brand: 'ActorRef' };
type StepRef = string & { readonly __brand: 'StepRef' };
type ProcessRef = string & { readonly __brand: 'ProcessRef' };
// ... etc

// Full document types
interface ProcessDocument {
  ubml: '1.0';
  processes?: Record<string, Process>;
}
// ... etc
```

### Node.js API — `import from 'ubml/node'`

```typescript
import type { 
  ParseResult, 
  ValidationResult, 
  UBMLDocument,
  DocumentType 
} from 'ubml';

// ═══════════════════════════════════════════════════════════════
// FILE SYSTEM INTERFACE (for extensibility)
// ═══════════════════════════════════════════════════════════════

/**
 * Abstract file system interface.
 * Implement this to use UBML with virtual file systems in web apps.
 */
interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  glob(pattern: string, options?: { cwd?: string }): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}

/** Default Node.js file system implementation */
const nodeFS: FileSystem;

// ═══════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Parse a UBML file from disk.
 */
function parseFile(path: string, options?: { fs?: FileSystem }): Promise<ParseResult>;

/**
 * Serialize and write to a file.
 */
function serializeToFile(
  content: unknown, 
  path: string, 
  options?: SerializeOptions & { fs?: FileSystem }
): Promise<void>;

// ═══════════════════════════════════════════════════════════════
// WORKSPACE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a single UBML file.
 */
function validateFile(path: string, options?: ValidateOptions): Promise<FileValidationResult>;

/**
 * Validate an entire workspace.
 * 
 * If a workspace file exists, validates documents listed in it.
 * Otherwise, scans for all *.ubml.yaml files.
 */
function validateWorkspace(dir: string, options?: ValidateOptions): Promise<WorkspaceValidationResult>;

interface ValidateOptions {
  /** Custom file system implementation */
  fs?: FileSystem;
  /** Validate cross-document references */
  validateReferences?: boolean;
  /** Explicit list of files to validate (overrides workspace file) */
  files?: string[];
  /** Glob patterns to exclude */
  exclude?: string[];
}

interface FileValidationResult {
  path: string;
  valid: boolean;
  documentType: DocumentType | undefined;
  errors: Array<ValidationError & { line?: number; column?: number }>;
  warnings: Array<ValidationWarning & { line?: number; column?: number }>;
}

interface WorkspaceValidationResult {
  valid: boolean;
  files: FileValidationResult[];
  /** Total error count */
  errorCount: number;
  /** Total warning count */
  warningCount: number;
  /** Number of files validated */
  fileCount: number;
  /** Workspace file used (if any) */
  workspaceFile?: string;
}
```

### CLI Commands

```bash
# Initialize a new workspace
ubml init [directory]
ubml init my-project
ubml init .

# Validate files
ubml validate [path]           # Validate file or directory
ubml validate .                # Validate current directory
ubml validate process.ubml.yaml

# Output formats
ubml validate . --format stylish   # Human-readable (default)
ubml validate . --format json      # JSON output
ubml validate . --format sarif     # SARIF for CI/CD tools

# Options
ubml validate . --strict           # Treat warnings as errors
ubml validate . --quiet            # Only show errors
```

### ESLint Integration

```javascript
// eslint.config.js (flat config)
import ubml from 'ubml/eslint';

export default [
  // For UBML YAML files
  {
    files: ['**/*.ubml.yaml', '**/*.ubml.yml'],
    ...ubml.configs.recommended,
  },
];

// Legacy .eslintrc.js
module.exports = {
  plugins: ['ubml'],
  overrides: [
    {
      files: ['**/*.ubml.yaml', '**/*.ubml.yml'],
      parser: 'yaml-eslint-parser',
      rules: {
        'ubml/valid-document': 'error',
      },
    },
  ],
};
```

---

## Schema-First Architecture

**The schemas are the single source of truth.** All metadata, types, and validation logic should be derived from the YAML schemas, not duplicated in TypeScript code.

### Current Duplication Problems

| Duplicated Info | Schema Source | TS Duplication | Problem |
|-----------------|---------------|----------------|---------|
| Document types list | `schemas/documents/*.yaml` files | `DOCUMENT_TYPES` array in `metadata.ts` | Adding a doc type requires editing both |
| ID patterns | `defs.schema.yaml` `$defs/*Ref` patterns | `ID_PREFIXES` object in `metadata.ts` | Patterns defined twice, can drift |
| Fragment names | `schemas/fragments/*.yaml` files | `SCHEMA_PATHS.fragments` in `metadata.ts` | Manual sync required |
| Doc→TypeName map | File naming convention | `docTypeMap` in `generate-types.ts` | Hardcoded mapping |

### Target State

When you add a new document type (e.g., `objectives.document.yaml`):

| Today | After |
|-------|-------|
| Add schema file | Add schema file |
| Update `DOCUMENT_TYPES` | *(auto-derived)* |
| Update `docTypeMap` | *(auto-derived)* |
| Update `SCHEMA_PATHS` | *(auto-derived)* |
| Run type generation | Run type generation |

**One file change, everything else derived.**

### Derivation Strategy

```
schemas/                          → Source of Truth
    ├── documents/*.yaml          
    ├── fragments/*.yaml          
    └── common/defs.schema.yaml   
            ↓
    bin/generate-all.ts           → Single build script
            ↓
    src/generated/
        ├── bundled.ts            → Bundled schemas (existing)
        ├── metadata.ts           → DOCUMENT_TYPES, ID_PATTERNS, etc.
        └── types.ts              → TypeScript interfaces
```

---

## Implementation Tasks

### Phase 0: Schema-Driven Generation 🎯 ✅ COMPLETE

Eliminate manual duplication by deriving everything from schemas.

- [x] **0.1 Consolidate build scripts**
  - Merged `bundle-schemas.ts` and `generate-types.ts` into single `bin/generate-all.ts`
  - Single command: `npm run generate` does everything
  - Deleted old scripts

- [x] **0.2 Derive DOCUMENT_TYPES from schema files**
  - Scans `schemas/documents/*.document.yaml` at build time
  - Generates `src/generated/metadata.ts` with derived types
  - Deleted hardcoded list from old metadata file

- [x] **0.3 Extract ID patterns from defs.schema.yaml**
  - Parses `$defs/*Ref` entries and extracts patterns
  - Generates `ID_PREFIXES` automatically from schema regex patterns
  - Fixed regex pattern matching (changed `\\\\d` to `\\d`)

- [x] **0.4 Derive fragment paths from directory**
  - Scans `schemas/fragments/*.fragment.yaml` at build time
  - Generates fragment path mappings automatically

- [x] **0.5 Auto-generate docTypeMap**
  - Derives document→TypeName mapping from filename convention
  - `actors.document.yaml` → `ActorsDocument`

- [x] **0.6 Create src/generated/ directory structure**
  ```
  src/generated/
  ├── bundled.ts       # Bundled schemas
  ├── metadata.ts      # DOCUMENT_TYPES, ID_PATTERNS, detection functions
  └── types.ts         # TypeScript interfaces
  ```
  - All files in `src/generated/` are auto-generated

- [x] **0.7 Update imports across codebase**
  - Changed all imports to use `./generated/metadata` and `./generated/types`

### Phase 1: Source Restructuring ⚡ ✅ COMPLETE

- [x] **1.1 Create new source structure**
  - Created browser-safe modules: `parser.ts`, `validator.ts`, `serializer.ts`, `schemas.ts`, `detect.ts`, `types.ts`
  - Created Node.js layer: `node/fs.ts`, `node/parser.ts`, `node/serializer.ts`, `node/validator.ts`, `node/semantic-validator.ts`
  - CLI and ESLint plugin locations unchanged

- [x] **1.2 Implement browser-safe parser**
  - Created `src/parser.ts` with `parse(content, filename?)` returning `ParseResult<T>`
  - No `fs` or `path` imports
  - Source location tracking preserved

- [x] **1.3 Implement document type detection**
  - Created detection functions in `src/generated/metadata.ts` (auto-generated)
  - `detectDocumentType(filename)` - from filename pattern
  - Auto-generated from schema files

- [x] **1.4 Clean up validator**
  - Created `src/validator.ts` with browser-safe validation
  - Implemented `createValidator()` and `getValidator()` with caching
  - Added `parseAndValidate()` convenience function
  - No FS imports

- [x] **1.5 Clean up serializer**
  - Created `src/serializer.ts` with `serialize(content, options?)`
  - Renamed from `serializeToString` to `serialize`

- [x] **1.6 Move schemas API**
  - Created `src/schemas.ts` with schema access methods
  - `schemas.document()`, `schemas.fragment()`, `schemas.all()`, `schemas.documentTypes()`
  - Uses bundled schemas, works without FS

- [x] **1.7 Implement Node.js layer**
  - Created `src/node/fs.ts` with `FileSystem` interface and `nodeFS` implementation
  - Created `src/node/parser.ts` with `parseFile()`
  - Created `src/node/serializer.ts` with `serializeToFile()`
  - Created `src/node/validator.ts` with `validateFile()`, `validateWorkspace()`
  - Created `src/node/semantic-validator.ts` with `validateReferences()`

- [x] **1.8 Update workspace validation logic**
  - Reads workspace file's `documents` array if present
  - Falls back to glob scanning if no workspace file
  - Respects `ValidateOptions.files` override

- [x] **1.9 Update package.json exports**
  - Updated exports map with `.`, `./node`, `./eslint`, `./schemas/*`
  - All exports properly typed

- [x] **1.10 Update tsup config**
  - Entry points: `index`, `node/index`, `eslint/index`, `cli` (bin/ubml.ts)

- [x] **1.11 Delete old directories**
  - Removed `src/parser/`, `src/validator/`, `src/serializer/`, `src/schemas/`, `src/types/`
  - Removed obsolete `bin/bundle-schemas.ts`, `bin/generate-types.ts`, `bin/validate-schemas.ts`

### Phase 2: ESLint Plugin Fix 🔌 ✅ COMPLETE

- [x] **2.1 Remove temp file hack**
  - Uses `parse()` and `createValidator()` directly
  - No file system operations, works with virtual content
  - Caches validator instance for performance

- [x] **2.2 Add flat config support**
  - Exports `configs.recommended` for ESLint flat config
  - Works with both flat config and legacy .eslintrc
### Phase 3: CLI Enhancement 🖥️ ✅ COMPLETE

- [x] **3.1 Dynamic import for commander**
  - CLI is separate entry point, doesn't affect library imports
  - Commander is only loaded when CLI is invoked

- [x] **3.2 Improve validate command**
  - Updated to use new `validateFile()` and `validateWorkspace()` from `ubml/node`
  - Supports cross-document reference validation
  - Updated formatters to work with new result types
  - Formatters are self-contained (no imports from deleted paths)

- [x] **3.3 Improve init command**
  - Updated to use new `serialize()` function
  - Uses generated metadata for document typesn`
  - Interactive prompts (optional)

### Phase 4: Documentation 📚 (Partially Complete)

- [x] **4.1 Rewrite README.md**
  - Updated "Browser Integration" section with new API
  - Updated import patterns section
  - Updated API Reference with new function signatures
  - Added Node.js file operations section

- [ ] **4.2 Keep good docs**
  - `docs/best-practices.md` - keep as-is
  - `docs/schema-reference.md` - keep as-is

- [ ] **4.3 Add browser example**
  - Monaco editor integration example


 (Partially Complete)

- [ ] **5.1 Add browser compatibility tests**
  - Vitest browser mode for `parse`, `validate`, `serialize`

- [ ] **5.2 Bundle size check**
  - Add size-limit or similar
  - Target: main bundle < 50KB

- [x] **5.3 Update existing tests**
  - Updated all tests to use new import paths
  - Updated test data to match current schema requirements
  - All 27 tests passing ✅
  - Tests cover: parser, serializer, validator, workspace validation, CLI integrationests**
  - Adapt to new import paths

---

## File Changes Summary

### New Files to Create

| Path | Purpose |
|------|---------|| `bin/generate-all.ts` | Unified schema→code generation script |
| `src/generated/bundled.ts` | Bundled schemas (moved) |
| `src/generated/metadata.ts` | Derived DOCUMENT_TYPES, ID_PATTERNS, etc. |
| `src/generated/types.ts` | TypeScript interfaces (moved) || `src/parser.ts` | Browser-safe `parse()` function |
| `src/validator.ts` | Browser-safe `createValidator()`, `parseAndValidate()` |
| `src/serializer.ts` | Browser-safe `serialize()` function |
| `src/schemas.ts` | Schema access API (`schemas.document()`, etc.) |
| `src/detect.ts` | `detectDocumentType()`, `detectDocumentTypeFromContent()` |
| `src/types.ts` | Type exports (re-export from generated) |
| `src/node/index.ts` | Node module exports |
| `src/node/fs.ts` | `FileSystem` interface + `nodeFS` implementation |
| `src/node/parser.ts` | `parseFile()` |
| `src/node/serializer.ts` | `serializeToFile()` |
| `src/node/validator.ts` | `validateFile()`, `validateWorkspace()` |

### Files to Modify

| Path | Changes |
|------|---------|
| `src/index.ts` | Clean exports of browser-safe API |
| `src/eslint/rules/valid-ubml.ts` | Remove temp file hack, use parse+validate |
| `src/cli/index.ts` | Dynamic import for commander |
| `src/cli/commands/validate.ts` | Use workspace file, improve output |
| `package.json` | Update exports map |
| `tsup.config.ts` | Update entry points |
| `README.md` | Complete rewrite |

### Files/Directories to Delete

| Path | Reason |
|------|--------|
| `bin/bundle-schemas.ts` | Merged into `bin/generate-all.ts` |
| `bin/generate-types.ts` | Merged into `bin/generate-all.ts` |
| `src/parser/` | Replaced by `src/parser.ts` + `src/node/parser.ts` |
| `src/validator/` | Replaced by `src/validator.ts` + `src/node/validator.ts` |
| `src/serializer/` | Replaced by `src/serializer.ts` + `src/node/serializer.ts` |
| `src/schemas/index.ts` | Replaced by `src/schemas.ts` |
| `src/schemas/metadata.ts` | Hardcoded metadata now generated |
| `src/schemas/bundled.ts` | Moved to `src/generated/bundled.ts` |
| `src/types/index.ts` | Replaced by `src/types.ts` |
| `src/types/generated.ts` | Moved to `src/generated/types.ts` |

### Files to Keep (Unchanged Location)

| Path | Reason |
|------|--------|
| `src/cli/` | CLI structure is fine |
| `src/eslint/` | ESLint structure is fine |
| `src/constants.ts` | Keep (package version, not schema-derived) |
| `bin/ubml.ts` | CLI entry point |
| `bin/validate-schemas.ts` | Schema self-validation (useful for development) |

---

## Success Metrics

### Technical Metrics

| Metric | Target |
|--------|--------|
| Main bundle size (browser) | < 50KB minified |
| Node bundle size | < 100KB minified |
| Browser compatibility | Works in Chrome, Firefox, Safari |
| TypeScript coverage | 100% typed public API |
| Test coverage | > 90% |
| Time to first validation | < 100ms (cached validator) |

### Maintainability Metrics

| Metric | Target |
|--------|--------|
| Files to edit when adding document type | 1 (just the schema file) |
| Files to edit when adding ID pattern | 1 (just defs.schema.yaml) |
| Build commands to run after schema change | 1 (`npm run generate`) |
| Manual metadata duplication | 0 |

### Prototype Validation

For this phase, we focus on developer experience:

- Can consultants author valid UBML in VS Code with red squiggles?
- Does `ubml validate .` just work?
- Can web developers embed parsing/validation in browser apps?

---

## Timeline Estimate

| Phase | Effort | Status | Notes |
|-------|--------|--------|-------|
| Phase 0: Schema-Driven Generation | 0.5-1 day | ✅ COMPLETE | All metadata now auto-generated |
| Phase 1: Source Restructuring | 2-3 days | ✅ COMPLETE | Browser-safe API + Node.js layer working |
| Phase 2: ESLint Fix | 0.5 day | ✅ COMPLETE | Temp file hack removed, flat config supported |
| Phase 3: CLI Enhancement | 0.5 day | ✅ COMPLETE | Commands updated, working properly |
| Phase 4: Documentation | 1 day | 🟡 PARTIAL | README updated, Monaco example pending |
| Phase 5: Testing & Quality | 0.5 day | 🟡 PARTIAL | Tests passing, browser tests + bundle size pending |

**Progress: Core implementation complete (Phases 0-3), polish items remaining (Phases 4-5)**

---

## Open Questions

1. **Should `parse()` return `ok: boolean` or just check `errors.length === 0`?**
   - Recommendation: Add `ok` for convenience, mirrors common patterns

2. **Should validation be sync or async?**
   - Current: async (Ajv compilation)
   - Recommendation: Keep async — `createValidator()` is async, `validate()` is sync after creation

3. **How to handle documents without type in filename?**
   - Recommendation: Use `detectDocumentTypeFromContent()` as fallback
   - Check for presence of `processes`, `actors`, `entities`, etc.

4. **Should workspace file validation be recursive?**
   - If `documents` lists another workspace file, should we validate that too?
   - Recommendation: No, keep it flat for simplicity

---

## Prototype Scope

This is a **lightweight prototype** focused on schema iteration. We explicitly defer:

- **View/projection generation** — BPMN export, narrative views, diagrams (separate repo/tool)
- **AI assistance APIs** — extraction hints, partial validation, merge utilities
- **Process mining integration** — XES import, conformance checking
- **Simulation** — BPSim, what-if analysis, ROI calculations

The goal is to nail the schema and core validation before building on top of it.

---

## Next Steps

1. ✅ Review and approve this plan
2. 🚀 Start Phase 0: Schema-Driven Generation (eliminates duplication first)
3. 🚀 Then Phase 1: Source Restructuring
4. 📝 Update README in parallel
