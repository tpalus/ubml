# UBML Migration Guide

Guide for migrating between UBML schema versions.

## Version Compatibility

| From Version | To Version | Migration Complexity |
|-------------|------------|---------------------|
| Pre-1.0 | 1.0 | Fresh start (no migration needed) |

## Migrating to 1.0

Version 1.0 is the first public release. If you have pre-release UBML files, follow these guidelines:

### File Naming

Update file extensions to follow the new convention:

```
Old                          →  New
project.yaml                 →  project.workspace.ubml.yaml
processes.yaml               →  main.process.ubml.yaml
actors.yaml                  →  organization.actors.ubml.yaml
```

### Version Declaration

All files must include the version declaration:

```yaml
# Add this as the first property
ubml: "1.0"
```

### ID Patterns

Ensure all IDs follow the standard patterns:

| Old Pattern | New Pattern |
|-------------|-------------|
| `actor-1` | `AC001` |
| `PROC_001` | `PR001` |
| `step_verify` | `ST001` |

### Schema References

Update any `$ref` paths to use the new structure:

```yaml
# Old
$ref: "#/definitions/Actor"

# New (in document schemas)
$ref: "fragments/actor.fragment.yaml#/$defs/Actor"
```

## Future Migrations

### Non-Breaking Changes (Minor/Patch)

Minor and patch releases are backward compatible:
- New optional properties
- New document types
- Expanded enum values
- Documentation improvements

No migration needed - existing files continue to work.

### Breaking Changes (Major)

Major releases may include breaking changes:
- Property renames or removals
- Type changes
- Required property additions
- ID pattern changes

Migration guides will be provided for each major release.

## Validation After Migration

After migrating, validate your files:

```bash
# Using the CLI
npx @ubml/cli validate my-file.process.ubml.yaml

# Using ajv directly
npx ajv validate \
  -s node_modules/@ubml/schema/schemas/documents/process.document.yaml \
  -d my-file.process.ubml.yaml
```

## Getting Help

- [GitHub Issues](https://github.com/ubml/ubml-schema/issues) - Report migration problems
- [Discussions](https://github.com/ubml/ubml-schema/discussions) - Ask questions
