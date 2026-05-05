#!/usr/bin/env python3
"""Generate the systembydave.com static site bundle."""

from __future__ import annotations

import datetime as dt
import html
import posixpath
import shutil
import textwrap
import zipfile
from pathlib import Path


SITE_URL = "https://systembydave.com/systembydave"
OG_IMAGE = f"{SITE_URL}/assets/img/04_folder_tree.svg"
OUT_DIR = Path("systembydave")
ASSET_DIR = OUT_DIR / "assets"
IMG_DIR = ASSET_DIR / "img"
ZIP_PATH = Path("systembydave-site.zip")
BUILD_DATE = dt.date.today().isoformat()


LAYERS = [
    {
        "number": "1",
        "slug": "identity",
        "title": "Identity",
        "short": "Who the user is",
        "path": "layers/identity.html",
        "folder": "identity/",
        "question": "Who is this person, and what durable preferences shape the response?",
        "trigger": "Stable identity, communication preferences, boundaries, durable voice rules.",
        "store": "Durable user profile facts that should survive across projects and sessions.",
        "avoid": "Dated events, current tasks, implementation steps, and source documents.",
        "mutation": "Mutate carefully when the profile changes; keep corrections explicit.",
        "accent": "red",
    },
    {
        "number": "2",
        "slug": "semantic",
        "title": "Semantic",
        "short": "Timeless facts",
        "path": "layers/semantic.html",
        "folder": "semantic/",
        "question": "What is true independent of a specific date or workflow?",
        "trigger": "Definitions, durable facts, concept summaries, stable rules, vocabulary.",
        "store": "Short, reusable facts that answer future retrieval questions directly.",
        "avoid": "Chronology, source dumps, procedural steps, and unresolved work-in-progress.",
        "mutation": "Mutate when the fact changes; cite dated evidence when confidence matters.",
        "accent": "teal",
    },
    {
        "number": "3",
        "slug": "episodic",
        "title": "Episodic",
        "short": "Dated events",
        "path": "layers/episodic.html",
        "folder": "episodic/YYYY/MM/",
        "question": "What happened, when, and what evidence proves it?",
        "trigger": "Meetings, observations, incidents, corrections, dated decisions before ADRs.",
        "store": "Append-only event records with dates, participants, and source context.",
        "avoid": "Timeless facts without dates and instructions meant to be reused.",
        "mutation": "Append corrections; do not silently rewrite the original record.",
        "accent": "blue",
    },
    {
        "number": "4",
        "slug": "procedural",
        "title": "Procedural",
        "short": "How to do X",
        "path": "layers/procedural.html",
        "folder": "procedural/",
        "question": "How should the system or operator perform this task?",
        "trigger": "Runbooks, checklists, repeatable workflows, command sequences, playbooks.",
        "store": "Actionable steps with prerequisites, commands, validation, rollback, and owners.",
        "avoid": "One-time event notes and long reference documents.",
        "mutation": "Update in place when the process changes; link major changes to decisions.",
        "accent": "gold",
    },
    {
        "number": "5",
        "slug": "reference",
        "title": "Reference",
        "short": "Where to look",
        "path": "layers/reference.html",
        "folder": "reference/",
        "question": "Where should someone look for authoritative source material?",
        "trigger": "External docs, manuals, source links, schemas, papers, repositories, long documents.",
        "store": "Pointers, location notes, excerpts, ownership, and verification metadata.",
        "avoid": "Summaries that should be semantic and instructions that should be procedural.",
        "mutation": "Refresh location and verification metadata; preserve source provenance.",
        "accent": "violet",
    },
    {
        "number": "6",
        "slug": "working",
        "title": "Working",
        "short": "Current state",
        "path": "layers/working.html",
        "folder": "working/",
        "question": "What is active right now and likely to change soon?",
        "trigger": "Active tasks, hypotheses, temporary notes, scratch state, open loops.",
        "store": "Current operating context with owners, blockers, next actions, and expiry.",
        "avoid": "Permanent facts, evidence logs, and long-term decisions.",
        "mutation": "Mutate aggressively; consolidate or delete when no longer current.",
        "accent": "green",
    },
    {
        "number": "7",
        "slug": "decisions",
        "title": "Decisions",
        "short": "Architectural choices",
        "path": "layers/decisions.html",
        "folder": "decisions/",
        "question": "What choice was made, why, and what does it supersede?",
        "trigger": "Architecture decisions, policy choices, trade-offs, reversals, accepted constraints.",
        "store": "ADR-style records with status, context, decision, consequences, and supersedence.",
        "avoid": "Raw meeting notes and temporary task coordination.",
        "mutation": "Prefer superseding records over rewriting accepted decisions.",
        "accent": "orange",
    },
]

LAYER_BY_SLUG = {layer["slug"]: layer for layer in LAYERS}

TOP_PAGES = [
    ("index.html", "Overview"),
    ("routing.html", "Routing"),
    ("lifecycle.html", "Lifecycle"),
    ("index-md.html", "INDEX.md"),
    ("sync.html", "Sync"),
    ("voice.html", "Voice"),
    ("implementation.html", "Build"),
]


def clean(text: str) -> str:
    return textwrap.dedent(text).strip()


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def rel_url(current_path: str, target_path: str) -> str:
    base = posixpath.dirname(current_path) or "."
    return posixpath.relpath(target_path, base).replace("\\", "/")


def canonical(current_path: str) -> str:
    if current_path == "index.html":
        return f"{SITE_URL}/"
    return f"{SITE_URL}/{current_path}"


def nav_link(current_path: str, target_path: str, label: str) -> str:
    href = rel_url(current_path, target_path)
    active = current_path == target_path
    aria = ' aria-current="page"' if active else ""
    cls = "nav-link is-active" if active else "nav-link"
    return f'<a class="{cls}" href="{href}"{aria}>{esc(label)}</a>'


def layer_strip(current_path: str) -> str:
    items = []
    for layer in LAYERS:
        href = rel_url(current_path, layer["path"])
        active = current_path == layer["path"]
        aria = ' aria-current="page"' if active else ""
        cls = f'layer-chip layer-{layer["accent"]}'
        if active:
            cls += " is-active"
        items.append(
            f'<a class="{cls}" href="{href}"{aria}>'
            f'<span>{layer["number"]}</span>{esc(layer["title"])}</a>'
        )
    return "\n".join(items)


def diagram(current_path: str, filename: str, alt: str, caption: str) -> str:
    src = rel_url(current_path, f"assets/img/{filename}")
    return clean(
        f"""
        <figure class="diagram">
          <img src="{src}" alt="{esc(alt)}" loading="lazy">
          <figcaption>{esc(caption)}</figcaption>
        </figure>
        """
    )


def page_shell(current_path: str, title: str, description: str, body: str) -> str:
    stylesheet = rel_url(current_path, "assets/styles.css")
    index_href = rel_url(current_path, "index.html")
    page_title = "Davai Memory Architecture" if current_path == "index.html" else f"{title} | Davai"
    top_nav = "\n".join(nav_link(current_path, path, label) for path, label in TOP_PAGES)
    return clean(
        f"""
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>{esc(page_title)}</title>
          <meta name="description" content="{esc(description)}">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'">
          <link rel="canonical" href="{canonical(current_path)}">
          <meta name="robots" content="index,follow">
          <meta name="theme-color" content="#f7f8f5">
          <meta property="og:title" content="{esc(page_title)}">
          <meta property="og:description" content="{esc(description)}">
          <meta property="og:type" content="website">
          <meta property="og:site_name" content="System by Dave">
          <meta property="og:url" content="{canonical(current_path)}">
          <meta property="og:image" content="{OG_IMAGE}">
          <meta property="og:image:alt" content="Davai memory architecture folder tree diagram">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="{esc(page_title)}">
          <meta name="twitter:description" content="{esc(description)}">
          <meta name="twitter:image" content="{OG_IMAGE}">
          <link rel="icon" type="image/svg+xml" href="{rel_url(current_path, 'favicon.svg')}">
          <link rel="stylesheet" href="{stylesheet}">
        </head>
        <body>
          <a class="skip-link" href="#main">Skip to content</a>
          <header class="site-header">
            <div class="shell header-inner">
              <a class="brand" href="{index_href}" aria-label="Davai overview">
                <span class="brand-mark" aria-hidden="true">D</span>
                <span>
                  <strong>systembydave.com</strong>
                  <small>Davai memory architecture</small>
                </span>
              </a>
              <nav class="primary-nav" aria-label="Primary navigation">
                {top_nav}
              </nav>
            </div>
            <div class="layer-rail">
              <nav class="shell layer-strip" aria-label="Memory layers">
                {layer_strip(current_path)}
              </nav>
            </div>
          </header>
          <main id="main">
            {body}
          </main>
          <footer class="site-footer">
            <div class="shell footer-grid">
              <div>
                <strong>Davai</strong>
                <p>A static reference for routing memory into identity, semantic, episodic, procedural, reference, working, and decision layers.</p>
              </div>
              <div>
                <span>Generated {BUILD_DATE}</span>
                <a href="{rel_url(current_path, 'routing.html')}">Routing protocol</a>
                <a href="{rel_url(current_path, 'implementation.html')}">Implementation guide</a>
              </div>
            </div>
          </footer>
        </body>
        </html>
        """
    )


def layer_cards(current_path: str) -> str:
    cards = []
    for layer in LAYERS:
        href = rel_url(current_path, layer["path"])
        cards.append(
            clean(
                f"""
                <article class="layer-card layer-border-{layer["accent"]}">
                  <a class="layer-card-link" href="{href}">
                    <span class="layer-index">Layer {layer["number"]}</span>
                    <h3>{esc(layer["title"])}</h3>
                    <p>{esc(layer["question"])}</p>
                    <code>{esc(layer["folder"])}</code>
                  </a>
                </article>
                """
            )
        )
    return "\n".join(cards)


def facts_table(rows: list[tuple[str, str]]) -> str:
    rendered = []
    for label, value in rows:
        rendered.append(
            f"<tr><th scope=\"row\">{esc(label)}</th><td>{value}</td></tr>"
        )
    return '<table class="spec-table"><tbody>' + "\n".join(rendered) + "</tbody></table>"


def callout(kind: str, title: str, text: str) -> str:
    return clean(
        f"""
        <aside class="callout callout-{kind}">
          <strong>{esc(title)}</strong>
          <p>{text}</p>
        </aside>
        """
    )


