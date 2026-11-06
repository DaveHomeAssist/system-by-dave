# wst.housevideo.app

The relay stays on the theatre Mac and handles projector commands locally. Setting a password enables the same login over the LAN and through the tunnel: losing internet or Cloudflare does not disable the LAN controller or sign anyone out.

## Configure and install

Generate a strong password and leave it out of git and shell history. On the Mac,

    read -rsp 'Projctl password: ' PROJCTL_PASSWORD; echo
    export PROJCTL_PASSWORD
    npm start

Stop the existing locally-managed relay first, then use the documented launchd installer for automatic restart; `npm restart` is not a projctl script.

For launchd, use `deploy/install.sh --passcode 'YOUR_PASSWORD'` from your private shell. Its `com.avbydave.projctl.plist` now writes `PROJCTL_PASSWORD`. Existing `PJ_PASSCODE` is deprecated but still accepted. With neither variable set, projctl remains open for LAN use.

The browser cookie is HttpOnly, `SameSite=Strict`, and `Secure` when the tunnel supplies `X-Forwarded-Proto: https`. Sessions expire after 90 days and always end when the relay restarts. Wrong passwords are rate-limited with exponential backoff. The same session cookie protects `/ws` live updates and every API, not just HTTP commands. The login page and public theme assets are the only unauthenticated pages.

## Cloudflare Tunnel (Dave completes these private account steps)

Copy `deploy/cloudflared-wst.example.yml` to `~/.cloudflared/wst.yml`. The ingress must point only to HTTP 8080, never to the projector network ports. On Dave's Mac:

    cloudflared tunnel login

That account-owned login command opens Cloudflare for Dave's authorization. No tunnel or DNS resource is made by this repository or the example file. After Dave chooses or creates a tunnel, put its ID and credential-file name in `wst.yml`, route `wst.housevideo.app` to it in the Cloudflare dashboard, and run `cloudflared --config ~/.cloudflared/wst.yml tunnel run` (or the corresponding named service installation).

Optionally put Cloudflare Access in front of the hostname as a second layer; allow only Dave's email. Keep projctl's password enabled either way. The `.app` HTTPS requirement terminates at Cloudflare; local direct access remains `http://THEATRE-MAC:8080`, not an internet-dependent hostname with a private-IP certificate.

## Safety before a show

Confirm an authenticated LAN session works with Wi-Fi/internet disabled, then check `wst.housevideo.app` from a phone. Verify the read-only Rig page before testing a command. Never route UDP OSC 9000, TCP cues 9001, Panasonic 1024/4352 or Pulse 9090 through the tunnel. Keep Show Lock on during performance and rehearse the deliberate two-step lens preset confirmation before controlling actual motors.
