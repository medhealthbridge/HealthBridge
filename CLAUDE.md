@AGENTS.md

# Blueprint (read before building)

This repo has a blueprint. Start at `BLUEPRINT.md` (document map, locked decisions D-xx, open questions OQ-xx). Details live in `docs/PRD.md`, `docs/APP_FLOW.md`, `docs/SCHEMA.md`, `docs/TRD.md`, `docs/DESIGN_BRIEF.md`, `docs/IMPLEMENTATION_PLAN.md`. As-built snapshots are in `docs/baseline/`.

Working rules:
- Work from `docs/IMPLEMENTATION_PLAN.md`: one task (K-xxx) at a time; its proof tests (T-xxx) must pass; follow the done rule in its section 7.
- The documents win for new work. Built behaviour in `docs/baseline/` is the test standard; if code and document disagree, report it, do not decide silently.
- Cite IDs (FR-xxx, S-xx, E-xx, P-xx, D-xx) instead of copying text. Change a document first, then the code, then the tests; add a line to the document's change log.
- Permissions: the matrix in `docs/SCHEMA.md` section 5 is the source for every allow/deny test.
- After each wave, and before any launch, run the `quality` agent (`.claude/agents/quality.md`).
- Say plainly what was not verified. The cloud sandbox cannot reach npm or Neon; gates run in CI.