def home_page() -> str:
    current = "index.html"
    rows = []
    for layer in LAYERS:
        rows.append(
            f"<tr><td>Layer {layer['number']}</td><td><a href=\"{rel_url(current, layer['path'])}\">{esc(layer['title'])}</a></td><td>{esc(layer['question'])}</td><td><code>{esc(layer['folder'])}</code></td></tr>"
        )
    body = clean(
        f"""
        <section class="hero band">
          <div class="shell hero-grid">
            <div class="hero-copy">
              <p class="eyebrow">Canonical routing reference</p>
              <h1>Davai memory architecture</h1>
              <p class="lede">A seven-layer static guide for deciding where memory belongs, how it should change over time, and how operators keep current state separate from evidence and architectural commitments.</p>
              <div class="hero-actions">
                <a class="button button-primary" href="{rel_url(current, 'implementation.html')}">Build from zero</a>
                <a class="button button-secondary" href="{rel_url(current, 'routing.html')}">Open PROTOCOL.md</a>
              </div>
            </div>
            <div class="route-panel" aria-label="Architecture snapshot">
              <div class="route-line">
                <span>input</span>
                <strong>route by retrieval question</strong>
              </div>
              <div class="route-stack">
                <span>identity/</span>
                <span>semantic/</span>
                <span>episodic/YYYY/MM/</span>
                <span>procedural/</span>
                <span>reference/</span>
                <span>working/</span>
                <span>decisions/</span>
              </div>
            </div>
          </div>
        </section>

        <section class="band band-white" id="layers">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Seven layers</p>
              <h2>Architecture at a glance</h2>
              <p>Each layer exists because it answers a different retrieval question. Folder shape follows retrieval, not source format.</p>
            </div>
            <div class="layer-grid">
              {layer_cards(current)}
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell split">
            <div>
              <p class="eyebrow">Routing frame</p>
              <h2>The question decides the folder</h2>
              <p>Do not ask where the note came from first. Ask what future retrieval will need: identity, timeless fact, dated evidence, instructions, source location, current state, or architectural commitment.</p>
              <table class="spec-table compact">
                <thead><tr><th>Layer</th><th>Name</th><th>Retrieval question</th><th>Path</th></tr></thead>
                <tbody>
                  {''.join(rows)}
                </tbody>
              </table>
            </div>
            {diagram(current, "04_folder_tree.svg", "Davai folder tree with retrieval question callouts.", "Folder layout with the retrieval question attached to each branch.")}
          </div>
        </section>

        <section class="band band-ink">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Publish blockers</p>
              <h2>Known production gaps</h2>
              <p>These are tracked openly so the site is useful as an implementation reference without pretending the instrumentation is complete.</p>
            </div>
            <div class="gap-grid">
              <article><strong>Benchmark data is synthesized.</strong><span>Re-render latency, recall, and router F1 charts from a real harness before making performance claims.</span></article>
              <article><strong>Storyboard scripts assume a mem CLI.</strong><span>Rename the commands or write the CLI before recording operational walkthroughs.</span></article>
              <article><strong>Schema and links need enforcement.</strong><span>Add frontmatter linting and cross-layer link checks to the Janitor loop.</span></article>
              <article><strong>Routing telemetry is missing.</strong><span>Log input, chosen layer, confidence, and correction events so routing can improve from evidence.</span></article>
            </div>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell chart-grid">
            {diagram(current, "01_retrieval_latency.svg", "Synthesized chart comparing retrieval latency as corpus scale grows.", "Synthesized latency chart. Replace with benchmark data before publication.")}
            {diagram(current, "02_first_try_accuracy.svg", "Synthesized chart comparing first try recall as corpus scale grows.", "Synthesized first-try recall chart. Replace with benchmark data before publication.")}
            {diagram(current, "03_router_f1_by_class.svg", "Synthesized bar chart of router F1 by trigger class.", "Synthesized router F1 chart across the seven trigger classes.")}
          </div>
        </section>
        """
    )
    return page_shell(
        current,
        "Davai Memory Architecture",
        "A static guide to the Davai seven-layer memory architecture, routing protocol, lifecycle rules, sync model, and implementation plan.",
        body,
    )


