# UBML Version Management

This document describes how UBML version numbers are managed across the project.

## Single Source of Truth

**Version lives in ONE place only: `package.json`**

All other version references are automatically updated from this single source.

## Version Format

- **Package version**: Semantic versioning (e.g., `1.1.0`)
- **Schema version**: Major.minor only (e.g., `1.1`)

The schema version is automatically derived from the package version by taking the first two components.

## How to Bump Version

```bash
# Option 1: Use npm version command (recommended)
npm version patch  # 1.1.0 → 1.1.1
npm version minor  # 1.1.0 → 1.2.0
npm version major  # 1.1.0 → 2.0.0

# Option 2: Manual edit
# 1. Edit package.json version field
# 2. Run: npm run update-schema-versions
# 3. Run: npm run generate
```

## Automated Scripts

### `npm run update-schema-versions`

Updates all UBML schema files with the current version from package.json.

**What it updates:**
- `$id` URLs in all schema files (e.g., `https://ubml.io/schemas/1.1/...`)
- `const: "1.1"` validation constraints
- Version text in schema descriptions
- All 26 schema files in `/schemas` directory

**Exit codes:**
- `0` - Success (all files updated or already up to date)
- `1` - Failure (version missing, malformed, or file processing error)

### `npm run verify-versions`

Verifies version consistency across all files.

**What it checks:**
- Schema files contain correct version numbers
- TypeScript constants match package.json version
- No version mismatches anywhere

**Exit codes:**
- `0` - All versions consistent
- `1` - Version mismatch found

## Build Process

The version update is integrated into the build process:

```json
{
  "scripts": {
    "prebuild": "npm run update-schema-versions && npm run generate",
    "build": "tsup",
    "prepublishOnly": "npm run verify-versions && npm run build && npm run test"
  }
}
```

**Build workflow:**
1. `prebuild` runs automatically before `build`
2. Schema versions are updated from package.json
3. TypeScript code is generated from schemas
4. Project is built with tsup

**Publish workflow:**
1. `prepublishOnly` runs automatically before `npm publish`
2. Version consistency is verified (hard fail if inconsistent)
3. Project is built
4. All tests run
5. Only then does publish proceed

## Files Affected by Version

### Schema Files (26 files)
- `/schemas/ubml.schema.yaml`
- `/schemas/documents/*.document.yaml` (12 files)
- `/schemas/fragments/*.fragment.yaml` (12 files)
- `/schemas/common/defs.schema.yaml`

### Generated TypeScript
- `/src/constants.ts` (auto-generated)
  - `VERSION` constant (e.g., "1.1.0")
  - `SCHEMA_VERSION` constant (e.g., "1.1")

### Source Code
- `/src/parser.ts` - No fallback, requires valid version in files

### Tests
- `/tests/integration/cli-init.test.ts` - Uses `SCHEMA_VERSION` import
- `/tests/workspace/example.test.ts` - Uses `SCHEMA_VERSION` import

## No Fallbacks Policy

**The project enforces strict version requirements:**

1. **Schema files MUST declare version** - Parser throws error if `ubml` property is missing
2. **package.json MUST have valid semver** - Scripts fail on missing/malformed version
3. **Version verification MUST pass** - Publish fails if versions are inconsistent

This ensures:
- No silent version mismatches
- Immediate feedback on version issues
- Cannot publish with inconsistent versions
- Clear error messages when version is missing

## Example: Version Bump Workflow

```bash
# 1. Bump version in package.json
npm version minor
# → Updates package.json: 1.1.0 → 1.2.0
# → Creates git tag: v1.2.0

# 2. Build (automatically updates schemas and generates code)
npm run build
# → Runs update-schema-versions (updates 26 schema files)
# → Runs generate (updates TypeScript constants)
# → Builds with tsup

# 3. Verify and test
npm run verify-versions
npm test

# 4. Commit and push
git add .
git commit -m "Bump version to 1.2.0"
git push --follow-tags

# 5. Publish
npm publish
# → Runs verify-versions (fails if any mismatch)
# → Runs build
# → Runs tests
# → Publishes to npm
```

## Schema Publication

Schema files are published to GitHub Pages at:
- `https://ubml.io/schemas/1.1/...`
- `https://ubml.io/schemas/1.2/...`
- etc.

The version in the URL is automatically updated when schemas are updated.

## Troubleshooting

### Version mismatch detected

```bash
❌ Found 3 version inconsistency issue(s)
```

**Solution:**
```bash
npm run update-schema-versions
npm run generate
```

### Missing ubml property in file

```bash
Error: Missing required 'ubml' property in example.yaml
```

**Solution:** Add version to YAML file:
```yaml
ubml: "1.1"
```

### Invalid version format

```bash
❌ Invalid semver format: "1.1"
   Expected format: X.Y.Z (e.g., "1.1.0")
```

**Solution:** Use full semver in package.json:
```json
{
  "version": "1.1.0"
}
```
