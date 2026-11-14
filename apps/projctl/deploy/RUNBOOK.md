# projctl runbook: Frozen at Walnut Street Theatre

One relay on the theatre network provides manual control and monitoring for the
four projectors. Crew open it in a browser. Record the active host and verified
crew URL in the private venue handoff before using this runbook. Prepared by
Dave Robertson (AV by Dave).

This is a deployment template. The private house operations guide owns the
accepted show procedure, staffing, cue route and recovery plan. Generic presets
and optional transports described here require venue acceptance before show use.
Remote access requires a separately configured and tested Tailscale deployment.

## Where it runs

| Item | Value |
| --- | --- |
| Relay box | [VENUE BOX], on the projector/sound management network, pinned DHCP lease |
| In the building | http://[RELAY-IP]:8080 |
| Off site (tailnet) | Record the verified Serve URL after configuring Tailscale; availability is unverified until tested from off site |
| Passcode | set at install, kept by the video lead; change with a reinstall |
| Cue input | OSC on UDP 9000, text lines on TCP 9001, LAN only |

## Daily

Use the venue's accepted power and cue sequence. The following manual-control
sequence is a reference for the designated operator. When playback software
sends projector commands directly, Projctl Show Lock cannot block that separate
path. Coordinate power commands, scheduled actions and monitoring so their
owners and targets are explicit. Run one designated Projctl relay for the rig.

1. Open the Rig tab. Every tile should show Powered or Standby with a circle beside the word. Offline means the relay cannot reach that projector: check its network cable and that it has an address.
2. Preshow: recall the preshow preset (tap Recall twice). Then turn on Show lock in the header. Lock blocks power off, input changes, test patterns, lens moves and picture changes from every phone.
3. Postshow: follow the accepted shutdown procedure. For manual power-off, turn Show Lock off, then All projectors, Power off. Check the listed targets and tap again within three seconds. Each confirmed target receives the command even if another slot is offline. Read the per-projector result. A newly online or reconfigured slot needs a fresh confirmation. Verify the manufacturer's completed cooling state before removing mains power. An unreachable device supplies no confirmation of cooling completion.

Barco UDM PJLink `POWR?` reports zero for Ready, Standby and Eco Standby.
A PJLink power-off request from On goes to Ready; another from Ready can enter
Standby or Eco Standby when enabled. Record the configured driver and inspect
its state evidence before repeating a shutdown request. Panasonic standby
network behavior depends on the installed standby setting. Keep state labels,
command acknowledgements and physical acceptance distinct.

