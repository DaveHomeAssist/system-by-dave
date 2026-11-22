#!/bin/bash
# Read-only inspection of the m1 (Millumin pixel strips) for the Frozen Startup watch profile.
#
# Run it at the m1's own console, as the normal login user. It prints a report to the screen and nothing else.
# It never uses sudo, writes a file, launches or closes anything, changes a setting, opens a window, talks to
# Millumin, or sends anything to a pixel controller. The only network traffic is one GET of /api/health on the
# Projctl relay (section 8), the same request the watch makes. test_inspect_m1.py enforces this list.
#
# Run it without saving a file:   bash -s   then paste this script, then press Control-D
# Or copy it over and run it:     bash inspect-m1.sh
# Optional: INSPECT_RELAY_URL=http://host:port bash inspect-m1.sh   (default is the M5 relay on the tailnet)

if [ "$(id -u)" = "0" ]; then echo "Run this as the normal login user, not root."; exit 2; fi
PATH=/usr/bin:/bin:/usr/sbin:/sbin
export LC_ALL=C
RELAY_URL="${INSPECT_RELAY_URL:-http://100.113.187.88:8080}"
TAILSCALE=/Applications/Tailscale.app/Contents/MacOS/Tailscale

h() { printf '\n### %s\n' "$1"; }
none() { echo "(not available here)"; }

echo "Frozen Startup: m1 read-only inspection"
echo "Nothing is changed by this report."

h "1. System"
sw_vers 2>/dev/null || none
echo "arch: $(uname -m)"
echo "model: $(sysctl -n hw.model 2>/dev/null)"
echo "computer name: $(scutil --get ComputerName 2>/dev/null)"
echo "login user: $(id -un)   console user: $(stat -f%Su /dev/console 2>/dev/null)"
date '+now: %Y-%m-%d %H:%M:%S %Z'
uptime

h "2. Displays, as the display helper would read them (CoreGraphics)"
echo "Fill: displays[].identity (vendor, model, serial) and displays[].mode (width, height, pixelWidth, pixelHeight, refreshRate)."
osascript -l JavaScript -e 'ObjC.import("AppKit"); ObjC.import("CoreGraphics");
var screens = $.NSScreen.screens; var out = [];
for (var i = 0; i < screens.count; i++) {
  var s = screens.objectAtIndex(i);
  var id = ObjC.unwrap(s.deviceDescription.objectForKey("NSScreenNumber"));
  var m = $.CGDisplayCopyDisplayMode(id);
  out.push({ id: id, name: ObjC.unwrap(s.localizedName),
    vendor: $.CGDisplayVendorNumber(id), model: $.CGDisplayModelNumber(id), serial: $.CGDisplaySerialNumber(id),
    width: Number($.CGDisplayModeGetWidth(m)), height: Number($.CGDisplayModeGetHeight(m)),
    pixelWidth: Number($.CGDisplayModeGetPixelWidth(m)), pixelHeight: Number($.CGDisplayModeGetPixelHeight(m)),
    refreshRate: Number($.CGDisplayModeGetRefreshRate(m)),
    main: !!$.CGDisplayIsMain(id), mirrored: !!$.CGDisplayIsInMirrorSet(id) });
}
JSON.stringify(out, null, 1);' 2>&1 || none
echo "--- system_profiler summary"
system_profiler SPDisplaysDataType 2>/dev/null | grep -E 'Displays:|Resolution|Refresh|UI Looks|Main Display|Mirror|Online|Display Type|^ {8}[^ ].*:$' || none

h "3. Millumin"
echo "Fill: showPath (the project the m1 plays), watch.mediaFolder, and the Millumin process name."
pids=$(pgrep -if millumin 2>/dev/null)
if [ -z "$pids" ]; then
  echo "Millumin is not running."
else
  for pid in $pids; do ps -o pid=,lstart=,command= -p "$pid" 2>/dev/null; done
  echo "process names: $(ps -axo comm= 2>/dev/null | grep -i millumin | sort -u | tr '\n' ' ')"
  echo "--- files and folders Millumin has open under /Users and /Volumes"
  for pid in $pids; do lsof -nP -p "$pid" -Fn 2>/dev/null; done | grep '^n/' | sed 's/^n//' | grep -E '^/(Users|Volumes)/' | grep -vE '/Library/(Caches|Preferences|Logs|Containers|Saved Application State)' | sort -u | head -60
