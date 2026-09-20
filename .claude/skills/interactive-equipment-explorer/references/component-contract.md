# Component catalog and scene contract

## Minimal interoperable data

Preserve the host application's schema when it works. The included JSON is a normalized interchange example for validation; export an adapter if needed. Other skills can consume equivalent fields without requiring this skill to be installed.

| Field | Meaning |
| --- | --- |
| `schema_version`, `guide_id`, `revision` | Schema compatibility and content identity; change revision when guide content changes |
| `sources[]` | `source_id`, `kind`, `locator`; optionally scope, date, revision, parent source, and edit history |
| `components[].component_id` | Stable physical/logical identity within the guide |
| `label`, `kind` | User-facing name and category |
| `parent_id` | Mechanical or assembly parent; never use this to imply signal flow |
| `confidence`, `source_ids` | Evidence summary; split mixed-certainty facts into optional claims with their own sources |
| `geometry_status` | `measured`, `photo_approximation`, `illustrative`, or `unknown` |
| `aliases[]`, `view_ids[]` | Search synonyms and supported views |
| `purpose`, `action`, `expected_result`, `limits` | Operator notes without guessed directions or settings |
| `views[].view_id`, `component_ids` | View membership, optionally region or pose data |
| `lessons[].lesson_id`, `component_ids` | Lesson references, not equipment readiness |

Use separate datasets for scene geometry, lesson attempts, field checks, and signal edges. Do not put all readiness in one component boolean. Store the full claim ledger when label, location, function, and installed state have different evidence.

## Selection and transforms

Use one selection state keyed by ID; derive list focus, panel content, visual highlight, and route from it. Keep visual numbering disposable. Define whether a selection is an assembly or a control before grouping geometry. Include an explicit deselect/reset path.

In 3D, associate pickable descendants with component IDs; resolve nested groups consistently. Use world-space bounds after transforms for framing. Keep a moved child's highlight under the moving parent. In photo/SVG views, maintain one image coordinate space and transform the regions with the image, including cropping/letterboxing.

Expose alternative selection for overlap; do not solve all ambiguity by making invisible hitboxes larger. Keep an active selection distinguishable by text/shape as well as color. Do not promise meaningful screen-reader access to raw geometry; expose the same names, relationships, and operating instructions in semantic HTML.

## Examples to preserve

A flip LCD is a hinged assembly whose inner screen and outer controls move together. A clamp-on focus demand and its supporting pan handle are distinct components with an attachment relationship. A ground spreader differs from a mid-level spreader and a wheeled dolly; model only the evidenced configuration. A rotating fiber connector's modeled range is illustrative until its mechanical limits are sourced.

These are modeling examples from the discussion, not verified configuration for another rig.