Manufacturer reference: [Barco UDM PJLink command list](https://www.barco.com/manuals/R5911443/zweecd1065fw.html).

## If something is wrong

| Symptom | Do this |
| --- | --- |
| Tile says Offline, projector is on | Setup tab, press Find projectors. The relay rediscovers by MAC every minute on its own. |
| "auth failed" in the Log | The projector's PJLink or admin password changed. Setup tab, enter it, Save. |
| Shutter button does nothing | Wait 5 s; the projector answers slowly while the shutter moves. Then check the Log tab. |
| Picture sliders greyed | Check Show Lock and the input signal. Unlocking restores available settings; missing-signal values remain disabled. |
| Page asks for a passcode again | The relay restarted. Sign in again. |
| Nothing loads at all | On the relay box: macOS: open `~/Applications/Open Projctl.command`; Linux `sudo systemctl restart projctl`. |

## Install on the venue box (one time)

    git clone or copy the projctl folder onto the box
    cd projctl
    deploy/install.sh --passcode [CODE]       # asks for the passcode if omitted
    deploy/tailscale.sh serve                 # tailnet URL for phones off site

The optional Funnel mode publishes a public endpoint. Enabling it requires an
explicitly authorized public-access plan and its authentication review. A
private Serve deployment does not require Funnel.

Then Setup tab: enter each projector's IP, MAC, admin user and PJLink password, Save. Tiles go live within 10 s.

Keep the box awake. macOS: System Settings, Energy, Prevent automatic sleeping. Pi: nothing to do.

## Backups

    deploy/backup.sh [DEST]      # rig file, presets, log; keeps 30 snapshots

Cron it nightly on the box. Backups contain private operational data. Keep them private, including redacted copies.

## Strike (early January)

1. `deploy/backup.sh` one last time and copy the folder off the box.
2. `deploy/uninstall.sh` removes the service and resets Tailscale serve/funnel.
3. Sign the box out of Tailscale if it is house gear: `tailscale logout`.
4. Delete the app folder and the passcode from the install notes.

## Managed macOS access and recovery

Use `~/Applications/Open Projctl.command` or `http://localhost:8080/`.
Opening the launcher checks relay health, loads the service if needed, waits for
readiness and opens the controller. It does not stop an already healthy relay.
The LaunchAgent starts at login and restarts after a process exit. This requires
a signed-in user session; it is not a before-login system daemon.
Process recovery does not prove venue network routing or restart persistence
for network adapters. Verify those separately with the venue connection active.

For a dedicated show Mac, install under the actual crew/show account and verify
its login startup, wired projector reachability and controller access from a
second device before handoff. A laptop preview is not the deployed show host.
A pre-login service is a separate deployment choice; this installer does not
create one or enable automatic login. Assess sleep prevention with the operator
(the display may sleep while the computer remains awake); do not silently change
power settings. Verify recovery after the planned restart/login cycle and an
adapter reconnect while the venue network is available. Record the verified
crew URL and authentication boundary instead of copying a preview host address.

To migrate an existing installation or update a managed service, run from the
new Projctl source/package after installing its dependencies and bundling its
Throwline runtime:

```sh
node deploy/install-service.js /absolute/path/to/existing/projctl
```

The source/package contains `deploy/`, `server/`, `public/`, `runtime/` and its
Node dependency. The installer refuses an unrelated listener on port 8080 and
backs up the old service before replacing it. It verifies the saved rig bytes,
keeps the original installation untouched, and migrates only the app's rig,
stage plot and private venue assets. It never moves project or media folders.
Subsequent updates preserve the managed settings rather than recopying an old
rig. Do not resume an old manually launched relay after migration.

| Purpose | Managed location |
| --- | --- |
| Controller | `http://localhost:8080/` |
| Launcher | `~/Applications/Open Projctl.command` |
| Runtime | `~/Library/Application Support/Projctl/app/` |
| Live settings | `~/Library/Application Support/Projctl/data/` |
| Service log | `~/Library/Application Support/Projctl/relay.log` |
| Before-state backups | `~/Library/Application Support/Projctl/backup-*/` |
| Login service | `~/Library/LaunchAgents/com.avbydave.projctl.plist` |

`GET /api/health` reports relay availability and live/simulation mode without
revealing the rig. A healthy relay with unreachable projectors means check the
venue network, power and device address. Restarting the relay cannot repair a
missing venue connection. Device status carries last attempt, last successful
reply, failure count and a sanitized reason. Polling continues while devices
are unreachable; WebSocket updates report recovery without reloading the page.
An unassigned lane remains unassigned and is never filled by this recovery path.

If startup cannot read the saved rig, it stops with a clear error rather than
using a default rig. Inspect the log and restore the correct settings from a
verified backup. A corrupt or unavailable configuration must not become a new
control assignment. Writes use a temporary file and atomic rename; normal
termination flushes pending settings.

For a deliberate rollback, unload the managed LaunchAgent first, restore its
backed-up service/runtime, and verify its configured settings path before
starting it. Do not run old and new copies simultaneously.

## Align slot numbers with drawing lanes

Frozen uses A / SL Portal = P1, B / Top Portal = P2, C / Stage = P3 and
D / SR Portal = P4. A lane edit alone does not change a device's control address.
For an older rig with different numbers, use `scripts/renumber-rig.js` during a
maintenance window. First review Stream Deck, OSC/TCP and other external cues
that address P1 through P4. A saved cue using the old number must be changed
to follow the same physical projector before cue input resumes.

1. Preview with `node scripts/renumber-rig.js --rig /absolute/path/to/rig.json`.
   Output contains only the mapping, counts and hash, not connection credentials.
2. Stop the relay using its service manager. Run the preview again after it
   has stopped so pending settings have flushed. Retain its `beforeSha`.
3. Apply to the same rig path with `--write --relay-stopped --expected-sha`
   followed by that exact hash. The script refuses changed input, ambiguous
   lanes, unknown preset targets, existing schedules/history or occurrence
   claims. It writes an exact private backup beside the rig, then atomically
   replaces the rig and reads it back.
4. Restart the same managed relay and inspect all four lane/slot/model pairs.
   Compare each lane's connection settings and lens configuration to the
   backup; all must be identical apart from `slot`. Check the Log: migrated
   events show their previous slot, while original command text is retained.

This operation sends no projector commands and does not migrate scheduled
power actions. An existing schedule or audit is a stop condition requiring a
separate migration, even if currently disabled. To roll back, stop the relay,
restore the exact before-numbering backup and revert any external cue changes
together. Never restore it over a running relay.
