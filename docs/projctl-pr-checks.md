# Parallel Projctl pull request checks

The public site workflow ran Projctl's Python checks, relay unit tests, 33
browser probes, and venue browser probe inside the general contracts job. Three
recent checks took 8:35 to 9:25 end to end. The Projctl step accounted for
5:50 to 6:23 of those runs. PR #609's original Projctl step took 6:41.

Run the existing site contract job, the Projctl relay and venue job, and four
Projctl browser jobs concurrently. All jobs run on every pull request. The
production Pages workflow and application runtime are outside the change.

The ordered suite lives in `apps/projctl/test/run-browser-suite.cjs`. Without
arguments the npm command runs every probe in its existing order. To run one
CI shard locally:

```sh
npm run test:browser --prefix apps/projctl -- --shard 2/4
```

Add `--list` after the shard argument to inspect its membership. The unit tests
check that the four shards cover each probe exactly once. The relay unit and
venue checks remain separate because they run different entry points.

Acceptance requires all original probes, relay, venue, and public site checks
to pass on the candidate PR. Compare the workflow's elapsed time to recent
serial runs. Parallel runners can reduce the wait while spending more total
runner time on duplicated setup.