fi
for app in /Applications/Millumin*.app; do
  [ -d "$app" ] && echo "installed: $app  version $(defaults read "$app/Contents/Info" CFBundleShortVersionString 2>/dev/null)"
done
echo "--- .millumin projects under the home folder and /Volumes, newest first (modified, bytes, path)"
{ find "$HOME" -maxdepth 4 -name '*.millumin' -not -path '*/Library/*' -exec stat -f '%m %Sm  %z  %N' -t '%Y-%m-%d %H:%M' {} + 2>/dev/null
  find /Volumes -maxdepth 3 -name '*.millumin' -exec stat -f '%m %Sm  %z  %N' -t '%Y-%m-%d %H:%M' {} + 2>/dev/null; } | sort -rn | cut -d' ' -f2- | head -15
echo "(a project can be a folder; its size here is the folder entry, not its contents)"

h "4. Sleep and keep-awake"
echo "Fill: watch.keepAwake.process (the process holding sleep off), or delete that block."
pmset -g 2>/dev/null | grep -E '^ *(sleep|displaysleep|disksleep|womp|autorestart|powernap|standby)' || none
echo "--- sleep assertions"
pmset -g assertions 2>/dev/null | grep -E 'Listed|PreventUserIdleSystemSleep|PreventSystemSleep|NoDisplaySleep|NoIdleSleep|pid ' | head -30
echo "--- caffeinate: $(pgrep -lf caffeinate 2>/dev/null | tr '\n' ' ')"
echo "--- launch items (listing only)"
ls -1 "$HOME/Library/LaunchAgents" /Library/LaunchAgents /Library/LaunchDaemons 2>/dev/null | grep -vE '^$' | head -30
echo "--- non-Apple jobs in this login session"
launchctl list 2>/dev/null | grep -viE 'com\.apple\.|^PID' | head -20

h "5. Network and the pixel interface"
echo "Fill: watch.pixelOutput.interface and the controller addresses (only if pixel output is switched on)."
networksetup -listallhardwareports 2>/dev/null | grep -E 'Hardware Port|Device' || none
echo "--- service order"
networksetup -listnetworkserviceorder 2>/dev/null | grep -E '^\([0-9]+\)' || none
echo "--- interfaces (addresses and link state; hardware addresses left out)"
for i in $(ifconfig -l 2>/dev/null); do
  case "$i" in en[0-9]*) echo "$i: $(ifconfig "$i" 2>/dev/null | awk '/inet /{printf "%s mask %s  ", $2, $4} /status:/{printf "status=%s", $2}')";; esac
done
echo "--- which interface carries the 10.101.0.0/16 show network"
route -n get 10.101.0.1 2>&1 | grep -E 'interface|gateway|not in table' || none
echo "--- routing table (IPv4, first lines)"
netstat -rn -f inet 2>/dev/null | head -14
echo "--- neighbours this Mac has already seen (address, interface; nothing was probed)"
arp -an 2>/dev/null | awk '{gsub(/[()]/, "", $2); print $2, "on", $6}' | sort -u | head -40
echo "--- UDP listeners on Art-Net 6454, OSC 5000, sACN 5568"
netstat -an -p udp 2>/dev/null | grep -E '\.(5000|6454|5568)[[:space:]]' || echo "(none shown)"

h "6. Disk and volumes"
echo "Fill: confirms the disk the watch measures free space on."
df -h / 2>/dev/null | tail -1
ls -1 /Volumes 2>/dev/null

h "7. Tailscale"
echo "Fill: tells whether the m1 can reach the M5 relay by its tailnet address."
if [ -x "$TAILSCALE" ]; then
  echo "this machine: $("$TAILSCALE" ip -4 2>&1 | head -1)"
  "$TAILSCALE" status 2>&1 | grep -iE 'productions-mac-studio|^#|health' | head -8
else
  echo "Tailscale app not found at $TAILSCALE"
fi

h "8. Projctl relay (one GET of /api/health, as the watch does)"
echo "Fill: watch.relay.url. Expect HTTP 200 and a body with \"ok\":true and \"service\":\"projctl\"."
echo "url: $RELAY_URL/api/health"
curl -sS -m 5 -w '\nHTTP %{http_code}\n' "$RELAY_URL/api/health" 2>&1 | head -5

echo
echo "END OF REPORT. Nothing was changed. Paste everything above back into the chat."
