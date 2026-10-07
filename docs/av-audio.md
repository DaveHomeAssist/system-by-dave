# AV Audio application brief

Audio operators need one channel identity across input planning, patch assignment and line check, plus a separate speaker zone plan. The first useful slice edits these records in one console, shows gaps, saves explicitly, exports JSON and previews imports from the four original browser tools. Original localStorage entries remain untouched. Imports retain each original JSON payload and all row fields in source snapshots, with a deterministic reimport fingerprint and an explicit replace of active working rows. A malformed or unsupported file cannot change the working document.

Flow: start a channel, assign stagebox/input and destination, mark a line check with operator and problem, then review gaps. Speaker zones remain separate. Save stores one `sbd.avAudio.v1` document; export is the portable backup. The shared console stores only panel arrangements. No sound measurement, console control, RF coordination, comms semantics, or safety verdict is implied.

Acceptance: reload returns saved edits; duplicate import is detected; bad imports preserve records; original legacy keys stay byte-identical; keyboard and phone panel paths work; desktop and phone shells do not page-scroll. Publishing needs Rail registry, offline assets, sitemap and domain staging integration by the Rail owner. Physical operator acceptance remains open.
