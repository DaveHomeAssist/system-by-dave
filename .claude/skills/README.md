# Agent skills

Skills available to coding agents working in this repository. Each directory is
a self-contained bundle: `SKILL.md` holds the instructions, `references/` holds
the sourced detail, `assets/` holds record and catalog templates, `scripts/`
holds local validators, and `agents/openai.yaml` carries the Codex/ChatGPT
interface metadata so the same bundle works across agent platforms.

Slash commands live in `.claude/commands/` and are separate from these.

## Interactive equipment guides

Five skills covering one workflow: build an equipment explorer, teach from it,
correct it, and verify its release. They are written for interactive equipment
guides and instructional rig models generally; they assert nothing about the
rigs, catalogs, or configurations already in this repository.

| Skill | Use it for |
| --- | --- |
| `interactive-equipment-explorer` | Clickable diagrams and rotatable 3D trainers with stable component IDs, whole-part highlighting, articulated controls, and text/photo fallbacks |
| `equipment-signal-trainer` | Sourced signal-path lessons and observation-based troubleshooting, keeping picture, return, control, tally, intercom, reference, and power separate |
| `operator-control-lessons` | Guided practice, find-the-control exercises, and physical-rig transfer checks built from observed operator confusion |
| `equipment-correction-propagation` | Carrying one corrected fact through source data, diagrams, lessons, search, exports, and authorized published copies |
| `interactive-guide-release-check` | Verifying a guide across desktop, tablet, phone, accessible alternatives, offline delivery, and the deployed version |

`interactive-equipment-explorer` owns the component catalog the other four
consume. Reuse its `component_id` values rather than minting parallel ones.

## Local validators

Neither script makes network requests, runs a browser, or deploys anything.
Both check structure only, never equipment facts. Python 3.9 or newer.

```sh
python3 .claude/skills/interactive-equipment-explorer/scripts/validate_catalog.py CATALOG.json
python3 .claude/skills/interactive-guide-release-check/scripts/artifact_manifest.py create DIST_DIR --guide-id ID --revision REV --out MANIFEST.json
python3 .claude/skills/interactive-guide-release-check/scripts/artifact_manifest.py verify DIST_DIR --manifest MANIFEST.json
```

Place the manifest outside `DIST_DIR`; the script refuses to hash itself.

## Relationship to this repository

These skills do not replace the contracts in `AGENTS.md`. Repository release
authority, verification commands, product boundaries, and the public shell and
content contracts still govern any change made while following one. Where a
skill describes a release step and `AGENTS.md` defines the gate for it, the
repository contract wins.
