# Open Topics

Language design questions and areas that need further work.

## Needs Design Decision

Areas where we need to make and document architectural choices:

- **Actor types and RACI** — How do actor types (role, system, external) interact with RACI assignments? What's the projection to ArchiMate Actor vs Role?
- **Entity relationships** — How do we model relationships between entities? Foreign keys? Association types?
- **Metrics and measurement** — How do KPIs connect to process steps and scenarios? What's the relationship between metrics and evidence?
- **Hypothesis decomposition** — How deep can hypothesis trees go? What operators (AND/OR) are supported?
- **Workspace organization** — When should content be split across files? How do cross-file references resolve?

## Schema Evolution

Active questions about the current schema:

- Review step `kind` values — are all needed? Any missing?
- Block operators (`par`, `alt`, `opt`, `loop`) — sufficient for common patterns?
- Duration/Money/Rate primitives — are the formats right?
- Expression language — what subset do we actually need?

## Tooling Considerations

Things that affect language design but are primarily tooling concerns:

- Validation strictness levels — how do we implement progressive validation?
- BPMN export fidelity — what's acceptable loss?
- Process mining import — what evidence types do we need?

---

*Add topics as they arise. Move to DESIGN-DECISIONS.md once resolved.*
