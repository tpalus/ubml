# Contributing to UBML Schema

Thank you for your interest in contributing to UBML! This document provides guidelines and information for contributors.

> **Maintainer**: UBML is actively maintained and developed by [NETWORG](https://networg.com) and used in production by TALXIS®, Microsoft Power Platform business apps and tools.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Schema Development Guidelines](#schema-development-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows a standard code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- A YAML-aware editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ubml-schema.git
   cd ubml-schema
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/ubml/ubml-schema.git
   ```

## Development Setup

```bash
# Install dependencies
npm install

# Validate all schemas
npm run validate

# Run tests
npm test

# Build documentation
npm run docs
```

## Schema Development Guidelines

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Root schema | `ubml.schema.yaml` | `ubml.schema.yaml` |
| Common definitions | `*.schema.yaml` | `defs.schema.yaml` |
| Fragments | `*.fragment.yaml` | `process.fragment.yaml` |
| Documents | `*.document.yaml` | `process.document.yaml` |

### Schema Structure

All schema files must include:

```yaml
# ============================================================================
# UBML [Schema Name]
# ============================================================================
# Brief description of what this schema defines.
#
# VERSION: 1.0
# ============================================================================

$schema: "https://json-schema.org/draft/2020-12/schema"
$id: "https://ubml.io/schemas/1.0/[path]/[filename].yaml"
title: "UBML [Title]"
description: |
  Detailed description of the schema purpose and usage.
```

### Documentation Requirements

Every property MUST have a description:

```yaml
properties:
  name:
    description: |
      Human-readable name displayed in diagrams and reports.
      Should be concise (3-7 words) for readability.
      
      Examples:
        - "Customer Onboarding"
        - "Review Purchase Order"
    type: string
```

**Standards:**
- Use multi-line `|` syntax for descriptions longer than 80 characters
- Include `Examples:` section where helpful
- Explain WHY, not just WHAT
- Reference related concepts
- Document constraints and edge cases

### ID Pattern Conventions

New element types must follow the established pattern:

```
[2-3 letter prefix][5+ digits, zero-padded]
```

| Reserved | Element Type |
|----------|--------------|
| AC | Actor |
| PR | Process |
| ST | Step |
| EN | Entity |
| ... | (see README for complete list) |

When adding new element types:
1. Choose a unique 2-3 letter prefix
2. Document in `defs.schema.yaml`
3. Add to README ID pattern table
4. Create corresponding `*Ref` type

### Breaking vs Non-Breaking Changes

**Non-breaking changes (patch/minor version):**
- Adding new optional properties
- Adding new document types
- Expanding enums with new values
- Improving descriptions

**Breaking changes (major version):**
- Removing or renaming properties
- Changing property types
- Making optional properties required
- Changing ID patterns
- Removing enum values

## Pull Request Process

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(process): add support for subprocess nesting
fix(defs): correct ActorRef pattern to allow 4+ digits
docs(readme): add VS Code setup instructions
```

### PR Checklist

Before submitting:

- [ ] Schema validates with `npm run validate`
- [ ] All tests pass with `npm test`
- [ ] Documentation updated for new features
- [ ] CHANGELOG.md updated
- [ ] No breaking changes (or major version bump justified)
- [ ] Examples added for new features

### Review Process

1. Create PR against `main` branch
2. Ensure CI checks pass
3. Request review from maintainers
4. Address feedback
5. Squash and merge when approved

## Reporting Issues

### Bug Reports

Include:
- Schema version
- Minimal YAML that reproduces the issue
- Expected behavior
- Actual behavior
- Validator used (if applicable)

### Feature Requests

Include:
- Use case description
- Proposed YAML syntax
- How it fits with existing patterns
- Any alternatives considered

## Questions?

- Open a [Discussion](https://github.com/ubml/ubml-schema/discussions)
- Check existing [Issues](https://github.com/ubml/ubml-schema/issues)
- Review the [documentation](./docs/)

---

Thank you for contributing to UBML! 🎉
