# m1 read-only inspection (Phase 2)

The m1 (Production's Mac Studio, Millumin pixel strips) has never been inspected by a tool, so every value in
[`example-m1-profile.json`](../example-m1-profile.json) that starts with `REPLACE-` is a placeholder. This folder is
how those values get measured instead of guessed.

**Why a script someone runs at the m1 and not a remote login.** On November 21 the m1 had Remote Login off, no
Screen Sharing sign-in tested, and showed offline on the tailnet. Turning Remote Login on is a setting change on
a show machine, and nothing here does that. The November 19 recon was done the same way: a console session on
the m1, pasted back.

## What it does and does not do

`inspect-m1.sh` prints one report to the screen. It reads: the macOS version and model; each display's
CoreGraphics vendor, model, serial and current mode (the same numbers the display helper uses); the running
Millumin process, the files it has open and the `.millumin` projects on the machine; sleep settings and what is
holding sleep off; network interfaces, the interface that carries `10.101.0.0/16`, and neighbours the Mac already
knew about; free disk space; the Tailscale peers for the two Studios; and one `GET /api/health` on the M5 relay.

It never uses `sudo`, writes a file, launches or closes anything, changes a setting, opens a window, talks to
Millumin, or sends anything to a pixel controller (it does not even ping one). Hardware addresses are left out of
the output. `test_inspect_m1.py` enforces this: every command in the script must be on a read-only list with
read-only arguments, and on a Mac the script is run against an empty home folder and must leave it empty.

## How to run it

At the m1's own screen, as the normal login user (not root), open Terminal. Either:

- **Without saving a file.** On the MacBook run `pbcopy < apps/frozen-startup/m1-inspect/inspect-m1.sh`. At the m1
  type `bash -s` and press Return, paste, press Return, then Control-D.
- **Or copy the file over** (AirDrop, or drag it in over Screen Sharing) and run `bash inspect-m1.sh`.

Then copy everything it printed (it ends with `END OF REPORT`) and paste it back into the chat. It takes about
20 seconds. Run it with Millumin open on the show the m1 normally plays, so section 3 can see the project.

## Where each placeholder comes from

| Placeholder in the profile | Report section | Notes |
| --- | --- | --- |
| `displays[].identity` vendor, model, serial | 2 | One entry per display the watch should expect. The Nov 19 recon saw only "Field Monitor", 1920 by 1080 at 60 Hz. |
| `displays[].mode` width, height, pixelWidth, pixelHeight, refreshRate | 2 | Points and pixels, as the helper reports them. |
| `showPath` | 3 | The project Millumin has open. If several `.millumin` files are listed and none is open, someone has to say which one the m1 plays. |
| `showSHA256` | not in the report | The placeholder says to wait for board question **M1-2**. Its text is not in this repository or in Davai, so what it asks is unconfirmed here. The report only lists candidate show files; which one is approved is Dave's call, and the hash is computed from that file afterwards. |
| `watch.mediaFolder` | 3 | From the folders Millumin has open; confirmed with Dave if more than one. |
| `watch.keepAwake.process` | 4 | The Nov 19 recon found sleep set to 0 and no launch items. If nothing holds sleep off, this block is deleted and the check says so, rather than naming a process that is not there. |
| `watch.relay.url` | 7 and 8 | Expected `http://100.113.187.88:8080` (the M5 over the tailnet). Section 8 must say HTTP 200 and `"service":"projctl"` from the m1 itself before it is trusted. |
| `watch.report.tokenFile` | not in the report | A path chosen with the Phase 5 relay release (owner-only file holding the status token). Nothing is created in Phase 2. |
| `watch.pixelOutput` interface and controllers | 5 | Ships `enabled: false`. The interface is probably the USB adapter on `10.101.0.0/16`, but controller names and addresses live in Millumin's output setup and the eDMX configuration on the M5, not in this report. They are filled only if Dave wants pixel output watched. |

## After the report

The placeholders are replaced from the report, the profile is checked with `startup.py` (which refuses to start
while any `REPLACE-` value remains), and the change is committed. Nothing is installed on the m1 by Phase 2.
