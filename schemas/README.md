# UBML Schema Reference

This directory contains the UBML (Unified Business Modeling Language) JSON Schema definitions.

> For file naming conventions, ID patterns, and VS Code setup, see the main [README](../README.md).

## Naming Conventions

Type names use **PascalCase**. For acronyms, only capitalize the first letter:
- `KpiRef` (not `KPIRef`)
- `ApiKey` (not `APIKey`)
- `ScqhBlock` (not `SCQHBlock`)

This ensures consistent naming across the schema and prevents case-sensitivity issues in tooling.

## Architecture

The schema follows a three-tier architecture for maintainability and modularity:

```
schemas/
├── ubml.schema.yaml              # Root schema - validates complete UBML files
│
├── defs/                         # Layer 1: Shared Definitions
│   ├── refs.defs.yaml            # ID reference types (ActorRef, StepRef, etc.)
│   ├── primitives.defs.yaml      # Duration, Money, Rate, Expression, Calendar
│   └── shared.defs.yaml          # CustomFields, Annotations, Priority, Outcomes
│
├── types/                        # Layer 2: Reusable Type Definitions
│   ├── actor.types.yaml          # Actor, Persona
│   ├── block.types.yaml          # Block (control flow)
│   ├── document.types.yaml       # Document (data object)
│   ├── entity.types.yaml         # Entity, Attribute, Relationship
│   ├── hypothesis.types.yaml     # HypothesisTree, HypothesisNode, SCQH
│   ├── link.types.yaml           # Link, SchedulingProperties
│   ├── location.types.yaml       # Location
│   ├── metrics.types.yaml        # KPI, KPIThreshold, ROI
│   ├── mining.types.yaml         # MiningSource, ActivityMapping, ResourceMapping
│   ├── process.types.yaml        # Process, Phase
│   ├── resource.types.yaml       # Skill, ResourcePool, Equipment
│   ├── scenario.types.yaml       # Scenario, WorkAttribute, Arrivals
│   ├── step.types.yaml           # Step, RACI, Loop, ProcessCall, Approval, Review
│   ├── strategy.types.yaml       # ValueStream, Capability, Product, Service
│   └── view.types.yaml           # View, ViewFilter, ViewStyling
│
└── documents/                    # Layer 3: File-Level Validation
    ├── actors.schema.yaml        # *.actors.ubml.yaml
    ├── entities.schema.yaml      # *.entities.ubml.yaml
    ├── glossary.schema.yaml      # *.glossary.ubml.yaml
    ├── hypotheses.schema.yaml    # *.hypotheses.ubml.yaml
    ├── links.schema.yaml         # *.links.ubml.yaml
    ├── metrics.schema.yaml       # *.metrics.ubml.yaml
    ├── mining.schema.yaml        # *.mining.ubml.yaml
    ├── process.schema.yaml       # *.process.ubml.yaml
    ├── scenarios.schema.yaml     # *.scenarios.ubml.yaml
    ├── strategy.schema.yaml      # *.strategy.ubml.yaml
    ├── views.schema.yaml         # *.views.ubml.yaml
    └── workspace.schema.yaml     # *.workspace.ubml.yaml
```

## Schema Composition

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ubml.schema.yaml                             │
│                    (Complete model validation)                      │
│         Used for validating single-file UBML documents              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
         ┌────────────────────────┼────────────────────────────┐
         │                        │                            │
         ▼                        ▼                            ▼
┌─────────────────┐    ┌─────────────────┐          ┌─────────────────┐
│   documents/    │    │   documents/    │          │   documents/    │
│ process.schema  │    │ actors.schema   │   ...    │ hypotheses.*    │
│                 │    │                 │          │                 │
│ Validates:      │    │ Validates:      │          │ Validates:      │
│ *.process.ubml  │    │ *.actors.ubml   │          │ *.hypotheses.*  │
└────────┬────────┘    └────────┬────────┘          └────────┬────────┘
         │                      │                            │
         ▼                      ▼                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            types/                                   │
│              Reusable type definitions ($defs)                      │
│                 Imported via $ref by documents                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            defs/                                    │
│        Foundation: refs, primitives, shared definitions             │
│                    Always required by all schemas                   │
└─────────────────────────────────────────────────────────────────────┘
```

## JSON Schema Version

All schemas use JSON Schema draft 2020-12:

```yaml
$schema: "https://json-schema.org/draft/2020-12/schema"
```

## Getting Started

See individual schema files for detailed examples and documentation. Each schema file contains comprehensive descriptions, use cases, and examples.

For usage examples, see the [examples directory](../examples/).

