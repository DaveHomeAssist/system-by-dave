# Public content contract

Public System by Dave copy uses canonical names, title families, and registry-backed counts so navigation labels, social cards, and product claims do not drift independently.

## Canonical product names

- **System by Dave** — portfolio and public operating-system brand.
- **AV by Dave** — flagship AV operations console. `AV Suite` remains the stable route and global-navigation label.
- **Prompt Lab** — public prose and navigation spelling. `PromptLab` is reserved for a deliberate external identifier, code symbol, asset filename, or historical prompt content.
- **Davai — System by Dave Memory Architecture** — full display name on the Tools directory and Davai overview metadata. Davai subpage titles may use the compact `Page | Davai` suffix after the overview establishes the relationship.
- **CueForge**, **PlotForge**, **PixelForge**, **NoteForge**, and **Ballpark Scorecard** retain their product spellings.

## Title families

- Marketing and directory pages normally use `Page — System by Dave`.
- AV operator tools normally use `Tool | System by Dave`.
- Product flagships may lead with the product name and a descriptive phrase when the same text is carried through title, Open Graph, and Twitter metadata.
- Personal Profile and Resume pages may lead with the person's name or audience because the audience is more useful than the portfolio brand.
- Davai subpages use `Page | Davai`; the Davai overview uses the full canonical display name.

The title character is part of the family: marketing uses an em dash, operator tools use a vertical bar, and a plain hyphen is reserved for content where punctuation is data rather than branding.

## Canonical AV count

`js/sbd-registry.js` is the source of truth. The homepage, Tools directory, AV console, and README carry a checked static fallback. A registry change must update those values in the same release.

## Release gate

`npm run verify:public-consistency` checks sitemap metadata, Prompt Lab claims and labels, agent destinations, required external links, AV counts, Davai naming, privacy statements, the public shell contract, and skip-link coverage. Exceptions must be explicit in that verifier and documented here.
