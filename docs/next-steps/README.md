# AV next steps projections

These two public-safe JSON projections maintain the existing `av-consolidation`
and `av-video` entries in the private cross-project board. They summarize the
[maintained consolidation specification](../av-suite-consolidation-spec.md),
[Video phase plan](../av-suite-consolidation-stage2-video.md),
[viewport workflow contract](../av-workspace.md), and verified release evidence.
They are not a second roadmap or permission to execute embedded kickoff text.

- [AV Suite projection](av-consolidation.json): Toolbox, Workbook withdrawal and
  remaining application consolidation.
- [AV Video and viewport projection](av-video.json): delivered viewport work,
  open PR coverage, specialist follow-ups and physical acceptance.

After meaningful work, recheck the owning source and release evidence; update
only the affected projection. Preserve stable IDs, unanswered choices, historical
finding identities and the distinction between implementation, tests, merged,
deployed and human-accepted states. `evidence.sourceRevision` is the application
revision inspected, not the later documentation commit that carries the record.
Do not advance that field merely because this JSON was committed.

The workspace's governed updater reads these records from the inspected checkout
or fetched `origin/main`. It registers both existing IDs, takes a lock, preserves
an exact private backup and verifies readback. Use its `--check` mode to verify
parity after refreshing. The private board, original audit snapshots, personal
paths and private evidence must never be copied into this public repository.

The October 4 reconciliation supersedes the pilot-era not-live and whole-catalog
overflow counts. It retains unresolved audit findings as dated revalidation work;
passing viewport matrices do not automatically close those findings. Completed
findings remain under `historicalFindings`; resolved questions remain under
`decisionsResolved`, with the basis for resolution. Unanswered questions stay in
`decisionsForDave`. Full original private entries remain in the updater backups.
