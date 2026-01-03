# Changelog

All notable changes to the UBML Schema will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release preparation

## [1.0.0] - 2024-01-01

### Added

#### Core Schema
- Root `ubml.schema.yaml` for complete document validation
- Three-tier schema architecture: common → fragments → documents
- JSON Schema draft 2020-12 compliance

#### Document Schemas
- `workspace.document.yaml` - Workspace configuration
- `process.document.yaml` - Process definitions
- `actors.document.yaml` - Actor and role definitions
- `entities.document.yaml` - Information model (entities, documents, locations)
- `scenarios.document.yaml` - Simulation scenarios
- `hypotheses.document.yaml` - SCQH hypothesis trees
- `strategy.document.yaml` - Value streams, capabilities, products
- `metrics.document.yaml` - KPIs and ROI analysis
- `mining.document.yaml` - Process mining configuration
- `views.document.yaml` - Custom view definitions
- `links.document.yaml` - Cross-process links
- `glossary.document.yaml` - Terminology definitions

#### Fragment Schemas
- `actor.fragment.yaml` - Actor and Persona types
- `process.fragment.yaml` - Process, Phase, ProcessTrigger types
- `step.fragment.yaml` - Step, Block, RACI types
- `entity.fragment.yaml` - Entity, Document, Location types
- `link.fragment.yaml` - Link definitions
- `scenario.fragment.yaml` - Scenario configuration
- `hypothesis.fragment.yaml` - SCQH and HypothesisNode types
- `resource.fragment.yaml` - Skill, ResourcePool, Equipment types
- `strategy.fragment.yaml` - ValueStream, Capability, Product, Service types
- `metrics.fragment.yaml` - KPI, ROI types
- `mining.fragment.yaml` - Mining source and mapping types
- `view.fragment.yaml` - View configuration types

#### Common Definitions
- `defs.schema.yaml` - All reference types (ActorRef, ProcessRef, etc.)
- Duration, Money, Rate primitives
- Expression language specification
- Common enums and patterns

#### Documentation
- Comprehensive README with quick start guide
- VS Code integration instructions
- Element ID pattern reference
- File naming conventions

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- N/A (initial release)

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 1.0.0 | 2024-01-01 | Current |

[Unreleased]: https://github.com/ubml/ubml-schema/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ubml/ubml-schema/releases/tag/v1.0.0
