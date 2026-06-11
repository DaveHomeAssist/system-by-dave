# YouTube Pipeline Production Plan

Status: phase 1 complete, production gate still closed.

## Completed

1. Data loss guard

   Existing Notion pages now open with the script body locked until the page body is explicitly loaded. Metadata saves no longer call `replace_content` unless the script body was loaded and then changed.

   Evidence:

   ```text
   node youtube-pipeline-regression-2026-06-11.js
   youtube pipeline regression checks passed
   ```

2. Script body load control

   The drawer now exposes a `Load page body` action for persisted Notion pages. It tries `notion-fetch` with `id`, then falls back to `page_id`.

3. AI script action guard

   `tighten` and `seo` actions now require a loaded script body for persisted pages.

## Remaining Production Issues

1. Live Notion payload verification

   Risk: row parsing and page body extraction are still based on defensive guesses.

   Acceptance criteria:

   1. Capture real `notion-query-database-view` payload for `DB | YouTube Pipeline`.
   2. Capture real `notion-fetch` payload for one page with body content.
   3. Add fixtures covering both payloads.
   4. Prove board rows, dates, people, tags, and page body extraction from those fixtures.

2. Runtime boundary

   Risk: this still depends on `window.cowork`, a hard coded MCP connector id, and artifact host privileges.

   Acceptance criteria:

   1. Move reads and writes behind a controlled app runtime.
   2. Load connector or Notion credentials from environment config.
   3. Return typed JSON to the browser.
   4. Add request timeout handling.

3. Database identity and schema validation

   Risk: new page creation still derives database id from a copied view URL.

   Acceptance criteria:

   1. Store an explicit database id.
   2. Validate required properties on connect.
   3. Show a blocking setup error when a property is missing or has the wrong type.

4. Write audit and conflict handling

   Risk: parallel edits in Notion or another browser can be overwritten silently.

   Acceptance criteria:

   1. Track last loaded timestamp or version where the connector exposes it.
   2. Warn before saving over a changed page.
   3. Log page id, changed fields, actor context, and outcome for every write.

5. Browser verification

   Risk: the HTML parses, but full UI flows have not been exercised in a browser against a real host.

   Acceptance criteria:

   1. Smoke test setup, board render, drawer open, metadata save, stage advance, script body load, script save, failed write, and offline draft restore.
   2. Test desktop and mobile widths.
   3. Confirm zero console errors for the smoke paths.

6. Storage and privacy posture

   Risk: local drafts and database URLs are stored in `localStorage`.

   Acceptance criteria:

   1. Add clear draft controls.
   2. Avoid storing full script body unless the user edits it.
   3. Document what is stored locally.
   4. Decide whether draft storage needs encryption or should be replaced by server persisted drafts.

## Next Phase

Phase 2 should be live Notion payload verification plus fixtures. Do not build a deploy target until the actual connector response shapes are pinned.
