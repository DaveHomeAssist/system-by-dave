# Lesson design and assessment

## Compact lesson anatomy

| Element | Include |
| --- | --- |
| Task | A concrete action in operator language |
| Equipment scope | Model/rig, applicable configuration, source revision |
| Starting condition | What must already be true for the action |
| Component IDs | The target and meaningful distractors |
| Demonstration | The action and a visible expected result |
| Independent prompt | The task without disclosing the answer |
| Hints | Location clue, function clue, then explicit reveal |
| Feedback | Why the chosen control fits or does not fit the task |
| Completion | Independent, hinted, revealed, or incomplete |
| Transfer check | Equivalent task on the actual rig, recorded separately |

## Distinguish often-confused controls

Teach a lock as stopping an axis, drag as changing resistance, and counterbalance as supporting the load through tilt. Source details for the actual head before specifying settings. Keep a sliding clamp distinct from the camera's quick release when both exist. Do not assume all plates have a secondary catch.

A viewfinder brightness setting changes the monitoring display; it does not itself establish correct capture exposure. Peaking is a focusing aid rather than the lens-focus adjustment. For ND and electronic back-focus controls, source positions, labels, and procedure from the exact equipment manual. Do not transfer a button function across lens families because its housing looks similar.

## Attempt accounting

Initialize each new attempt with `wrong_component_ids: []`, `hint_count: 0`, `revealed: false`, `outcome: incomplete`. On completion: `revealed` takes precedence over `hinted`, which takes precedence over `independent`. Keep `first_attempt_correct` separately so a learner who eventually succeeds without hints is not mislabeled first-try correct. Avoid storing identities when anonymous session data meets the purpose.

Keep training outcomes separate from field states `Pass`, `Issue`, `Not checked`, or the project's established equivalents. Field evidence should describe the expected and actual observation; a checkbox in a lesson is not that evidence.

## Pilot protocol

Choose a few consequential confusions from field observations. Record an unaided baseline; train; observe equivalent tasks on the real equipment; repeat after a meaningful delay if retention is in scope. Record timing conditions and task order. Distinguish practice/repetition effects from demonstrated transfer, and avoid claiming causation from an uncontrolled small trial. Report the sample and missing devices/rigs alongside findings.
