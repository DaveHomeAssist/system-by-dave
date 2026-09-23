#!/usr/bin/env python3
"""Regenerate sitemap.xml for systembydave.com.

Tool pages come from js/sbd-registry.js (single source of truth); static and
hub pages are listed below. lastmod is each file's last git-commit date, or
today when the file has uncommitted changes.

Usage (repo root):  python scripts/gen_sitemap.py

Pages that moved to another domain (scripts/domain-sites.json) leave this
sitemap at their site's cutover. The same list, rooted at the new domain, is
written with:  python scripts/gen_sitemap.py --site <id> --out <path>
"""
import argparse
import datetime
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
    ("av-suite.html", "weekly", "0.9"),
    ("av-tool-suite/index-v2/", "monthly", "0.7"),
    ("av-workbook/", "weekly", "0.8"),
    ("backfocus/", "monthly", "0.7"),
    ("switcher/", "monthly", "0.7"),
    ("switcher/guide/", "monthly", "0.6"),
    ("shader/", "monthly", "0.7"),
    ("ursa-broadcast-g2/", "monthly", "0.7"),
    ("pixelforge/", "weekly", "0.8"),
    ("ProjectorThrow/", "weekly", "0.8"),
    ("ProjectorThrow/Stage3D.html", "weekly", "0.6"),
    ("ProjectorThrow/practice.html", "weekly", "0.6"),
    ("notion.html", "weekly", "0.8"),
    ("prompt-lab.html", "weekly", "0.8"),
    ("skills.html", "weekly", "0.7"),
    ("agents.html", "weekly", "0.7"),
    ("widgets.html", "weekly", "0.7"),
    ("world-cup/", "weekly", "0.7"),
    ("fifa-pitch-crew/", "weekly", "0.6"),
    ("scorecard/", "monthly", "0.6"),
    ("noteforge/", "monthly", "0.7"),
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
    hrefs = re.findall(r"href:'([a-z0-9-]+\.html)'", src)
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


def dirty_paths():
    out = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT,
                         capture_output=True, text=True).stdout
    return {line[3:].strip().strip('"') for line in out.splitlines() if line.strip()}


def lastmod_for(path, dirty):
    probe = path if path else "index.html"
    if path.endswith("/"):
        probe = path + "index.html"
    if probe in dirty:
        return datetime.date.today().isoformat()
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", probe], cwd=ROOT,
                         capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--site", help="write the sitemap for this scripts/domain-sites.json site id")
    parser.add_argument("--out", help="output path (default: sitemap.xml in the repository root)")
    args = parser.parse_args()
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

    dirty = dirty_paths()
    entries = []
    for path, freq, prio in STATIC_PAGES:
        if not belongs(path):
            continue
        if not path or is_indexable(path):
            entries.append((path, lastmod_for(path, dirty), freq, prio))
    for href in registry_tool_pages():
        if not belongs(href):
            continue
        if not os.path.exists(os.path.join(ROOT, href)):
            print("skip (missing file):", href, file=sys.stderr)
            continue
        if is_indexable(href):
            entries.append((href, lastmod_for(href, dirty), TOOL_CHANGEFREQ, TOOL_PRIORITY))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, mod, freq, prio in entries:
        lines += ["  <url>",
                  "    <loc>%s%s</loc>" % (base, path),
                  "    <lastmod>%s</lastmod>" % mod,
                  "    <changefreq>%s</changefreq>" % freq,
                  "    <priority>%s</priority>" % prio,
                  "  </url>"]
    lines.append("</urlset>")
    out = args.out or os.path.join(ROOT, "sitemap.xml")
    io.open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("%s written: %d urls" % (os.path.relpath(out, ROOT) if not args.out else out, len(entries)))


if __name__ == "__main__":
    main()
