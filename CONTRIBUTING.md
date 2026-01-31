# Contributing to UBML

UBML is maintained by [NETWORG](https://networg.com) and used in production by TALXIS®.

## Development Setup

```bash
npm install
npm run build
npm test
```

## Making Changes

1. Read `/docs/PRINCIPLES.md` before modifying the language
2. For significant changes, add a decision record to `/docs/DESIGN-DECISIONS.md`
3. Update `/docs/OPEN-TOPICS.md` for unresolved questions
4. Run `npm test` and `npm run typecheck` before committing

## Schema Files

| Type | Pattern | Location |
|------|---------|----------|
| Common definitions | `*.schema.yaml` | `schemas/common/` |
| Fragments | `*.fragment.yaml` | `schemas/fragments/` |
| Documents | `*.schema.yaml` | `schemas/documents/` |

Every property must have a description explaining purpose, not just type.

## Questions?

Open an issue or check `/docs/` for design context.
