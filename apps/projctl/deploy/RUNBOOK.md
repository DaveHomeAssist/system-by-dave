# projctl runbook: Frozen at Walnut Street Theatre

One relay on the theatre network controls the four projectors. Crew open it in a browser; the video lead
can reach it from anywhere through Tailscale. Prepared by Dave Robertson (AV by Dave).

## Where it runs

| Item | Value |
| --- | --- |
| Relay box | [VENUE BOX], on the projector/sound management network, pinned DHCP lease |
| In the building | http://[RELAY-IP]:8080 |
| Off site (tailnet) | https://[BOX-NAME].[TAILNET].ts.net (Tailscale app signed in) |
| Passcode | set at install, kept by the video lead; change with a reinstall |
| Cue input | OSC on UDP 9000, text lines on TCP 9001, LAN only |

## Daily

1. Open the Rig tab. Every tile should show Powered or Standby with a circle beside the word. Offline means the relay cannot reach that projector: check its network cable and that it has an address.
2. Preshow: recall the preshow preset (tap Recall twice). Then turn on Show lock in the header. Lock blocks power off, input changes, test patterns, lens moves and picture changes from every phone.
3. Postshow: turn Show lock off, then All projectors, Power off. Check the listed targets and tap again within three seconds. Each confirmed target receives the command even if another slot is offline. Read the per-projector result, then wait for Cooling to become Standby before cutting power at the rail. A newly online or reconfigured slot needs a fresh confirmation.

## If something is wrong

| Symptom | Do this |
| --- | --- |
| Tile says Offline, projector is on | Setup tab, press Find projectors. The relay rediscovers by MAC every minute on its own. |
| "auth failed" in the Log | The projector's PJLink or admin password changed. Setup tab, enter it, Save. |
| Shutter button does nothing | Wait 5 s; the projector answers slowly while the shutter moves. Then check the Log tab. |
| Picture sliders greyed | Check Show Lock and the input signal. Unlocking restores available settings; missing-signal values remain disabled. |
| Page asks for a passcode again | The relay restarted. Sign in again. |
| Nothing loads at all | On the relay box: macOS `launchctl kickstart -k gui/$(id -u)/com.avbydave.projctl`; Linux `sudo systemctl restart projctl`. |

## Install on the venue box (one time)

    git clone or copy the projctl folder onto the box
    cd projctl
    deploy/install.sh --passcode [CODE]       # asks for the passcode if omitted
    deploy/tailscale.sh serve                 # tailnet URL for phones off site
    deploy/tailscale.sh funnel                # only if people without Tailscale need a link; passcode required

Then Setup tab: enter each projector's IP, MAC, admin user and PJLink password, Save. Tiles go live within 10 s.

Keep the box awake. macOS: System Settings, Energy, Prevent automatic sleeping. Pi: nothing to do.

## Backups

    deploy/backup.sh [DEST]      # rig file, presets, log; keeps 30 snapshots

Cron it nightly on the box. The copy named `rig.nocreds.json` is safe to commit.

## Strike (early January)

1. `deploy/backup.sh` one last time and copy the folder off the box.
2. `deploy/uninstall.sh` removes the service and resets Tailscale serve/funnel.
3. Sign the box out of Tailscale if it is house gear: `tailscale logout`.
4. Delete the app folder and the passcode from the install notes.
