#!/usr/bin/env python3
"""Regenerate sitemap.xml for systembydave.com.

Tool pages come from js/sbd-registry.js (single source of truth); static and
hub pages are listed below.

Usage (repo root):  python scripts/gen_sitemap.py           # write sitemap.xml
                    python scripts/gen_sitemap.py --check   # fail if it is stale

The committed sitemap.xml lists routes only, with no <lastmod>, so it is a pure
function of the route list and the registry: the same tree regenerates the same
bytes on any day, in any clone, mid-merge or after a rebase. The Pages deploy
stamps the published copy with --lastmod, which takes each page's last commit
date (git log %cs) from the full history of the deployed commit. Dates never
come from the clock, file mtimes or uncommitted changes. Without full history
(a shallow clone or no .git) --lastmod omits the dates and says so on stderr.

Pages that moved to another domain (scripts/domain-sites.json) leave this
sitemap at their site's cutover. The same list, rooted at the new domain, is
written with:  python scripts/gen_sitemap.py --site <id> --out <path>
"""
import argparse
import difflib
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://systembydave.com/"

# (path, changefreq, priority) — path "" is the homepage. Directory paths need
# the trailing slash. Keep this list to pages that should be indexed; AV tool
# pages are appended automatically from the registry.
STATIC_PAGES = [
    ("", "weekly", "1.0"),
    ("tools.html", "weekly", "0.9"),
    ("depotops/", "weekly", "0.7"),
    ("tailscale-manual.html", "monthly", "0.7"),
    ("av/", "weekly", "0.9"),
    ("backfocus/", "monthly", "0.7"),
    ("switcher/", "monthly", "0.7"),
    ("switcher/guide/", "monthly", "0.6"),
    ("shader/", "monthly", "0.7"),
    ("ursa-broadcast-g2/", "monthly", "0.7"),
    ("pixelforge/", "weekly", "0.8"),
    ("ProjectorThrow/", "weekly", "0.8"),
    ("ProjectorThrow/Stage3D.html", "weekly", "0.6"),
    ("shader/practice.html", "weekly", "0.6"),
    ("notion.html", "weekly", "0.8"),
    ("prompt-lab.html", "weekly", "0.8"),
    ("skills.html", "weekly", "0.7"),
    ("agents.html", "weekly", "0.7"),
    ("widgets.html", "weekly", "0.7"),
    ("world-cup/", "weekly", "0.7"),
    ("fifa-pitch-crew/", "weekly", "0.6"),
    ("scorecard/", "monthly", "0.6"),
    ("noteforge/", "monthly", "0.7"),
    ("demos/", "weekly", "0.8"),
    ("demos/frame-sync.html", "monthly", "0.8"),
    ("demos/fault-finding.html", "monthly", "0.8"),
    # hat-in-ring/ is a noindex handoff; production lives at hatinring.com.
    # marsscape/ moved to mixmash.games/mars/ (2026-07-03); the page there is a
    # save-migration redirect and should not be indexed.
    ("resume/", "monthly", "0.6"),
    ("resume/av/", "monthly", "0.6"),
    ("profile/", "monthly", "0.6"),
    ("prompts/", "monthly", "0.6"),
    ("project-registry.html", "monthly", "0.6"),
    ("remote-desktop.html", "monthly", "0.6"),
    ("privacy-policy.html", "yearly", "0.3"),
    ("systembydave/", "monthly", "0.6"),
    ("systembydave/layers/identity.html", "monthly", "0.5"),
    ("systembydave/layers/semantic.html", "monthly", "0.5"),
    ("systembydave/layers/episodic.html", "monthly", "0.5"),
    ("systembydave/layers/procedural.html", "monthly", "0.5"),
    ("systembydave/layers/reference.html", "monthly", "0.5"),
    ("systembydave/layers/working.html", "monthly", "0.5"),
    ("systembydave/layers/decisions.html", "monthly", "0.5"),
    ("systembydave/routing.html", "monthly", "0.5"),
    ("systembydave/lifecycle.html", "monthly", "0.5"),
    ("systembydave/index-md.html", "monthly", "0.5"),
    ("systembydave/sync.html", "monthly", "0.5"),
    ("systembydave/voice.html", "monthly", "0.5"),
    ("systembydave/implementation.html", "monthly", "0.5"),
]

TOOL_CHANGEFREQ = "weekly"
TOOL_PRIORITY = "0.7"


def load_domain_sites():
    return json.load(io.open(os.path.join(ROOT, "scripts", "domain-sites.json"), encoding="utf-8"))["sites"]


def registry_hrefs():
    src = io.open(os.path.join(ROOT, "js", "sbd-registry.js"), encoding="utf-8").read()
    return re.findall(r"href:'([^']+)'", src)


