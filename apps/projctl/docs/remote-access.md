# Remote access brief

Status: brief only. Nothing here is installed or verified yet. Dave answered RA-1 to
RA-3 and RA-5 on November 12, 2026. RA-4 and RA-6 are open.

## Problem

The relay runs on the video lead's laptop. When the laptop leaves the venue, nobody can
see or control the projectors from off site. On November 11, 2026 the crew powered the
rig off and went home before Standby was confirmed; the relay could not confirm it
afterwards. Status checks, temperature reads and postshow power-off all need someone
in the building.

## Outcome

A small always-on box stays at the venue, plugged into the projector switch. It runs
the relay and joins the private tailnet. From anywhere, the video lead can:

- open the control page at a private tailnet URL (the existing `deploy/tailscale.sh serve`);
- reach the projectors themselves from one laptop, for diagnostics such as temperature
  and alarm reads, through a Tailscale subnet route that only that laptop may use.

Nothing is published to the public internet. Funnel stays off.

## Flow

1. Postshow from home: open the tailnet URL, enter the passcode, check every tile.
2. All projectors, Power off (two taps). Watch each tile go from Cooling to Standby.
3. For diagnostics, the video lead's laptop queries a projector directly through the route.
4. On site, crew keep using the relay's in-building address as before.

## Decisions

| ID | Question | Answer or recommendation | Trade-off | Unlocks |
| --- | --- | --- | --- | --- |
| RA-1 | What stays at the venue? | **Answered 2026-11-12: a small dedicated box** (not the media server, not a spare laptop). | About $100–200 of hardware; independent of show playback. | Hardware purchase |
| RA-2 | Does the projector network have internet? | **Answered 2026-11-12: no; it is our own network.** The box needs its own uplink. | Adds RA-4. | Network plan |
| RA-3 | What does the tunnel expose? | **Answered 2026-11-12: both.** Relay page via serve, plus a subnet route limited to one laptop. | The route gives full device access, so the access policy must be tight. | Policy and setup |
| RA-4 | Uplink for the box | Open. **Recommended: A, a dedicated LTE hotspot or USB modem.** B: venue guest Wi-Fi. C: a wired venue drop. | A costs a data plan but needs no venue IT and has no captive portal. B is free but captive portals break Tailscale and need venue approval. C is most reliable but needs venue IT. | Box location and cost |
| RA-5 | Box hardware | **Answered 2026-11-12: Dave's own mini PC**, brought to the venue on November 13. No purchase. | Free and on hand. Its operating system, ports and power settings are unknown until it passes the arrival checks below. | Slice 1 on site |
| RA-6 | Projector network in standby | Open. **Recommended: A, set the Panasonics' STANDBY MODE to NORMAL.** B: leave ECO. | On November 11 the Panasonics left the network about 30 s after power-off, which looks like ECO standby. A keeps them reachable in Standby (remote confirm and power-on) for a few watts more. With B, remote access works only while they are powered. Check the Barco's standby network setting too. | Remote confirm and power-on |

## Smallest useful slice

Slice 1: box on the projector switch with its uplink, joined to the tailnet with a tag,
relay installed with a passcode, `deploy/tailscale.sh serve`. This alone covers postshow
checks and power-off from home.

Slice 2: subnet route for the projector subnet, approved only for the venue tag, with an
access rule that admits one laptop. Slice 3: RA-6 projector menu change, on site.

## Mini PC arrival checks

Check the mini PC before installing anything on it:

1. **Operating system.** `deploy/install.sh` supports Linux (systemd) and macOS. It has no
   Windows path. If the box runs Windows, install Debian 12 first. That erases the drive,
   so copy anything worth keeping off it beforehand.
2. **Ports.** One Ethernet port goes to the projector switch. The uplink needs Wi-Fi, a
   second Ethernet port or a USB Ethernet adapter.
3. **Power.** Set the firmware's power-restore option (often "Restore on AC power loss")
   to Power On. Turn off sleep and suspend.
4. **Unattended start.** Disk encryption that asks for a passphrase at boot fails
   acceptance check 4. The relay and Tailscale must both start with nobody signed in.
5. **Software.** Node 18 or newer and `rsync`. Build the Throwline bundle in a source
   checkout first; the installer stops without it.
6. **Accounts.** Remove personal accounts and saved logins. The box stays at the venue.
7. **Uplink.** RA-4 is still open. A phone hotspot is enough to test slice 1 on site.

## Rules

- One relay per rig. Once the box is live, the laptop relay runs only in simulator mode.
  Two relays would not share Show Lock, presets or confirmations.
- A passcode is required before serve. Funnel remains off.
- The tailnet policy must stop every other device, including CI and agent nodes, from
  reaching the projector subnet. A default allow-all policy must be replaced first:
  some projector control ports have no login of their own.
- The box runs on house power that stays on overnight, never on the projector rail.
- The projector LAN interface on the box has no default gateway; only the uplink does.
- Pin DHCP leases (or static addresses) for the projectors and the box. The route must
  match the subnet the projectors actually use; it moved on November 11.
- The rig file holds projector control logins. Copy it to the box privately; never
  commit it or paste it into chat.
- Remote power commands happen only outside show calls and with crew informed.
  Show Lock still applies to every client.

## Effects

No code, rig file format, slot ID, cue address or API change is needed for slices 1–3.
`deploy/install.sh` already installs a systemd service on Linux (or launchd on macOS).
A later temperature logger could run on the same box; that is a separate decision.

## Dependencies and risks

- Tailnet admin access for the tag, the route approval and the access policy.
- LTE signal at the box's location (booths and basements can be weak). Test before buying a plan.
- With the route accepted, the laptop must still reach the projectors directly when it is
  on the projector LAN on site. Test it; turn route acceptance off on site if it does not.
- Tagged nodes do not expire, but the box must run Tailscale unattended and come back after
  a power cut without a login.

## Acceptance

1. Off site with Tailscale signed in: the relay URL loads, asks for the passcode, and all
   four tiles go live within 10 s.
2. From the public internet without Tailscale: the relay is unreachable.
3. Off site, from the approved laptop: a read-only status query to each projector succeeds.
   From any other tailnet device the same query fails.
4. Cut and restore the box's power: it rejoins the tailnet and serves the relay with no
   manual step.
5. After RA-6 A: powered-off projectors show Standby remotely, and a remote power-on is
   accepted through the normal two-tap confirmation.
6. On site: the laptop on the projector LAN still reaches every projector directly.
7. Only the box controls the rig: Show Lock set there blocks power-off from a second browser.

## Exclusions

No public link, no venue IT changes, no new app features, no automatic schedules and no
change to the media server.
