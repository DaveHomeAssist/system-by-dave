#!/usr/bin/env python3
"""Regenerate sitemap.xml for systembydave.com.

Tool pages come from js/sbd-registry.js (single source of truth); static and
hub pages are listed below. lastmod is each file's last git-commit date, or
today when the file has uncommitted changes.

Usage (repo root):  python scripts/gen_sitemap.py
"""
import datetime
import io
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
    ("av-suite.html", "weekly", "0.9"),
    ("notion.html", "weekly", "0.8"),
    ("prompt-lab.html", "weekly", "0.8"),
    ("skills.html", "weekly", "0.7"),
    ("agents.html", "weekly", "0.7"),
    ("widgets.html", "weekly", "0.7"),
    ("world-cup/", "weekly", "0.7"),
    ("scorecard/", "monthly", "0.6"),
    ("hat-in-ring/", "weekly", "0.7"),
    ("marsscape/", "monthly", "0.7"),
    ("resume/", "monthly", "0.6"),
    ("profile/", "monthly", "0.6"),
    ("prompts/", "monthly", "0.6"),
    ("project-registry.html", "monthly", "0.6"),
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
    dirty = dirty_paths()
    entries = []
    for path, freq, prio in STATIC_PAGES:
        entries.append((path, lastmod_for(path, dirty), freq, prio))
    for href in registry_tool_pages():
        if not os.path.exists(os.path.join(ROOT, href)):
            print("skip (missing file):", href, file=sys.stderr)
            continue
        entries.append((href, lastmod_for(href, dirty), TOOL_CHANGEFREQ, TOOL_PRIORITY))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, mod, freq, prio in entries:
        lines += ["  <url>",
                  "    <loc>%s%s</loc>" % (BASE, path),
                  "    <lastmod>%s</lastmod>" % mod,
                  "    <changefreq>%s</changefreq>" % freq,
                  "    <priority>%s</priority>" % prio,
                  "  </url>"]
    lines.append("</urlset>")
    io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
    print("sitemap.xml written: %d urls" % len(entries))


if __name__ == "__main__":
    main()
