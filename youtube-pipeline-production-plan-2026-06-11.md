# YouTube Pipeline Production Plan

Status: phase 2 static safety complete, production gate still closed.

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

4. Static host read only guard

   The public GitHub Pages route now detects whether the Claude artifact host API is present. Without that host, Notion reads, Notion writes, new page creation, reload, and AI actions are disabled with a visible read only state.

5. Database identity validation

   Settings now require a valid Notion URL and store an explicit database ID for new page creation. New page writes fail before connector calls when the database ID is unavailable.

6. Safer local drafts

   Loaded page body content is no longer stored in `localStorage` unless the script body is edited. Settings also include a clear local drafts control.

7. Connector timeout

   MCP calls now have a 15 second UI timeout so connector hangs do not leave the page in an indefinite saving or loading state.

## Remaining Production Issues

1. Live Notion payload verification

   Risk: row parsing and page body extraction are still based on defensive guesses.

   Acceptance criteria:

   1. Capture real `notion-query-database-view` payload for `DB | YouTube Pipeline`.
   2. Capture real `notion-fetch` payload for one page with body content.
   3. Add fixtures covering both payloads.
   4. Prove board rows, dates, people, tags, and page body extraction from those fixtures.

2. Runtime boundary

   Risk: the editable workflow still depends on `window.cowork`, a hard coded MCP connector id, and artifact host privileges.

   Acceptance criteria:

   1. Move reads and writes behind a controlled app runtime.
   2. Load connector or Notion credentials from environment config.
   3. Return typed JSON to the browser.
   4. Add request timeout handling.

3. Database identity and schema validation

   Risk: property validation still depends on matching the assumed Notion schema.

   Acceptance criteria:

   1. Fetch the live database schema.
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

   Risk: edited drafts and database URLs are still stored in `localStorage`.

   Acceptance criteria:

   1. Document what is stored locally.
   2. Decide whether draft storage needs encryption or should be replaced by server persisted drafts.

## Next Phase

Phase 3 should be live Notion payload verification plus fixtures. Do not build a full production deploy target until the actual connector response shapes are pinned.
