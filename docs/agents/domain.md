# Domain docs

This project uses a **single-context** layout:

- **`CONTEXT.md`** at repo root — architecture overview, key concepts, domain model
- **`docs/adr/`** — Architecture Decision Records documenting major design choices

## How agents consume these

- Read `CONTEXT.md` first to understand the system
- Consult `docs/adr/` for the reasoning behind architectural decisions
- Update `CONTEXT.md` if domain model or key concepts change
- Add new ADRs when making significant decisions (tool choice, API design, data model)

## Format

- `CONTEXT.md`: Free-form markdown; aim for < 2000 words
- ADRs: Numbered (e.g. `0001-api-versioning.md`), use [MADR format](https://adr.github.io/madr/) or similar