def identity_page() -> str:
    current = "layers/identity.html"
    layer = LAYER_BY_SLUG["identity"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>What belongs here</h2>
              <p>Identity captures durable facts about the user and the standing constraints that should shape responses across sessions. It answers the person question before any project-specific context is loaded.</p>
              {facts_table([
                  ("Good entries", "Preferred name, role, long-lived collaboration preferences, accessibility needs, communication boundaries, durable voice rules."),
                  ("Poor entries", "Today's meeting, a temporary blocker, a one-off preference from a single task, raw biographical source dumps."),
                  ("Primary risk", "Turning dated observations into permanent identity without evidence or consent."),
              ])}
            </div>
            <div class="rule-stack">
              <article>
                <span>Voice rule</span>
                <p>Voice cross-cuts every layer, but the durable preference lives here and the operational policy lives in <a href="{rel_url(current, 'voice.html')}">voice.html</a>.</p>
              </article>
              <article>
                <span>Correction rule</span>
                <p>When identity changes, mutate the current profile and record the evidence that justified the change if the correction could matter later.</p>
              </article>
              <article>
                <span>Retrieval test</span>
                <p>If the future question is "who is Dave?" or "how should I speak to Dave?", the note starts in identity.</p>
              </article>
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell two-col">
            <article class="example good">
              <h3>Good identity note</h3>
              <pre><code>---
type: identity
last_verified: 2026-05-05
confidence: high
---
Dave prefers direct engineering prose with concrete trade-offs,
minimal cheerleading, and explicit assumptions.</code></pre>
            </article>
            <article class="example poor">
              <h3>Poor identity note</h3>
              <pre><code>Dave was frustrated after Tuesday's deploy failed.</code></pre>
              <p>That belongs in episodic first. It might later inform identity only if repeated evidence supports a durable preference or boundary.</p>
            </article>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 1 - Identity", "Layer 1 of Davai: durable user identity, preferences, and voice rules.", body)


def semantic_page() -> str:
    current = "layers/semantic.html"
    layer = LAYER_BY_SLUG["semantic"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Timeless fact layer</h2>
              <p>Semantic notes are compact answers to reusable questions. They should still be traceable, but they should not require the reader to reconstruct a meeting or source document to get the fact.</p>
              {facts_table([
                  ("Good entry", "Davai routes memory by future retrieval question, not by source format."),
                  ("Poor entry", "On May 3, Dave said the router misclassified a runbook as semantic."),
                  ("Split rule", "If the answer needs a date, use episodic. If it needs steps, use procedural. If it points to a long source, use reference."),
              ])}
            </div>
            {diagram(current, "03_router_f1_by_class.svg", "Synthesized router F1 by trigger class.", "Semantic is one trigger class in the router benchmark harness.")}
          </div>
        </section>

        <section class="band">
          <div class="shell two-col">
            <article class="example good">
              <h3>Good semantic note</h3>
              <pre><code>---
type: semantic
topic: memory-routing
last_verified: 2026-05-05
---
A retrieval question is the question future Dave or an agent
will ask when deciding whether this memory should be loaded.</code></pre>
            </article>
            <article class="example poor">
              <h3>Poor semantic note</h3>
              <pre><code>---
type: semantic
---
Meeting notes from launch planning:
- benchmark data still synthetic
- write link checker
- deploy later</code></pre>
              <p>This mixes episodic evidence, working tasks, and procedural follow-up. Decompose it at intake.</p>
            </article>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 2 - Semantic", "Layer 2 of Davai: timeless facts and reusable conceptual memory.", body)


def episodic_page() -> str:
    current = "layers/episodic.html"
    layer = LAYER_BY_SLUG["episodic"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Dated evidence layer</h2>
              <p>Episodic is the ground truth for what happened. The Janitor uses it to detect drift, reconcile current facts, and justify updates to semantic, procedural, identity, and decision records.</p>
              {facts_table([
                  ("Path shape", "<code>episodic/YYYY/MM/</code> keeps chronology easy to scan without inventing topic folders."),
                  ("Correction rule", "Append a correction note with date and reason. Do not silently rewrite the old event."),
                  ("Janitor role", "When facts drift, episodic records provide the evidence trail for consolidation."),
              ])}
              {callout("warn", "Reference implementation", f"Episodic is the audit base for <a href='{rel_url(current, 'lifecycle.html')}'>lifecycle.html</a>. Treat it as evidence, not a polished knowledge page.")}
            </div>
            {diagram(current, "07_drift_audit.svg", "Janitor consolidation walkthrough from stale facts to corrected records.", "A drift audit starts from contradiction and ends with a linked correction.")}
          </div>
        </section>

        <section class="band">
          <div class="shell two-col">
            <article class="example good">
              <h3>Event record</h3>
              <pre><code>---
type: episodic
date: 2026-05-05
source: implementation-review
---
The benchmark charts were identified as synthesized and must
not be used for performance claims until a harness exists.</code></pre>
            </article>
            <article class="example good">
              <h3>Correction record</h3>
              <pre><code>---
type: episodic
date: 2026-05-06
corrects: 2026-05-05-benchmark-note
---
The harness now measures all seven trigger classes. Replace
the synthesized SVG charts with generated benchmark output.</code></pre>
            </article>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 3 - Episodic", "Layer 3 of Davai: dated event records, correction rules, and Janitor ground truth.", body)


def procedural_page() -> str:
    current = "layers/procedural.html"
    layer = LAYER_BY_SLUG["procedural"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Runbooks and repeatable work</h2>
              <p>Procedural memory should let an operator execute a task without re-deriving the sequence. It is not a transcript. It is a maintained operating method.</p>
              {facts_table([
                  ("Good entries", "Build steps, release checklists, Janitor procedures, sync repair, benchmark rerendering."),
                  ("Decision discipline", f"Link major process changes to <a href='{rel_url(current, 'layers/decisions.html')}'>decisions/</a> so operators can see why the runbook changed."),
                  ("Validation", "Every runbook needs a done condition and a rollback or recovery path when failure is plausible."),
              ])}
            </div>
            <div class="template-panel">
              <h3>Worked runbook template</h3>
              <pre><code>---
type: procedural
owner: memory-operator
last_verified: YYYY-MM-DD
related_decisions: [0003, 0005]
---
# Goal
# Preconditions
# Steps
# Validation
# Rollback
# Links</code></pre>
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Procedure smell tests</p>
              <h2>How to keep runbooks executable</h2>
            </div>
            <div class="check-grid">
              <article><strong>Command is copyable.</strong><span>Use exact commands or exact UI paths where possible.</span></article>
              <article><strong>Inputs are named.</strong><span>Declare required files, credentials, branches, and environment variables.</span></article>
              <article><strong>Result is observable.</strong><span>Write the validation step as a concrete test, not a feeling.</span></article>
              <article><strong>Change history is linked.</strong><span>When the method changes for architectural reasons, link the ADR.</span></article>
            </div>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 4 - Procedural", "Layer 4 of Davai: how-to runbooks, repeatable workflows, and validation templates.", body)


def reference_page() -> str:
    current = "layers/reference.html"
    layer = LAYER_BY_SLUG["reference"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Where to look</h2>
              <p>Reference memory is a map to authoritative material. It should make a source findable, scoped, and trustable without copying the whole source into memory.</p>
              {facts_table([
                  ("The 60-second test", "If a future operator cannot find the useful place in the referenced material within 60 seconds, add section anchors, excerpts, or convert the distilled claim into semantic memory."),
                  ("Long doc rule", "Long documents do not become semantic just because they contain facts. Store the pointer here and extract stable facts separately."),
                  ("Verification", "Track owner, location, access notes, and last_verified so stale links can be found by the Janitor."),
              ])}
              {callout("info", "Reference implementation", "Reference points to sources. It should not become the source, the summary, and the procedure at the same time.")}
            </div>
            {diagram(current, "04_folder_tree.svg", "Folder tree showing the reference layer.", "Reference is optimized for source lookup and verification metadata.")}
          </div>
        </section>

        <section class="band">
          <div class="shell two-col">
            <article class="example good">
              <h3>Good reference note</h3>
              <pre><code>---
type: reference
source: Notion/Davai Memory Layers
last_verified: 2026-05-05
owner: Dave
---
Use the "Layer routing" section for canonical trigger definitions.
Extract only stable rules into semantic/.</code></pre>
            </article>
            <article class="example poor">
              <h3>Poor reference note</h3>
              <pre><code>Everything from the Davai Notion page pasted here...</code></pre>
              <p>That creates a stale duplicate. Store the source pointer and extract only what retrieval needs.</p>
            </article>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 5 - Reference", "Layer 5 of Davai: source pointers, the 60-second test, and link hygiene.", body)


def working_page() -> str:
    current = "layers/working.html"
    layer = LAYER_BY_SLUG["working"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Current operating state</h2>
              <p>Working memory is intentionally temporary. It carries what is active now: hypotheses, blockers, task state, and intake items waiting to be decomposed.</p>
              {facts_table([
                  ("No subdirs smell test", "If working/ needs a deep folder tree, the material is probably no longer temporary. Route it to the durable layer."),
                  ("Expiry", "Every working note should have an owner, next action, and review date."),
                  ("Exit paths", "Resolve, delete, or consolidate into semantic, episodic, procedural, reference, identity, or decisions."),
              ])}
            </div>
            {diagram(current, "06_intake_decomposition.svg", "Before and after intake routing into Davai memory layers.", "Working is often the intake buffer before decomposition.")}
          </div>
        </section>

        <section class="band">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Intake decomposition</p>
              <h2>One messy note becomes multiple routed notes</h2>
            </div>
            <div class="check-grid">
              <article><strong>Task state</strong><span>Keep the active next action in working/ until completed or abandoned.</span></article>
              <article><strong>Dated evidence</strong><span>Move what happened into episodic/YYYY/MM/ as the evidence trail.</span></article>
              <article><strong>Durable rule</strong><span>Extract stable facts into semantic/ only after they stand on their own.</span></article>
              <article><strong>Process</strong><span>Convert repeatable steps into procedural/ with validation and rollback.</span></article>
            </div>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 6 - Working", "Layer 6 of Davai: current state, temporary notes, and intake decomposition.", body)


def decisions_page() -> str:
    current = "layers/decisions.html"
    layer = LAYER_BY_SLUG["decisions"]
    body = layer_page_intro(current, layer) + clean(
        f"""
        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Architectural choices</h2>
              <p>Decisions record commitments that should be visible when future work touches the same boundary. They are not meeting notes. They are the durable answer to "what did we choose and why?"</p>
              {facts_table([
                  ("Status values", "proposed, accepted, superseded, rejected."),
                  ("Supersedence", "Prefer a new decision that supersedes the old one over editing history in place."),
                  ("Sync relevance", f"Decisions 0003 and 0005 point to <a href='{rel_url(current, 'sync.html')}'>sync.html</a> for canonical-writer mechanics."),
              ])}
            </div>
            <div class="template-panel">
              <h3>ADR shape</h3>
              <pre><code>---
type: decision
id: 0005
status: accepted
supersedes: [0003]
date: YYYY-MM-DD
---
# Context
# Decision
# Consequences
# Links</code></pre>
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell two-col">
            <article class="example good">
              <h3>Good decision entry</h3>
              <pre><code>Decision 0005: Use canonical-writer sync through a bare
repository and post-receive hook so deployed references are
generated from one accepted source of truth.</code></pre>
            </article>
            <article class="example poor">
              <h3>Poor decision entry</h3>
              <pre><code>We talked about sync and might use Git.</code></pre>
              <p>That is episodic or working memory until the choice, status, and consequences are explicit.</p>
            </article>
          </div>
        </section>
        """
    )
    return page_shell(current, "Layer 7 - Decisions", "Layer 7 of Davai: architectural decisions, ADRs, and supersedence rules.", body)


def layer_page_intro(current: str, layer: dict[str, str]) -> str:
    return clean(
        f"""
        <section class="band layer-hero layer-border-{layer["accent"]}">
          <div class="shell split">
            <div>
              <p class="eyebrow">Layer {layer["number"]}</p>
              <h1>{esc(layer["title"])}: {esc(layer["short"])}</h1>
              <p class="lede">{esc(layer["question"])}</p>
            </div>
            <div class="layer-summary">
              {facts_table([
                  ("Canonical path", f"<code>{esc(layer['folder'])}</code>"),
                  ("Trigger", esc(layer["trigger"])),
                  ("Stores", esc(layer["store"])),
                  ("Avoid", esc(layer["avoid"])),
                  ("Lifecycle", esc(layer["mutation"])),
              ])}
            </div>
          </div>
        </section>
        """
    )


def routing_page() -> str:
    current = "routing.html"
    trigger_rows = []
    for layer in LAYERS:
        trigger_rows.append(
            f"<tr><td>{layer['number']}</td><td><a href=\"{rel_url(current, layer['path'])}\">{esc(layer['title'])}</a></td><td>{esc(layer['trigger'])}</td><td>{esc(layer['question'])}</td></tr>"
        )
    body = clean(
        f"""
        <section class="band hero-small">
          <div class="shell">
            <p class="eyebrow">PROTOCOL.md</p>
            <h1>Routing protocol</h1>
            <p class="lede">Route by future retrieval question. When a note contains more than one retrieval question, split it instead of forcing it into one folder.</p>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Decision tree</h2>
              <ol class="protocol-list">
                <li>Is it durable information about the user or response style? Use identity/.</li>
                <li>Is it a timeless fact or definition? Use semantic/.</li>
                <li>Is it something that happened on a date? Use episodic/YYYY/MM/.</li>
                <li>Is it a repeatable way to do work? Use procedural/.</li>
                <li>Is it a pointer to source material? Use reference/.</li>
                <li>Is it active and temporary? Use working/.</li>
                <li>Is it an accepted architectural choice? Use decisions/.</li>
              </ol>
              {callout("warn", "Split mixed intake", "A meeting note can produce an episodic record, a working task, a semantic fact, and a procedural update. The router should prefer decomposition over compromise.")}
            </div>
            {diagram(current, "05_routing_decision_tree.svg", "Davai PROTOCOL.md decision tree.", "The routing decision tree mirrors the trigger order in PROTOCOL.md.")}
          </div>
        </section>

        <section class="band">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Trigger reference</p>
              <h2>Layer trigger table</h2>
            </div>
            <table class="spec-table">
              <thead><tr><th>#</th><th>Layer</th><th>Triggers</th><th>Retrieval question</th></tr></thead>
              <tbody>{''.join(trigger_rows)}</tbody>
            </table>
          </div>
        </section>
        """
    )
    return page_shell(current, "Routing Protocol", "PROTOCOL.md routing decision tree and trigger reference for Davai memory layers.", body)


def lifecycle_page() -> str:
    current = "lifecycle.html"
    matrix = [
        ("Identity", "Mutate with evidence", "Append only when preserving correction history matters."),
        ("Semantic", "Mutate stable fact", "Append dated evidence in episodic before major changes."),
        ("Episodic", "Append by default", "Never silently rewrite event history."),
        ("Procedural", "Mutate current runbook", "Link major process shifts to decisions."),
        ("Reference", "Mutate verification metadata", "Append source change notes when provenance matters."),
        ("Working", "Mutate or delete", "Consolidate before expiry."),
        ("Decisions", "Supersede", "Do not rewrite accepted rationale."),
    ]
    rows = "".join(f"<tr><th scope=\"row\">{a}</th><td>{b}</td><td>{c}</td></tr>" for a, b, c in matrix)
    body = clean(
        f"""
        <section class="band hero-small">
          <div class="shell">
            <p class="eyebrow">Lifecycle</p>
            <h1>Append, mutate, consolidate</h1>
            <p class="lede">The layer determines how memory is allowed to change. Some records are living documents; others are evidence that should only gain corrections.</p>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Append vs mutate matrix</h2>
              <table class="spec-table">
                <thead><tr><th>Layer</th><th>Default</th><th>Rule</th></tr></thead>
                <tbody>{rows}</tbody>
              </table>
            </div>
            {diagram(current, "07_drift_audit.svg", "Janitor consolidation walkthrough.", "The Janitor turns contradiction into a linked correction path.")}
          </div>
        </section>

        <section class="band">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Janitor</p>
              <h2>Consolidation loop</h2>
            </div>
            <div class="check-grid">
              <article><strong>Find drift.</strong><span>Compare current semantic, procedural, and identity notes against episodic evidence and decisions.</span></article>
              <article><strong>Resolve conflict.</strong><span>Pick the winning record, create corrections, and mark superseded decisions when needed.</span></article>
              <article><strong>Validate links.</strong><span>Check cross-layer links, reference locations, and INDEX.md entries.</span></article>
              <article><strong>Record telemetry.</strong><span>Log routing corrections so the next router learns from actual failures.</span></article>
            </div>
          </div>
        </section>
        """
    )
    return page_shell(current, "Lifecycle", "Append versus mutate rules and the Janitor consolidation workflow for Davai memory.", body)


def index_md_page() -> str:
    current = "index-md.html"
    body = clean(
        f"""
        <section class="band hero-small">
          <div class="shell">
            <p class="eyebrow">INDEX.md</p>
            <h1>Flat registry for retrieval</h1>
            <p class="lede">INDEX.md is a generated map of memory entries. It exists so retrieval can find candidates without crawling every file path or guessing from nested folders.</p>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Format</h2>
              <p>Keep the registry flat, deterministic, and generated. Humans edit memory entries; the generator writes the index.</p>
              <pre><code>| id | layer | title | path | updated | tags | verified |
|---|---|---|---|---|---|---|
| semantic-memory-routing | semantic | Routing by retrieval question | semantic/memory-routing.md | 2026-05-05 | routing,davai | 2026-05-05 |</code></pre>
              {callout("info", "Why flat", "A flat registry gives retrieval one predictable surface. Nested topic indexes invite stale duplicates and hidden priority rules.")}
            </div>
            <div class="template-panel">
              <h3>Generator behavior</h3>
              <ol class="protocol-list">
                <li>Walk the seven canonical folders.</li>
                <li>Read frontmatter with a structured parser.</li>
                <li>Fall back gracefully on missing optional fields.</li>
                <li>Sort by layer, title, and path for stable diffs.</li>
                <li>Emit warnings for missing required fields once the schema is enforced.</li>
              </ol>
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Schema</p>
              <h2>Fields to enforce next</h2>
            </div>
            <div class="check-grid">
              <article><strong>last_verified</strong><span>Required for reference and procedural records; useful for semantic facts.</span></article>
              <article><strong>supersedes</strong><span>Required when a decision or fact replaces earlier material.</span></article>
              <article><strong>source</strong><span>Required when a record depends on an external authority or dated evidence.</span></article>
              <article><strong>owner</strong><span>Required for working notes and operational procedures.</span></article>
            </div>
          </div>
        </section>
        """
    )
    return page_shell(current, "INDEX.md Spec", "INDEX.md registry format, generator behavior, and rationale for a flat memory index.", body)


def sync_page() -> str:
    current = "sync.html"
    body = clean(
        f"""
        <section class="band hero-small">
          <div class="shell">
            <p class="eyebrow">Canonical writer sync</p>
            <h1>Bare repo plus post-receive hook</h1>
            <p class="lede">Decisions 0003 and 0005 define the sync posture: one accepted writer path, one generated site, and a deployment step that does not invent a second source of truth.</p>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Flow</h2>
              <ol class="protocol-list">
                <li>Operator pushes to the bare canonical repository.</li>
                <li>The post-receive hook checks out the accepted branch into a worktree.</li>
                <li>The hook runs validators: frontmatter lint, link check, index generation, and site build.</li>
                <li>The static output is promoted only if validation passes.</li>
              </ol>
              {facts_table([
                  ("Decision 0003", "Establish canonical-writer sync instead of competing writable copies."),
                  ("Decision 0005", "Use post-receive generation to keep the published reference derived from accepted source."),
                  ("Failure mode", "If validation fails, reject promotion and leave the previous static site intact."),
              ])}
            </div>
            <div class="template-panel">
              <h3>Hook sketch</h3>
              <pre><code>#!/usr/bin/env sh
set -eu
GIT_WORK_TREE=/srv/davai/worktree git checkout -f main
cd /srv/davai/worktree
python3 tools/lint_frontmatter.py
python3 tools/check_links.py
python3 tools/build_index.py
python3 build_site.py
rsync -a --delete systembydave/ /srv/www/systembydave/</code></pre>
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Sync guardrails</p>
              <h2>Keep publishing boring</h2>
            </div>
            <div class="check-grid">
              <article><strong>No manual edits on host.</strong><span>Published files are disposable output from the canonical source.</span></article>
              <article><strong>Promotion is atomic.</strong><span>Build to a candidate directory, then swap only after validators pass.</span></article>
              <article><strong>Logs are retained.</strong><span>Keep build and validation logs near the deployment for audit and recovery.</span></article>
              <article><strong>Rollback is explicit.</strong><span>Re-promote a known commit rather than editing generated files in place.</span></article>
            </div>
          </div>
        </section>
        """
    )
    return page_shell(current, "Canonical Writer Sync", "Canonical-writer sync model using a bare repo, post-receive hook, and generated static output.", body)


def voice_page() -> str:
    current = "voice.html"
    body = clean(
        f"""
        <section class="band hero-small">
          <div class="shell">
            <p class="eyebrow">Voice rules</p>
            <h1>Voice cross-cuts every layer</h1>
            <p class="lede">Voice rules affect how memory is expressed, retrieved, summarized, and applied. The durable preference belongs in identity, but the operational rule touches every writer.</p>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell split">
            <div>
              <h2>Why this is not just identity</h2>
              <p>Identity stores the preference. Voice policy tells every layer writer how to express content without weakening retrieval. A procedural runbook, an episodic correction, and a decision record should all follow the same communication constraints while preserving their layer-specific format.</p>
              {facts_table([
                  ("Identity", "Stores durable voice preference and collaboration boundaries."),
                  ("Semantic", "Uses clear definitions and avoids performative phrasing."),
                  ("Episodic", "Records what happened without rewriting tone into analysis."),
                  ("Procedural", "Keeps steps direct, testable, and low-fluff."),
                  ("Decisions", "States trade-offs and consequences without rhetorical padding."),
              ])}
            </div>
            <div class="template-panel">
              <h3>Voice rule note</h3>
              <pre><code>---
type: identity
topic: voice
last_verified: YYYY-MM-DD
---
Prefer direct, concrete engineering prose. Surface assumptions,
trade-offs, and blockers. Avoid cheerleading and filler.</code></pre>
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell two-col">
            <article class="example good">
              <h3>Good voice rule</h3>
              <p>Use concise, factual prose. Put findings before summary in reviews. Name dates, paths, and assumptions when ambiguity matters.</p>
            </article>
            <article class="example poor">
              <h3>Poor voice rule</h3>
              <p>Sound smart and friendly.</p>
              <p>This is too vague to enforce and too subjective to validate.</p>
            </article>
          </div>
        </section>
        """
    )
    return page_shell(current, "Voice Rules", "Voice rules for Davai and why response style cross-cuts every memory layer.", body)


def implementation_page() -> str:
    current = "implementation.html"
    steps = [
        ("Create the seven folders", "identity/, semantic/, episodic/YYYY/MM/, procedural/, reference/, working/, decisions/."),
        ("Define frontmatter", "Use typed metadata before content conventions drift."),
        ("Write PROTOCOL.md", "Codify routing by retrieval question and decomposition rules."),
        ("Seed identity and voice", "Add durable user and response-style constraints first."),
        ("Add INDEX.md generation", "Walk canonical folders and emit a flat registry."),
        ("Create intake flow", "Route mixed input into working first, then split durable records."),
        ("Add Janitor checks", "Find stale working notes, broken links, missing verification, and drift."),
        ("Wire canonical sync", "Use the bare repo and post-receive hook described in sync.html."),
        ("Instrument routing", "Log input, chosen layer, confidence, and correction events."),
        ("Benchmark and publish", "Replace synthesized charts with harness output before performance claims."),
    ]
    step_html = "".join(
        f"<article><span>{i}</span><strong>{esc(title)}</strong><p>{esc(text)}</p></article>"
        for i, (title, text) in enumerate(steps, 1)
    )
    story_href = rel_url(current, "assets/img/08_storyboard_scripts.md")
    body = clean(
        f"""
        <section class="band hero-small">
          <div class="shell">
            <p class="eyebrow">Implementation guide</p>
            <h1>Build Davai from zero</h1>
            <p class="lede">A practical sequence for moving from empty folders to routed memory, generated indexes, sync promotion, and Janitor consolidation.</p>
          </div>
        </section>

        <section class="band band-white">
          <div class="shell">
            <div class="step-grid">
              {step_html}
            </div>
          </div>
        </section>

        <section class="band">
          <div class="shell split">
            <div>
              <h2>Operational walkthroughs</h2>
              <p>The storyboard asset includes scripts for two videos: routing mixed intake and running a Janitor drift audit. The scripts currently assume a <code>mem</code> CLI, which is a production gap until the real tooling name is substituted or the CLI exists.</p>
              <a class="button button-secondary" href="{story_href}">Open storyboard scripts</a>
            </div>
            {diagram(current, "06_intake_decomposition.svg", "Intake decomposition from one mixed note to routed memory files.", "The build should prove decomposition before adding automation.")}
          </div>
        </section>

        <section class="band band-ink">
          <div class="shell">
            <div class="section-heading">
              <p class="eyebrow">Before canonical publication</p>
              <h2>Close the production gaps</h2>
            </div>
            <div class="gap-grid">
              <article><strong>Benchmark harness.</strong><span>Generate charts from real retrieval and router measurements across all seven trigger classes.</span></article>
              <article><strong>Frontmatter linter.</strong><span>Fail commits that omit required fields once the schema is in active use.</span></article>
              <article><strong>Cross-layer link checker.</strong><span>Run during Janitor and during post-receive promotion.</span></article>
              <article><strong>Routing telemetry.</strong><span>Persist decisions and correction labels to train a better router later.</span></article>
            </div>
          </div>
        </section>
        """
    )
    return page_shell(current, "Implementation Guide", "Ten-step implementation guide for building the Davai memory architecture from zero.", body)


def styles_css() -> str:
    return clean(
        """
        :root {
          color-scheme: light;
          --paper: #f7f8f5;
          --white: #ffffff;
          --ink: #171a1f;
          --muted: #5f6670;
          --line: #d9ded8;
          --line-strong: #aab3aa;
          --red: #b63b2f;
          --teal: #08766d;
          --blue: #245b91;
          --gold: #b47a16;
          --violet: #7053a3;
          --green: #4f7d3f;
          --orange: #bd5d22;
          --shadow: 0 24px 60px rgba(23, 26, 31, 0.12);
          --radius: 8px;
          --max: 1180px;
        }

        * { box-sizing: border-box; }

        html {
          scroll-behavior: smooth;
          background: var(--paper);
        }

        body {
          margin: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
          background:
            linear-gradient(90deg, rgba(23, 26, 31, 0.045) 1px, transparent 1px),
            linear-gradient(180deg, rgba(23, 26, 31, 0.035) 1px, transparent 1px),
            var(--paper);
          background-size: 32px 32px;
          line-height: 1.55;
        }

        a {
          color: inherit;
          text-decoration-color: rgba(8, 118, 109, 0.45);
          text-decoration-thickness: 0.08em;
          text-underline-offset: 0.18em;
        }

        a:hover { text-decoration-color: currentColor; }

        img { max-width: 100%; display: block; }

        code, pre {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        }

        pre {
          margin: 0;
          padding: 1rem;
          overflow: auto;
          color: #eef4ed;
          background: #171a1f;
          border-radius: var(--radius);
          font-size: 0.88rem;
          line-height: 1.55;
        }

        .skip-link {
          position: absolute;
          left: 1rem;
          top: 1rem;
          transform: translateY(-160%);
          padding: 0.7rem 0.9rem;
          background: var(--ink);
          color: var(--white);
          border-radius: var(--radius);
          z-index: 20;
        }

        .skip-link:focus { transform: translateY(0); }

        :focus-visible {
          outline: 3px solid var(--gold);
          outline-offset: 3px;
        }

        .shell {
          width: min(var(--max), calc(100% - 2rem));
          margin-inline: auto;
        }

        .site-header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: rgba(247, 248, 245, 0.94);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--line);
        }

        .header-inner {
          min-height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          min-width: max-content;
        }

        .brand-mark {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          color: var(--white);
          background: var(--ink);
          border-radius: 6px;
          font-weight: 850;
          letter-spacing: 0;
        }

        .brand strong,
        .brand small {
          display: block;
          line-height: 1.1;
        }

        .brand small {
          margin-top: 0.18rem;
          color: var(--muted);
          font-size: 0.78rem;
        }

        .primary-nav {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 0.25rem;
        }

        .nav-link,
        .layer-chip,
        .button {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 6px;
          transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease;
        }

        .nav-link {
          padding: 0.45rem 0.7rem;
          color: #303640;
          font-size: 0.9rem;
        }

        .nav-link:hover,
        .nav-link.is-active {
          background: var(--ink);
          color: var(--white);
        }

        .layer-rail {
          border-top: 1px solid var(--line);
          overflow-x: auto;
        }

        .layer-strip {
          display: flex;
          gap: 0.35rem;
          padding-block: 0.5rem;
        }

        .layer-chip {
          flex: 0 0 auto;
          gap: 0.4rem;
          padding: 0.38rem 0.58rem 0.38rem 0.42rem;
          border: 1px solid var(--line);
          background: var(--white);
          font-size: 0.85rem;
          color: #303640;
        }

        .layer-chip span {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          border-radius: 4px;
          color: var(--white);
          background: var(--ink);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .layer-chip:hover,
        .layer-chip.is-active {
          border-color: var(--ink);
          transform: translateY(-1px);
        }

        .band {
          padding: 5rem 0;
        }

        .band-white {
          background: rgba(255, 255, 255, 0.76);
          border-block: 1px solid var(--line);
        }

        .band-ink {
          color: var(--white);
          background:
            linear-gradient(120deg, rgba(8, 118, 109, 0.18), transparent 34%),
            linear-gradient(240deg, rgba(180, 122, 22, 0.18), transparent 35%),
            var(--ink);
        }

        .hero {
          min-height: 620px;
          display: grid;
          align-items: center;
        }

        .hero-grid,
        .split,
        .two-col,
        .chart-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: clamp(1.5rem, 4vw, 4rem);
          align-items: center;
        }

        .hero-grid > *,
        .split > *,
        .two-col > *,
        .chart-grid > * {
          min-width: 0;
        }

        .hero-small {
          padding: 4.5rem 0 3.5rem;
        }

        .hero-small .shell {
          max-width: 880px;
          margin-left: max(1rem, calc((100vw - var(--max)) / 2));
        }

        .eyebrow {
          margin: 0 0 0.8rem;
          color: var(--teal);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .band-ink .eyebrow { color: #8fe1d7; }

        h1, h2, h3, p {
          margin-top: 0;
        }

        h1 {
          margin-bottom: 1rem;
          max-width: 12ch;
          font-size: clamp(3.3rem, 9vw, 7.5rem);
          line-height: 0.92;
          letter-spacing: 0;
          overflow-wrap: break-word;
        }

        .hero-small h1,
        .layer-hero h1 {
          max-width: 15ch;
          font-size: clamp(2.8rem, 7vw, 5.8rem);
        }

        h2 {
          margin-bottom: 0.75rem;
          font-size: clamp(2rem, 4vw, 3.4rem);
          line-height: 1.02;
          letter-spacing: 0;
        }

        h3 {
          margin-bottom: 0.55rem;
          font-size: 1.25rem;
          line-height: 1.2;
        }

        .lede {
          max-width: 68ch;
          color: #303640;
          font-size: clamp(1.1rem, 2vw, 1.35rem);
        }

        .band-ink .lede,
        .band-ink p { color: rgba(255, 255, 255, 0.78); }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 2rem;
        }

        .button {
          min-width: 11rem;
          padding: 0.8rem 1rem;
          border: 1px solid var(--ink);
          font-weight: 800;
        }

        .button:hover { transform: translateY(-1px); }

        .button-primary {
          color: var(--white);
          background: var(--ink);
        }

        .button-secondary {
          color: var(--ink);
          background: var(--white);
        }

        .route-panel {
          padding: clamp(1rem, 2vw, 1.5rem);
          background: var(--white);
          border: 1px solid var(--line-strong);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }

        .route-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--line);
          color: var(--muted);
          font-size: 0.9rem;
        }

        .route-line strong {
          color: var(--ink);
          text-align: right;
        }

        .route-stack {
          display: grid;
          gap: 0.55rem;
          margin-top: 1rem;
        }

        .route-stack span {
          display: block;
          padding: 0.85rem;
          color: var(--white);
          background: var(--ink);
          border-left: 8px solid var(--teal);
          border-radius: 6px;
          font-family: "SFMono-Regular", Consolas, monospace;
          font-size: 0.95rem;
        }

        .route-stack span:nth-child(1) { border-color: var(--red); }
        .route-stack span:nth-child(2) { border-color: var(--teal); }
        .route-stack span:nth-child(3) { border-color: var(--blue); }
        .route-stack span:nth-child(4) { border-color: var(--gold); }
        .route-stack span:nth-child(5) { border-color: var(--violet); }
        .route-stack span:nth-child(6) { border-color: var(--green); }
        .route-stack span:nth-child(7) { border-color: var(--orange); }

        .section-heading {
          max-width: 780px;
          margin-bottom: 2rem;
        }

        .section-heading p {
          color: var(--muted);
          font-size: 1.08rem;
        }

        .layer-grid,
        .gap-grid,
        .check-grid,
        .step-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1rem;
        }

        .layer-grid {
          grid-template-columns: repeat(7, minmax(160px, 1fr));
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .layer-card,
        .gap-grid article,
        .check-grid article,
        .step-grid article,
        .example,
        .template-panel,
        .layer-summary,
        .callout,
        .diagram {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius);
        }

        .layer-card {
          min-height: 250px;
          border-top-width: 6px;
        }

        .layer-card-link {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          padding: 1rem;
          text-decoration: none;
        }

        .layer-card h3 {
          font-size: 1.35rem;
        }

        .layer-card p {
          color: var(--muted);
          font-size: 0.95rem;
        }

        .layer-card code,
        .spec-table code {
          padding: 0.12rem 0.28rem;
          background: #eef1ed;
          border: 1px solid var(--line);
          border-radius: 4px;
          color: #293037;
          white-space: nowrap;
        }

        .layer-card code {
          margin-top: auto;
          width: fit-content;
          white-space: normal;
        }

        .layer-index {
          color: var(--muted);
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .layer-border-red { border-color: var(--red); }
        .layer-border-teal { border-color: var(--teal); }
        .layer-border-blue { border-color: var(--blue); }
        .layer-border-gold { border-color: var(--gold); }
        .layer-border-violet { border-color: var(--violet); }
        .layer-border-green { border-color: var(--green); }
        .layer-border-orange { border-color: var(--orange); }

        .layer-red span { background: var(--red); }
        .layer-teal span { background: var(--teal); }
        .layer-blue span { background: var(--blue); }
        .layer-gold span { background: var(--gold); }
        .layer-violet span { background: var(--violet); }
        .layer-green span { background: var(--green); }
        .layer-orange span { background: var(--orange); }

        .spec-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: var(--radius);
          overflow: hidden;
          font-size: 0.95rem;
        }

        .spec-table th,
        .spec-table td {
          padding: 0.85rem;
          vertical-align: top;
          border-bottom: 1px solid var(--line);
          text-align: left;
        }

        .spec-table th {
          width: 10rem;
          color: #303640;
          background: #f0f2ef;
        }

        .spec-table tr:last-child th,
        .spec-table tr:last-child td {
          border-bottom: 0;
        }

        .compact {
          font-size: 0.88rem;
        }

        .compact th,
        .compact td {
          padding: 0.65rem;
        }

        .diagram {
          overflow: hidden;
          box-shadow: var(--shadow);
        }

        .diagram img {
          width: 100%;
          background: #fbfcfa;
        }

        .diagram figcaption {
          padding: 0.8rem 1rem;
          color: var(--muted);
          border-top: 1px solid var(--line);
          font-size: 0.9rem;
        }

        .chart-grid {
          align-items: stretch;
        }

        .chart-grid .diagram:nth-child(3) {
          grid-column: 1 / -1;
        }

        .gap-grid article,
        .check-grid article,
        .step-grid article {
          padding: 1rem;
        }

        .gap-grid article {
          color: var(--ink);
          background: rgba(255, 255, 255, 0.94);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .gap-grid strong,
        .check-grid strong,
        .step-grid strong {
          display: block;
          margin-bottom: 0.4rem;
          line-height: 1.2;
        }

        .gap-grid span,
        .check-grid span,
        .step-grid p {
          color: var(--muted);
          font-size: 0.95rem;
        }

        .band-ink .gap-grid span { color: #4d5662; }

        .two-col {
          align-items: stretch;
        }

        .example,
        .template-panel,
        .layer-summary,
        .callout {
          padding: 1rem;
        }

        .example.good {
          border-top: 5px solid var(--teal);
        }

        .example.poor {
          border-top: 5px solid var(--red);
        }

        .rule-stack {
          display: grid;
          gap: 1rem;
        }

        .rule-stack article {
          padding: 1rem;
          background: var(--white);
          border-left: 5px solid var(--teal);
          border-radius: var(--radius);
          box-shadow: 0 12px 28px rgba(23, 26, 31, 0.08);
        }

        .rule-stack span {
          display: block;
          margin-bottom: 0.35rem;
          color: var(--muted);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .template-panel h3 {
          margin-bottom: 1rem;
        }

        .callout {
          margin-top: 1rem;
          border-left-width: 6px;
        }

        .callout p {
          margin-bottom: 0;
          color: var(--muted);
        }

        .callout-info { border-left-color: var(--blue); }
        .callout-warn { border-left-color: var(--gold); }

        .protocol-list {
          display: grid;
          gap: 0.6rem;
          padding-left: 1.35rem;
        }

        .protocol-list li {
          padding-left: 0.25rem;
        }

        .step-grid {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .step-grid article span {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          margin-bottom: 0.8rem;
          color: var(--white);
          background: var(--ink);
          border-radius: 5px;
          font-weight: 850;
        }

        .site-footer {
          padding: 2rem 0;
          color: rgba(255, 255, 255, 0.74);
          background: #101216;
        }

        .footer-grid {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
        }

        .footer-grid p {
          max-width: 58ch;
          margin: 0.35rem 0 0;
        }

        .footer-grid div:last-child {
          display: grid;
          justify-items: end;
          gap: 0.25rem;
          min-width: max-content;
        }

        .footer-grid a {
          color: var(--white);
        }

        @media (max-width: 980px) {
          .header-inner {
            align-items: flex-start;
            flex-direction: column;
            padding-block: 1rem;
          }

          .primary-nav {
            justify-content: flex-start;
          }

          .hero-grid,
          .split,
          .two-col,
          .chart-grid {
            grid-template-columns: 1fr;
          }

          .layer-grid {
            grid-template-columns: repeat(3, minmax(190px, 1fr));
          }

          .gap-grid,
          .check-grid,
          .step-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hero {
            min-height: auto;
          }
        }

        @media (max-width: 640px) {
          .shell {
            width: calc(100% - 1rem);
          }

          .band {
            padding: 3.25rem 0;
          }

          .hero-small {
            padding: 3rem 0 2.5rem;
          }

          h1 {
            font-size: 3.1rem;
          }

          .hero-small h1,
          .layer-hero h1 {
            font-size: 2.65rem;
          }

          h2 {
            font-size: 2rem;
          }

          .primary-nav {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nav-link {
            justify-content: flex-start;
          }

          .layer-grid,
          .gap-grid,
          .check-grid,
          .step-grid {
            grid-template-columns: 1fr;
          }

          .spec-table {
            display: block;
            overflow: hidden;
            white-space: nowrap;
          }

          .spec-table thead {
            display: none;
          }

          .spec-table tbody,
          .spec-table tr,
          .spec-table th,
          .spec-table td {
            display: block;
            width: 100%;
            min-width: 0;
            white-space: normal;
          }

          .spec-table tr {
            border-bottom: 1px solid var(--line);
          }

          .spec-table tr:last-child {
            border-bottom: 0;
          }

          .spec-table th,
          .spec-table td {
            border-bottom: 0;
          }

          .hero-actions,
          .footer-grid {
            flex-direction: column;
          }

          .button {
            width: 100%;
          }

          pre {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          }

          pre code {
            white-space: inherit;
          }

          .footer-grid div:last-child {
            justify-items: start;
            min-width: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *,
          *::before,
          *::after {
            transition-duration: 0.001ms !important;
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
        """
    )


def svg_01() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 600" role="img" aria-labelledby="title desc">
          <title id="title">Synthesized retrieval latency vs corpus scale</title>
          <desc id="desc">Line chart comparing a flat corpus to Davai layered retrieval. Numbers are illustrative and must be replaced with benchmark data.</desc>
          <rect width="980" height="600" fill="#fbfcfa"/>
          <path d="M90 70H900V500H90Z" fill="#fff" stroke="#d9ded8"/>
          <g stroke="#e6eae5" stroke-width="1">
            <path d="M90 414H900"/><path d="M90 328H900"/><path d="M90 242H900"/><path d="M90 156H900"/>
            <path d="M225 70V500"/><path d="M360 70V500"/><path d="M495 70V500"/><path d="M630 70V500"/><path d="M765 70V500"/>
          </g>
          <g fill="#5f6670" font-family="Inter,Arial,sans-serif" font-size="18">
            <text x="90" y="548">100</text><text x="222" y="548">1k</text><text x="352" y="548">5k</text><text x="486" y="548">25k</text><text x="620" y="548">100k</text><text x="748" y="548">500k</text>
            <text x="28" y="505">0ms</text><text x="20" y="419">200</text><text x="20" y="333">400</text><text x="20" y="247">600</text><text x="20" y="161">800</text><text x="10" y="75">1000</text>
          </g>
          <path d="M112 460 C220 432 330 365 450 284 S700 142 868 98" fill="none" stroke="#b63b2f" stroke-width="6" stroke-linecap="round"/>
          <path d="M112 462 C250 447 372 430 492 397 S742 340 868 312" fill="none" stroke="#245b91" stroke-width="6" stroke-linecap="round"/>
          <path d="M112 456 C250 449 372 443 492 432 S742 412 868 398" fill="none" stroke="#08766d" stroke-width="6" stroke-linecap="round"/>
          <g font-family="Inter,Arial,sans-serif">
            <text x="90" y="40" fill="#171a1f" font-size="30" font-weight="800">Retrieval latency vs. corpus scale</text>
            <text x="90" y="574" fill="#5f6670" font-size="16">Corpus items, log scale</text>
            <text transform="translate(24 350) rotate(-90)" fill="#5f6670" font-size="16">Median retrieval latency</text>
            <rect x="620" y="88" width="250" height="112" rx="8" fill="#fff" stroke="#d9ded8"/>
            <circle cx="642" cy="122" r="7" fill="#b63b2f"/><text x="660" y="128" fill="#171a1f" font-size="16">Flat registry only</text>
            <circle cx="642" cy="154" r="7" fill="#245b91"/><text x="660" y="160" fill="#171a1f" font-size="16">Topic folders</text>
            <circle cx="642" cy="186" r="7" fill="#08766d"/><text x="660" y="192" fill="#171a1f" font-size="16">Davai layered</text>
            <text x="588" y="535" fill="#b63b2f" font-size="14" font-weight="700">Synthesized data</text>
          </g>
        </svg>
        """
    )


def svg_02() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 600" role="img" aria-labelledby="title desc">
          <title id="title">Synthesized first-try recall vs corpus scale</title>
          <desc id="desc">Line chart comparing first-try recall accuracy across corpus sizes. Values are illustrative.</desc>
          <rect width="980" height="600" fill="#fbfcfa"/>
          <path d="M90 70H900V500H90Z" fill="#fff" stroke="#d9ded8"/>
          <g stroke="#e6eae5" stroke-width="1">
            <path d="M90 414H900"/><path d="M90 328H900"/><path d="M90 242H900"/><path d="M90 156H900"/>
            <path d="M225 70V500"/><path d="M360 70V500"/><path d="M495 70V500"/><path d="M630 70V500"/><path d="M765 70V500"/>
          </g>
          <g fill="#5f6670" font-family="Inter,Arial,sans-serif" font-size="18">
            <text x="90" y="548">100</text><text x="222" y="548">1k</text><text x="352" y="548">5k</text><text x="486" y="548">25k</text><text x="620" y="548">100k</text><text x="748" y="548">500k</text>
            <text x="30" y="505">60%</text><text x="30" y="419">70</text><text x="30" y="333">80</text><text x="30" y="247">90</text><text x="22" y="161">100</text>
          </g>
          <path d="M112 120 C248 146 372 210 500 292 S736 410 868 456" fill="none" stroke="#b63b2f" stroke-width="6" stroke-linecap="round"/>
          <path d="M112 116 C248 130 372 156 500 205 S736 280 868 342" fill="none" stroke="#245b91" stroke-width="6" stroke-linecap="round"/>
          <path d="M112 114 C248 119 372 126 500 140 S736 164 868 190" fill="none" stroke="#08766d" stroke-width="6" stroke-linecap="round"/>
          <g font-family="Inter,Arial,sans-serif">
            <text x="90" y="40" fill="#171a1f" font-size="30" font-weight="800">First-try recall vs. corpus scale</text>
            <text x="90" y="574" fill="#5f6670" font-size="16">Corpus items, log scale</text>
            <text transform="translate(24 365) rotate(-90)" fill="#5f6670" font-size="16">Recall on first retrieval attempt</text>
            <rect x="620" y="88" width="250" height="112" rx="8" fill="#fff" stroke="#d9ded8"/>
            <circle cx="642" cy="122" r="7" fill="#b63b2f"/><text x="660" y="128" fill="#171a1f" font-size="16">Flat registry only</text>
            <circle cx="642" cy="154" r="7" fill="#245b91"/><text x="660" y="160" fill="#171a1f" font-size="16">Topic folders</text>
            <circle cx="642" cy="186" r="7" fill="#08766d"/><text x="660" y="192" fill="#171a1f" font-size="16">Davai layered</text>
            <text x="588" y="535" fill="#b63b2f" font-size="14" font-weight="700">Synthesized data</text>
          </g>
        </svg>
        """
    )


def svg_03() -> str:
    labels = [
        ("identity", 92, "#b63b2f"),
        ("semantic", 88, "#08766d"),
        ("episodic", 94, "#245b91"),
        ("procedural", 86, "#b47a16"),
        ("reference", 83, "#7053a3"),
        ("working", 89, "#4f7d3f"),
        ("decisions", 91, "#bd5d22"),
    ]
    bars = []
    for index, (label, value, color) in enumerate(labels):
        x = 115 + index * 118
        height = value * 3.7
        y = 480 - height
        bars.append(
            f'<rect x="{x}" y="{y:.1f}" width="70" height="{height:.1f}" rx="7" fill="{color}"/>'
            f'<text x="{x + 35}" y="{y - 14:.1f}" text-anchor="middle" fill="#171a1f" font-size="18" font-weight="800">{value/100:.2f}</text>'
            f'<text x="{x + 35}" y="523" text-anchor="middle" fill="#5f6670" font-size="16">{label}</text>'
        )
    return clean(
        f"""
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 600" role="img" aria-labelledby="title desc">
          <title id="title">Synthesized router F1 by trigger class</title>
          <desc id="desc">Bar chart showing illustrative router F1 values for the seven Davai trigger classes.</desc>
          <rect width="980" height="600" fill="#fbfcfa"/>
          <path d="M80 70H910V480H80Z" fill="#fff" stroke="#d9ded8"/>
          <g stroke="#e6eae5" stroke-width="1">
            <path d="M80 406H910"/><path d="M80 332H910"/><path d="M80 258H910"/><path d="M80 184H910"/><path d="M80 110H910"/>
          </g>
          <g fill="#5f6670" font-family="Inter,Arial,sans-serif" font-size="16">
            <text x="36" y="485">0.00</text><text x="36" y="411">0.20</text><text x="36" y="337">0.40</text><text x="36" y="263">0.60</text><text x="36" y="189">0.80</text><text x="36" y="115">1.00</text>
          </g>
          <g font-family="Inter,Arial,sans-serif">{''.join(bars)}</g>
          <g font-family="Inter,Arial,sans-serif">
            <text x="80" y="40" fill="#171a1f" font-size="30" font-weight="800">Router F1 by layer trigger class</text>
            <text x="80" y="566" fill="#5f6670" font-size="16">Trigger class</text>
            <text transform="translate(22 330) rotate(-90)" fill="#5f6670" font-size="16">F1 score</text>
            <text x="714" y="566" fill="#b63b2f" font-size="14" font-weight="700">Synthesized data</text>
          </g>
        </svg>
        """
    )


def svg_04() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 760" role="img" aria-labelledby="title desc">
          <title id="title">Davai folder tree with retrieval question callouts</title>
          <desc id="desc">Architecture diagram showing the seven canonical Davai folders and the retrieval question for each folder.</desc>
          <rect width="1000" height="760" fill="#fbfcfa"/>
          <style>
            .label{font:700 22px Inter,Arial,sans-serif;fill:#171a1f}.path{font:700 18px monospace;fill:#fff}.q{font:16px Inter,Arial,sans-serif;fill:#303640}.small{font:14px Inter,Arial,sans-serif;fill:#5f6670}.line{stroke:#aab3aa;stroke-width:3;fill:none}.box{fill:#fff;stroke:#d9ded8;stroke-width:2;rx:8}.root{fill:#171a1f;rx:8}
          </style>
          <rect x="54" y="48" width="240" height="64" class="root"/>
          <text x="78" y="88" class="path">davai/</text>
          <path d="M174 112V680" class="line"/>
          <g>
            <path d="M174 158H322" class="line"/><rect x="322" y="124" width="206" height="68" rx="8" fill="#b63b2f"/><text x="344" y="166" class="path">identity/</text><rect x="560" y="124" width="380" height="68" class="box"/><text x="582" y="152" class="q">Who is this person?</text><text x="582" y="176" class="small">Durable preferences, profile, voice anchor.</text>
            <path d="M174 238H322" class="line"/><rect x="322" y="204" width="206" height="68" rx="8" fill="#08766d"/><text x="344" y="246" class="path">semantic/</text><rect x="560" y="204" width="380" height="68" class="box"/><text x="582" y="232" class="q">What is timelessly true?</text><text x="582" y="256" class="small">Definitions, facts, stable rules.</text>
            <path d="M174 318H322" class="line"/><rect x="322" y="284" width="206" height="68" rx="8" fill="#245b91"/><text x="344" y="326" class="path">episodic/YYYY/MM/</text><rect x="560" y="284" width="380" height="68" class="box"/><text x="582" y="312" class="q">What happened when?</text><text x="582" y="336" class="small">Dated evidence and corrections.</text>
            <path d="M174 398H322" class="line"/><rect x="322" y="364" width="206" height="68" rx="8" fill="#b47a16"/><text x="344" y="406" class="path">procedural/</text><rect x="560" y="364" width="380" height="68" class="box"/><text x="582" y="392" class="q">How do we do this?</text><text x="582" y="416" class="small">Runbooks, commands, validation.</text>
            <path d="M174 478H322" class="line"/><rect x="322" y="444" width="206" height="68" rx="8" fill="#7053a3"/><text x="344" y="486" class="path">reference/</text><rect x="560" y="444" width="380" height="68" class="box"/><text x="582" y="472" class="q">Where should we look?</text><text x="582" y="496" class="small">Pointers, source maps, verification.</text>
            <path d="M174 558H322" class="line"/><rect x="322" y="524" width="206" height="68" rx="8" fill="#4f7d3f"/><text x="344" y="566" class="path">working/</text><rect x="560" y="524" width="380" height="68" class="box"/><text x="582" y="552" class="q">What is active right now?</text><text x="582" y="576" class="small">Temporary state, blockers, intake.</text>
            <path d="M174 638H322" class="line"/><rect x="322" y="604" width="206" height="68" rx="8" fill="#bd5d22"/><text x="344" y="646" class="path">decisions/</text><rect x="560" y="604" width="380" height="68" class="box"/><text x="582" y="632" class="q">What did we choose and why?</text><text x="582" y="656" class="small">ADRs, supersedence, consequences.</text>
          </g>
          <text x="54" y="724" class="small">Folder shape follows retrieval question, not source format.</text>
        </svg>
        """
    )


def svg_05() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 760" role="img" aria-labelledby="title desc">
          <title id="title">PROTOCOL.md routing decision tree</title>
          <desc id="desc">Routing tree that maps incoming memory to identity, semantic, episodic, procedural, reference, working, or decisions.</desc>
          <rect width="1100" height="760" fill="#fbfcfa"/>
          <style>
            .node{fill:#fff;stroke:#d9ded8;stroke-width:2;rx:8}.root{fill:#171a1f;rx:8}.t{font:700 20px Inter,Arial,sans-serif;fill:#171a1f}.w{font:700 20px Inter,Arial,sans-serif;fill:#fff}.s{font:15px Inter,Arial,sans-serif;fill:#5f6670}.path{font:700 16px monospace;fill:#fff}.line{stroke:#aab3aa;stroke-width:3;fill:none}.yes{font:700 14px Inter,Arial,sans-serif;fill:#08766d}.no{font:700 14px Inter,Arial,sans-serif;fill:#b63b2f}
          </style>
          <rect x="405" y="34" width="290" height="70" class="root"/><text x="456" y="76" class="w">New memory item</text>
          <path d="M550 104V145" class="line"/>
          <rect x="360" y="145" width="380" height="74" class="node"/><text x="394" y="174" class="t">One retrieval question?</text><text x="394" y="200" class="s">If mixed, split before routing.</text>
          <path d="M360 182H170V260" class="line"/><text x="214" y="174" class="no">no</text><rect x="60" y="260" width="220" height="70" rx="8" fill="#4f7d3f"/><text x="94" y="290" class="path">working/</text><text x="94" y="314" class="path">then decompose</text>
          <path d="M550 219V260" class="line"/><text x="564" y="244" class="yes">yes</text>
          <rect x="350" y="260" width="400" height="68" class="node"/><text x="378" y="302" class="t">Durable user or voice rule?</text>
          <path d="M350 294H150V374" class="line"/><text x="224" y="286" class="yes">yes</text><rect x="52" y="374" width="206" height="58" rx="8" fill="#b63b2f"/><text x="78" y="411" class="path">identity/</text>
          <path d="M550 328V374" class="line"/><text x="565" y="354" class="no">no</text>
          <rect x="350" y="374" width="400" height="68" class="node"/><text x="378" y="416" class="t">Timeless fact or definition?</text>
          <path d="M750 408H940V374" class="line"/><text x="828" y="400" class="yes">yes</text><rect x="832" y="316" width="206" height="58" rx="8" fill="#08766d"/><text x="858" y="353" class="path">semantic/</text>
          <path d="M550 442V486" class="line"/><text x="565" y="468" class="no">no</text>
          <rect x="350" y="486" width="400" height="68" class="node"/><text x="378" y="528" class="t">Dated event or correction?</text>
          <path d="M350 520H150V558" class="line"/><text x="224" y="512" class="yes">yes</text><rect x="52" y="558" width="246" height="58" rx="8" fill="#245b91"/><text x="78" y="595" class="path">episodic/YYYY/MM/</text>
          <path d="M550 554V596" class="line"/><text x="565" y="580" class="no">no</text>
          <rect x="350" y="596" width="400" height="68" class="node"/><text x="378" y="638" class="t">Procedure, source, or choice?</text>
          <path d="M350 630H150V680" class="line"/><rect x="52" y="680" width="206" height="54" rx="8" fill="#b47a16"/><text x="78" y="714" class="path">procedural/</text>
          <path d="M550 664V707H447" class="line"/><rect x="330" y="680" width="206" height="54" rx="8" fill="#7053a3"/><text x="356" y="714" class="path">reference/</text>
          <path d="M750 630H940V680" class="line"/><rect x="832" y="680" width="206" height="54" rx="8" fill="#bd5d22"/><text x="858" y="714" class="path">decisions/</text>
          <text x="80" y="52" class="s">Fallback: if active and temporary, use working/ with expiry.</text>
        </svg>
        """
    )


def svg_06() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 680" role="img" aria-labelledby="title desc">
          <title id="title">Before and after intake decomposition</title>
          <desc id="desc">Diagram showing one mixed intake note split into working, episodic, semantic, and procedural records.</desc>
          <rect width="1100" height="680" fill="#fbfcfa"/>
          <style>
            .box{fill:#fff;stroke:#d9ded8;stroke-width:2;rx:8}.dark{fill:#171a1f;rx:8}.t{font:800 24px Inter,Arial,sans-serif;fill:#171a1f}.w{font:800 24px Inter,Arial,sans-serif;fill:#fff}.s{font:16px Inter,Arial,sans-serif;fill:#303640}.m{font:15px Inter,Arial,sans-serif;fill:#5f6670}.path{font:700 17px monospace;fill:#fff}.line{stroke:#aab3aa;stroke-width:3;fill:none;marker-end:url(#arrow)}
          </style>
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6Z" fill="#aab3aa"/></marker></defs>
          <text x="60" y="58" class="t">Before: mixed intake</text>
          <rect x="60" y="90" width="410" height="470" class="box"/>
          <text x="92" y="135" class="s">Launch review note</text>
          <text x="92" y="178" class="m">- benchmark charts are synthetic</text>
          <text x="92" y="212" class="m">- Janitor needs link checker</text>
          <text x="92" y="246" class="m">- update runbook after sync change</text>
          <text x="92" y="280" class="m">- blocker: deploy workflow missing</text>
          <text x="92" y="314" class="m">- Dave wants direct, factual copy</text>
          <path d="M490 325H606" class="line"/>
          <text x="600" y="58" class="t">After: routed records</text>
          <g>
            <rect x="635" y="90" width="370" height="82" rx="8" fill="#4f7d3f"/><text x="660" y="124" class="path">working/deploy-workflow.md</text><text x="660" y="150" class="path">active blocker + next action</text>
            <rect x="635" y="204" width="370" height="82" rx="8" fill="#245b91"/><text x="660" y="238" class="path">episodic/2026/05/review.md</text><text x="660" y="264" class="path">dated evidence</text>
            <rect x="635" y="318" width="370" height="82" rx="8" fill="#08766d"/><text x="660" y="352" class="path">semantic/perf-claims.md</text><text x="660" y="378" class="path">stable rule: no synthetic claims</text>
            <rect x="635" y="432" width="370" height="82" rx="8" fill="#b47a16"/><text x="660" y="466" class="path">procedural/janitor-link-check.md</text><text x="660" y="492" class="path">repeatable validation step</text>
            <rect x="635" y="546" width="370" height="82" rx="8" fill="#b63b2f"/><text x="660" y="580" class="path">identity/voice.md</text><text x="660" y="606" class="path">durable communication rule</text>
          </g>
        </svg>
        """
    )


def svg_07() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 700" role="img" aria-labelledby="title desc">
          <title id="title">Janitor consolidation walkthrough</title>
          <desc id="desc">Diagram showing the Janitor workflow: detect drift, inspect episodic evidence, update current memory, and link correction.</desc>
          <rect width="1100" height="700" fill="#fbfcfa"/>
          <style>
            .card{fill:#fff;stroke:#d9ded8;stroke-width:2;rx:8}.head{rx:8}.t{font:800 24px Inter,Arial,sans-serif;fill:#171a1f}.s{font:16px Inter,Arial,sans-serif;fill:#303640}.m{font:15px Inter,Arial,sans-serif;fill:#5f6670}.path{font:700 17px monospace;fill:#fff}.line{stroke:#aab3aa;stroke-width:3;fill:none;marker-end:url(#arrow)}
          </style>
          <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6Z" fill="#aab3aa"/></marker></defs>
          <text x="70" y="58" class="t">Janitor drift audit</text>
          <g>
            <rect x="70" y="100" width="220" height="88" class="card"/><rect x="70" y="100" width="220" height="34" rx="8" fill="#b63b2f"/><text x="92" y="124" class="path">1 detect drift</text><text x="92" y="160" class="s">Semantic fact conflicts</text><text x="92" y="181" class="m">with current evidence.</text>
            <path d="M290 144H386" class="line"/>
            <rect x="400" y="100" width="220" height="88" class="card"/><rect x="400" y="100" width="220" height="34" rx="8" fill="#245b91"/><text x="422" y="124" class="path">2 inspect events</text><text x="422" y="160" class="s">Check episodic records</text><text x="422" y="181" class="m">and corrections.</text>
            <path d="M620 144H716" class="line"/>
            <rect x="730" y="100" width="270" height="88" class="card"/><rect x="730" y="100" width="270" height="34" rx="8" fill="#08766d"/><text x="752" y="124" class="path">3 update current fact</text><text x="752" y="160" class="s">Mutate semantic record</text><text x="752" y="181" class="m">with evidence link.</text>
          </g>
          <g>
            <rect x="135" y="280" width="830" height="300" class="card"/>
            <text x="170" y="330" class="t">Example</text>
            <text x="170" y="378" class="s">Old semantic: "Charts prove layered retrieval is faster at scale."</text>
            <text x="170" y="420" class="s">Episodic evidence: "Charts are synthesized and illustrative."</text>
            <text x="170" y="462" class="s">Correction: "Do not publish performance claims until benchmark harness replaces SVG data."</text>
            <text x="170" y="526" class="m">Output links: semantic/performance-claims.md -> episodic/2026/05/chart-gap.md -> procedural/benchmark-harness.md</text>
          </g>
          <rect x="352" y="612" width="396" height="48" rx="8" fill="#171a1f"/><text x="382" y="643" class="path">consolidate, link, verify INDEX.md</text>
        </svg>
        """
    )


def storyboard_md() -> str:
    return clean(
        """
        # Davai Operational Walkthrough Storyboards

        These scripts are written for short implementation videos. They currently assume a
        `mem` CLI. Rename the commands to the real tooling, or implement the CLI, before
        recording.

        ## Video 1: Routing Mixed Intake

        Goal: show that a single messy note should split into multiple memory records.

        1. Open `working/inbox.md`.
        2. Paste a mixed launch-review note with a blocker, dated observation, durable rule,
           source pointer, and process change.
        3. Run:

        ```sh
        mem route working/inbox.md --explain
        ```

        4. Show proposed records:
           - `working/deploy-workflow.md`
           - `episodic/YYYY/MM/launch-review.md`
           - `semantic/performance-claims.md`
           - `procedural/janitor-link-check.md`
           - `reference/notion-davai-memory-layers.md`
        5. Accept the split and open the generated INDEX.md diff.

        Closing line: "The router does not pick the least-wrong folder. It splits by
        retrieval question."

        ## Video 2: Janitor Drift Audit

        Goal: show how the Janitor finds contradiction and preserves evidence.

        1. Start with a stale semantic claim about benchmark charts.
        2. Run:

        ```sh
        mem janitor --drift --since 2026-05-01
        ```

        3. Show the Janitor locating an episodic correction that says the chart data is
           synthesized.
        4. Update the semantic note to prohibit performance claims until a real harness exists.
        5. Link the semantic note to the episodic evidence and to the procedural benchmark task.
        6. Rebuild INDEX.md and run the link checker.

        Closing line: "Episodic is the evidence layer. The current fact changes, but the
        correction trail stays visible."
        """
    )


def diagrams() -> dict[str, str]:
    return {
        "01_retrieval_latency.svg": svg_01(),
        "02_first_try_accuracy.svg": svg_02(),
        "03_router_f1_by_class.svg": svg_03(),
        "04_folder_tree.svg": svg_04(),
        "05_routing_decision_tree.svg": svg_05(),
        "06_intake_decomposition.svg": svg_06(),
        "07_drift_audit.svg": svg_07(),
        "08_storyboard_scripts.md": storyboard_md(),
    }


def sitemap() -> str:
    pages = ["index.html"] + [layer["path"] for layer in LAYERS] + [
        "routing.html",
        "lifecycle.html",
        "index-md.html",
        "sync.html",
        "voice.html",
        "implementation.html",
    ]
    entries = []
    for path in pages:
        loc = SITE_URL + ("/" if path == "index.html" else f"/{path}")
        entries.append(
            clean(
                f"""
                <url>
                  <loc>{loc}</loc>
                  <lastmod>{BUILD_DATE}</lastmod>
                </url>
                """
            )
        )
    return clean(
        f"""
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        {''.join(entries)}
        </urlset>
        """
    )


def robots_txt() -> str:
    return clean(
        f"""
        User-agent: *
        Allow: /

        Sitemap: {SITE_URL}/sitemap.xml
        """
    )


def favicon_svg() -> str:
    return clean(
        """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Davai">
          <rect width="64" height="64" rx="10" fill="#171a1f"/>
          <path d="M18 13h15c9.4 0 16 6.7 16 19s-6.6 19-16 19H18V13Zm10 9v20h5c4.1 0 7-3.8 7-10s-2.9-10-7-10h-5Z" fill="#f7f8f5"/>
          <path d="M12 51h40v5H12z" fill="#08766d"/>
        </svg>
        """
    )


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content + "\n", encoding="utf-8")


def render_pages() -> dict[str, str]:
    return {
        "index.html": home_page(),
        "layers/identity.html": identity_page(),
        "layers/semantic.html": semantic_page(),
        "layers/episodic.html": episodic_page(),
        "layers/procedural.html": procedural_page(),
        "layers/reference.html": reference_page(),
        "layers/working.html": working_page(),
        "layers/decisions.html": decisions_page(),
        "routing.html": routing_page(),
        "lifecycle.html": lifecycle_page(),
        "index-md.html": index_md_page(),
        "sync.html": sync_page(),
        "voice.html": voice_page(),
        "implementation.html": implementation_page(),
    }


def build_zip() -> None:
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(OUT_DIR.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(OUT_DIR))


def main() -> None:
    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    for rel_path, content in render_pages().items():
        write(OUT_DIR / rel_path, content)
    write(ASSET_DIR / "styles.css", styles_css())
    for filename, content in diagrams().items():
        write(IMG_DIR / filename, content)
    write(OUT_DIR / "favicon.svg", favicon_svg())
    write(OUT_DIR / "sitemap.xml", sitemap())
    write(OUT_DIR / "robots.txt", robots_txt())
    build_zip()

    page_count = len(render_pages())
    asset_count = len(diagrams())
    print(f"Generated {OUT_DIR}/ with {page_count} pages and {asset_count} assets.")
    print(f"Wrote {ZIP_PATH}.")


if __name__ == "__main__":
    main()
