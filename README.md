# UBML - Unified Business Modeling Language

<div align="center">

[![Schema Version](https://img.shields.io/badge/schema-v1.0-blue.svg)](./schemas/ubml.schema.yaml)
[![JSON Schema Draft](https://img.shields.io/badge/JSON%20Schema-2020--12-green.svg)](https://json-schema.org/draft/2020-12/schema)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ubml/ubml-schema/ci.yml?label=CI&logo=github&style=flat-square)](https://github.com/ubml/ubml-schema/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

</div>

**UBML** is a YAML-based domain-specific language for business process modeling. It provides a structured, human-readable notation for capturing and analyzing business processes, organizational structures, and strategic initiatives.

## ✨ Key Features

- **📋 Problem Framing** — Hypothesis trees with SCQH (Situation-Complication-Question-Hypothesis) framework
- **📊 Process Modeling** — Multi-level processes (L1-L4), steps, links, blocks, phases
- **👥 Actors & Resources** — Roles, teams, systems, skills, resource pools, equipment
- **📄 Information Model** — Entities, documents, locations, relationships
- **📈 Metrics & Analysis** — KPIs, ROI analysis, simulation scenarios
- **⛏️ Process Mining** — Event log integration, activity mapping, conformance checking
- **🎯 Strategy** — Value streams, capabilities, products, services, portfolios

## 📦 Installation

### NPM / Yarn

```bash
npm install @ubml/schema
# or
yarn add @ubml/schema
```

### Direct Download

Download the schema files from the [releases page](https://github.com/ubml/ubml-schema/releases) or clone this repository:

```bash
git clone https://github.com/ubml/ubml-schema.git
```

## 🚀 Quick Start

### 1. Create a Workspace

Create a file named `my-project.workspace.ubml.yaml`:

```yaml
ubml: "1.0"
name: "Customer Onboarding"
description: "End-to-end customer onboarding process optimization"
status: draft

organization:
  name: "ACME Corp"
  department: "Operations"
```

### 2. Define a Process

Create `onboarding.process.ubml.yaml`:

```yaml
ubml: "1.0"

processes:
  PR001:
    name: "Customer Onboarding"
    description: "Onboard new customers from initial contact to activation"
    level: L3
    
    steps:
      ST001:
        name: "Receive Application"
        type: task
        responsible: AC001
        duration: "15min"
        
      ST002:
        name: "Verify Documents"
        type: task
        responsible: AC002
        duration: "2h"
```

### 3. Enable Editor Support

Add to your `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "https://ubml.io/schemas/1.0/documents/workspace.document.yaml": "*.workspace.ubml.yaml",
    "https://ubml.io/schemas/1.0/documents/process.document.yaml": "*.process.ubml.yaml",
    "https://ubml.io/schemas/1.0/documents/actors.document.yaml": "*.actors.ubml.yaml",
    "https://ubml.io/schemas/1.0/documents/entities.document.yaml": "*.entities.ubml.yaml"
  }
}
```

## 📁 File Types

UBML uses file naming conventions for schema association:

| File Pattern | Purpose | Example |
|-------------|---------|---------|
| `*.workspace.ubml.yaml` | Workspace configuration | `acme.workspace.ubml.yaml` |
| `*.process.ubml.yaml` | Process definitions | `onboarding.process.ubml.yaml` |
| `*.actors.ubml.yaml` | Actors, roles, teams | `organization.actors.ubml.yaml` |
| `*.entities.ubml.yaml` | Information model | `data-model.entities.ubml.yaml` |
| `*.scenarios.ubml.yaml` | Simulation scenarios | `what-if.scenarios.ubml.yaml` |
| `*.hypotheses.ubml.yaml` | Hypothesis trees | `problem.hypotheses.ubml.yaml` |
| `*.strategy.ubml.yaml` | Strategic elements | `capabilities.strategy.ubml.yaml` |
| `*.metrics.ubml.yaml` | KPIs and analysis | `kpis.metrics.ubml.yaml` |
| `*.mining.ubml.yaml` | Process mining config | `event-logs.mining.ubml.yaml` |
| `*.views.ubml.yaml` | Custom views | `diagrams.views.ubml.yaml` |
| `*.links.ubml.yaml` | Cross-process links | `integrations.links.ubml.yaml` |
| `*.glossary.ubml.yaml` | Terminology | `terms.glossary.ubml.yaml` |

## 🏗️ Schema Architecture

The schema follows a three-tier architecture:

```
schemas/
├── ubml.schema.yaml          # Root schema for complete validation
├── common/                   # Shared definitions (always required)
│   └── defs.schema.yaml      # References, primitives, expressions
├── fragments/                # Reusable type definitions
│   ├── actor.fragment.yaml   # Actor, Persona types
│   ├── process.fragment.yaml # Process, Phase types
│   ├── step.fragment.yaml    # Step, Block types
│   └── ...
└── documents/                # File-level validation schemas
    ├── workspace.document.yaml
    ├── process.document.yaml
    ├── actors.document.yaml
    └── ...
```

See [schemas/README.md](./schemas/README.md) for detailed schema documentation.

## 🆔 Element ID Patterns

All elements use typed ID patterns for clarity and tooling support:

| Pattern | Element | Pattern | Element |
|---------|---------|---------|---------|
| `PR###` | Process | `EN###` | Entity |
| `ST###` | Step | `DC###` | Document |
| `AC###` | Actor | `LO###` | Location |
| `SK###` | Skill | `SC###` | Scenario |
| `RP###` | Resource Pool | `HT###` | Hypothesis Tree |
| `EQ###` | Equipment | `VS###` | Value Stream |
| `CP###` | Capability | `PD###` | Product |
| `SV###` | Service | `PF###` | Portfolio |
| `KP###` | KPI | `ROI###` | ROI Analysis |
| `MS###` | Mining Source | `VW###` | View |
| `BK###` | Block | `PH###` | Phase |

## 📚 Documentation

- [Schema Reference](./docs/schema-reference.md) — Complete schema documentation
- [Examples](./examples/) — Sample UBML files for common use cases
- [Best Practices](./docs/best-practices.md) — Modeling guidelines and patterns
- [Migration Guide](./docs/migration.md) — Upgrading between versions

## 🔧 Validation

### Using JSON Schema Validators

```bash
# Using ajv-cli
npx ajv validate -s schemas/documents/process.document.yaml -d my-process.process.ubml.yaml

# Using check-jsonschema
pip install check-jsonschema
check-jsonschema --schemafile schemas/documents/process.document.yaml my-process.process.ubml.yaml
```

### Programmatic Validation (JavaScript/TypeScript)

```typescript
import Ajv from 'ajv';
import { loadSchema } from '@ubml/schema';

const ajv = new Ajv();
const validate = ajv.compile(await loadSchema('process'));

const isValid = validate(myDocument);
if (!isValid) {
  console.error(validate.errors);
}
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development

```bash
# Install dependencies
npm install

# Validate schemas
npm run validate

# Run tests
npm test

# Build documentation
npm run docs
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Related Projects

- [StrategyKit](https://github.com/talxis/strategykit) — Visual editor for UBML models
- [UBML CLI](https://github.com/ubml/ubml-cli) — Command-line tools for UBML
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ubml.vscode-ubml) — Editor support

---

<p align="center">
  <sub>Built for business analysts and process consultants</sub>
</p>
