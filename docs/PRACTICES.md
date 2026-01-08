# UBML Best Practices

Guidelines and recommendations for creating effective UBML models.

## File Organization

### File Naming Patterns

UBML supports two naming patterns for document files:

| Pattern | Example | When to use |
|---------|---------|-------------|
| Simple | `actors.ubml.yaml` | Single file of that type, minimal projects |
| Prefixed | `sales-team.actors.ubml.yaml` | Multiple files of same type, complex projects |

### Workspace Structure

**Simple workspace** (getting started):

```
my-project/
├── my-project.workspace.ubml.yaml
├── process.ubml.yaml
├── actors.ubml.yaml
└── entities.ubml.yaml
```

**Complex workspace** (organize by domain):

```
my-project/
├── my-project.workspace.ubml.yaml
├── glossary.ubml.yaml           # Singleton - shared terminology
├── strategy.ubml.yaml           # Singleton - strategic context
├── customer-service/
│   ├── onboarding.process.ubml.yaml
│   ├── support.process.ubml.yaml
│   └── service-team.actors.ubml.yaml
├── order-management/
│   ├── order-to-cash.process.ubml.yaml
│   └── order-entities.entities.ubml.yaml
└── shared/
    ├── actors.ubml.yaml
    └── master-data.entities.ubml.yaml
```

**Avoid** organizing by file type (this makes domain understanding harder):

```
❌ my-project/
├── processes/
│   └── *.process.ubml.yaml
├── actors/
│   └── *.actors.ubml.yaml
└── entities/
    └── *.entities.ubml.yaml
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| File names | kebab-case | `process.ubml.yaml` or `customer-onboarding.process.ubml.yaml` |
| Process names | Title Case | `"Customer Onboarding"` |
| Step names | Verb + Object | `"Verify Documents"` |
| Actor names | Role/Team Title | `"Customer Service Representative"` |
| Entity names | Singular noun | `"Customer"`, `"Order"` |

## ID Assignment

### Use Meaningful ID Ranges

Reserve ID ranges for logical groupings:

```yaml
# Actors
# AC00001-AC00999: Internal roles
# AC01000-AC01999: External parties
# AC02000-AC02999: Systems

actors:
  AC00001:
    name: "Operations Manager"
    type: role
  
  AC01000:
    name: "Partner Bank"
    type: external
  
  AC02000:
    name: "Core Banking System"
    type: system
```

### Leave Gaps for Future Additions

```yaml
# Leave room for related additions
steps:
  ST00010:
    name: "Receive Application"
  ST00020:  # Gap for intake-related steps
    name: "Validate Application"
  ST00030:  # Gap for validation-related steps
    name: "Begin Verification"
```

## Process Modeling

### Keep Processes Focused

Each process file should model one coherent workflow:

```yaml
✅ Good - Focused process
processes:
  PR00001:
    name: "Customer Onboarding"
    description: "From application to account activation"
    # 10-15 steps covering one journey

❌ Avoid - Everything in one process
processes:
  PR00001:
    name: "All Customer Operations"
    # 50+ steps covering multiple journeys
```

### Use Appropriate Step Types

```yaml
steps:
  # Start with an event
  ST00001:
    type: startEvent
    name: "Order Received"
  
  # Use tasks for actual work
  ST00002:
    type: task
    name: "Validate Order"
  
  # Use gateways for decisions
  ST00003:
    type: gateway
    gatewayType: exclusive
    name: "Order Valid?"
  
  # Use blocks for structured control flow
  ST00004:
    type: block
    operator: par
    name: "Parallel Checks"
```

### Document Business Rules

```yaml
steps:
  ST00002:
    name: "Validate Order"
    businessRules:
      - "Minimum order value is $100"
      - "Customer must have valid credit"
      - "Delivery address must be in service area"
```

## Hypothesis Trees

### Follow SCQH Structure

```yaml
scqh:
  situation: |
    # Current state - factual, uncontroversial
    # Answer: "What is the context?"
    
  complication: |
    # What changed - the problem or trigger
    # Answer: "Why is action needed now?"
    
  question: |
    # The key question to answer
    # Answer: "What decision do we need to make?"
    
  hypothesis: |
    # Proposed answer to validate
    # Answer: "What do we believe the answer is?"
```

### Structure Hypotheses as Trees

```yaml
hypotheses:
  HY00001:
    name: "Root Hypothesis"
    type: root
    children:
      - HY00002  # Supporting hypothesis 1
      - HY00003  # Supporting hypothesis 2
  
  HY00002:
    name: "Sub-Hypothesis A"
    type: supporting
    children:
      - HY00004  # Assumption
      - HY00005  # Assumption
```

### Link Evidence to Hypotheses

```yaml
evidence:
  EV00001:
    type: observation
    title: "Workshop Finding"
    linkedHypotheses:
      - HY00002
      - HY00005
```

## Documentation

### Use Descriptions Liberally

```yaml
processes:
  PR00001:
    name: "Customer Onboarding"
    description: |
      End-to-end process for onboarding new retail customers.
      
      Scope:
      - Individual customers only (not business accounts)
      - Checking and savings products
      - US domestic customers
      
      Key metrics:
      - Target duration: 2 business days
      - Target cost: $50 per customer
```

### Document Assumptions

```yaml
steps:
  ST00050:
    name: "Credit Check"
    assumptions:
      - "Credit bureau API available 99.9%"
      - "Response time under 5 seconds"
      - "Cost per check: $0.50"
```

## Performance

### Use References Instead of Duplication

```yaml
# Define once
actors:
  AC00001:
    name: "Customer Service Rep"

# Reference everywhere
steps:
  ST00001:
    responsible: AC00001  # Reference, not copy
  ST00002:
    responsible: AC00001
```

### Keep Files Reasonably Sized

- **Process files**: 200-500 lines (10-30 steps)
- **Actor files**: 100-300 lines (10-30 actors)
- **Entity files**: 100-300 lines (10-30 entities)

Split large models across multiple files.