def site_for(path, sites, hrefs):
    """The domain site that serves `path`, or None when systembydave.com does."""
    for site in sites:
        entries = list(site.get("pages", [])) + (hrefs if site.get("registry") else [])
        for entry in entries:
            if path == entry or (entry.endswith("/") and path.startswith(entry)):
                return site
    return None


def registry_tool_pages():
    src = io.open(os.path.join(ROOT, "js", "sbd-registry.js"), encoding="utf-8").read()
    hrefs = re.findall(r"href:'([a-z0-9-]+\.html|[A-Za-z0-9-]+/)'", src)
    alias_files = re.findall(r"'\./([a-z0-9-]+\.html)'", src.split("ALIAS_FILES=")[1].split("]")[0])
    seen, pages = set(), []
    for href in hrefs + alias_files:
        if href not in seen:
            seen.add(href)
            pages.append(href)
    return pages


def is_indexable(path):
    probe = os.path.join(ROOT, path, "index.html") if path.endswith("/") else os.path.join(ROOT, path)
    if not os.path.exists(probe):
        return False
    source = io.open(probe, encoding="utf-8").read()
    return not re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', source, re.I)


def full_history():
    """True when git history is complete, so last-commit dates are real."""
    out = subprocess.run(["git", "rev-parse", "--is-shallow-repository"], cwd=ROOT,
                         capture_output=True, text=True)
    return out.returncode == 0 and out.stdout.strip() == "false"


def lastmod_for(path):
    """The page's last commit date at HEAD, or None when it has no commit."""
    probe = path if path else "index.html"
    if path.endswith("/"):
        probe = path + "index.html"
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "HEAD", "--", probe], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    return out or None


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--site", help="write the sitemap for this scripts/domain-sites.json site id")
    parser.add_argument("--out", help="output path (default: sitemap.xml in the repository root)")
    parser.add_argument("--lastmod", action="store_true",
                        help="add each page's last commit date (published copies only; needs full git history)")
    parser.add_argument("--check", action="store_true",
                        help="write nothing; exit 1 with a diff when the output file is out of date")
    args = parser.parse_args()
    if args.check and args.lastmod:
        parser.error("--check compares the committed, date-free sitemap; do not combine it with --lastmod")
    stamp = args.lastmod and full_history()
    if args.lastmod and not stamp:
        print("gen_sitemap: no full git history (shallow clone or no .git); lastmod omitted", file=sys.stderr)
    when = lastmod_for if stamp else (lambda path: None)
    sites = load_domain_sites()
    hrefs = registry_hrefs()
    site = None
    if args.site:
        site = next((item for item in sites if item["id"] == args.site), None)
        if site is None:
            parser.error("unknown site id: %s" % args.site)
    base = "https://%s/" % site["domain"] if site else BASE

    def belongs(path):
        owner = site_for(path, sites, hrefs)
        if site:
            return owner is not None and owner["id"] == site["id"]
        return owner is None or not owner.get("cutover")

    entries = []
    if site and site.get('home') == '/' and site.get('landingPage'):
        entries.append(('', when(site['landingPage']), 'weekly', '1.0'))
    for path, freq, prio in STATIC_PAGES:
        if not belongs(path):
            continue
        if not path or is_indexable(path):
            entries.append((path, when(path), freq, prio))
    listed = {path for path, _, _, _ in entries}
    for href in registry_tool_pages():
        if href in listed or not belongs(href):
            continue
        if not os.path.exists(os.path.join(ROOT, href)):
            print("skip (missing file):", href, file=sys.stderr)
            continue
        if is_indexable(href):
            entries.append((href, when(href), TOOL_CHANGEFREQ, TOOL_PRIORITY))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, mod, freq, prio in entries:
        lines += ["  <url>", "    <loc>%s%s</loc>" % (base, path)]
        if mod:
            lines.append("    <lastmod>%s</lastmod>" % mod)
        lines += ["    <changefreq>%s</changefreq>" % freq,
                  "    <priority>%s</priority>" % prio,
                  "  </url>"]
    lines.append("</urlset>")
    text = "\n".join(lines) + "\n"
    out = args.out or os.path.join(ROOT, "sitemap.xml")
    if args.check:
        current = io.open(out, encoding="utf-8").read() if os.path.exists(out) else ""
        if current == text:
            print("%s is current: %d urls" % (os.path.relpath(out, ROOT), len(entries)))
            return
        sys.stdout.writelines(difflib.unified_diff(
            current.splitlines(True), text.splitlines(True),
            "committed/" + os.path.relpath(out, ROOT), "regenerated/" + os.path.relpath(out, ROOT)))
        print("%s is stale: run python3 scripts/gen_sitemap.py and commit the result"
              % os.path.relpath(out, ROOT), file=sys.stderr)
        sys.exit(1)
    io.open(out, "w", encoding="utf-8", newline="\n").write(text)
    print("%s written: %d urls" % (os.path.relpath(out, ROOT) if not args.out else out, len(entries)))


if __name__ == "__main__":
    main()
