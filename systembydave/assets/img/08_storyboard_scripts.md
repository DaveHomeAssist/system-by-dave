# Davai Operational Walkthrough Storyboards

These scripts are written for short implementation videos. They currently assume a
`mem` CLI. Rename the commands to the real tooling, or implement the CLI, before
recording.

## Video 1: Routing Mixed Intake

Goal: show that a single messy note should split into multiple memory records.

1. Open `working/inbox.md`.
2. Paste a mixed launch-review note with a blocker, dated observation, durable rule,
   source pointer, and process change.
3. Run:

```sh
mem route working/inbox.md --explain
```

4. Show proposed records:
   - `working/deploy-workflow.md`
   - `episodic/YYYY/MM/launch-review.md`
   - `semantic/performance-claims.md`
   - `procedural/janitor-link-check.md`
   - `reference/notion-davai-memory-layers.md`
5. Accept the split and open the generated INDEX.md diff.

Closing line: "The router does not pick the least-wrong folder. It splits by
retrieval question."

## Video 2: Janitor Drift Audit

Goal: show how the Janitor finds contradiction and preserves evidence.

1. Start with a stale semantic claim about benchmark charts.
2. Run:

```sh
mem janitor --drift --since 2026-05-01
```

3. Show the Janitor locating an episodic correction that says the chart data is
   synthesized.
4. Update the semantic note to prohibit performance claims until a real harness exists.
5. Link the semantic note to the episodic evidence and to the procedural benchmark task.
6. Rebuild INDEX.md and run the link checker.

Closing line: "Episodic is the evidence layer. The current fact changes, but the
correction trail stays visible."
