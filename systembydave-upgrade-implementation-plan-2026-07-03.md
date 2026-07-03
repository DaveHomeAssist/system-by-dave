# System by Dave Upgrade Implementation Plan

Date: 2026-07-03

## Objective

Turn the live site review into shipped site improvements for the public System by Dave surface, then verify, commit, push, and confirm GitHub Pages deployment.

## Patch Plan

1. Fix mobile containment on the dark homepage and Prompt Lab landing page so hero headlines, action rows, and screenshots do not force horizontal overflow.
2. Add audience-first routing to the homepage for the four highest-intent paths: run a show, use Prompt Lab, build in Notion, and hire Dave.
3. Promote high-trust surfaces from buried sitemap entries into first-class public paths: Command Center, Project Registry, Profile, Privacy, Changelog, and Tools.
4. Clarify product calls to action on the homepage, Prompt Lab, and Notion pages so visitors can launch, install, duplicate, request setup, or inspect proof without guessing.
5. Clean the Notion agent flow by giving each agent a stable anchor, fuller detail copy, and a direct request path instead of four identical generic cards.
6. Add an operator documentation pattern to AV Suite that explains how to start, back up, hand off, and recover a show package without cluttering the launch console.
7. Improve Project Registry contrast and table readability while preserving the existing light registry design.
8. Add lightweight, analytics-free local CTA counters so key outbound/internal conversion actions can be inspected on-device without network analytics.
9. Update changelog and sitemap after material public content changes.

## Verification Plan

1. Run the repo sitemap generator.
2. Serve the static site locally and check key routes with HTTP 200 responses.
3. Use headless Chrome screenshots at desktop and mobile widths for homepage, Prompt Lab, AV Suite, and Project Registry.
4. Run a small DOM/link/meta check for the changed public routes.
5. Commit to `main`, push to origin, then verify GitHub Pages workflow/deployment and live URLs.
