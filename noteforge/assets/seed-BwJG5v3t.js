const e=[{title:"Welcome",tags:["meta","start-here"],banner:{type:"gradient",value:"linear-gradient(120deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)",position:50},content:`# Welcome to NoteForge 👋

This is a local-first, markdown notes app inspired by Obsidian & Notion.

## Try these
- Write **markdown** — *italics*, \`code\`, lists, and:
  - [ ] task checkboxes
  - [x] that persist as text
- Link notes with double brackets: [[Markdown Cheatsheet]]
- Add #tags in the editor (see the chips above the text)
- Open the 🕸️ graph to see how notes connect

> Everything is saved to your browser automatically (IndexedDB) — no account, no server.

Type \`/\` anywhere for the block menu — try a **Divider** or a **Date**:

---

@date(2026-07-01)

See also: [[Wikilinks & Backlinks]] and [[Project Ideas]].`},{title:"Markdown Cheatsheet",tags:["reference"],content:"# Markdown Cheatsheet\n\n| Syntax | Result |\n| --- | --- |\n| `**bold**` | **bold** |\n| `*italic*` | *italic* |\n| `[link](url)` | a link |\n| `> quote` | a blockquote |\n\n```js\nfunction hello(name) {\n  return `Hi, ${name}`;\n}\n```\n\nBack to [[Welcome]]."},{title:"Wikilinks & Backlinks",tags:["reference","meta"],content:`# Wikilinks & Backlinks

Type \`[[Note title]]\` to link to another note. Use \`[[Title|display text]]\`
to show different text, e.g. [[Project Ideas|my ideas]].

If a linked note doesn't exist yet, the link shows dimmed — click it to
create that note instantly.

The **Backlinks** panel under each note lists every note that links *to* it.
This note is referenced by [[Welcome]].`},{title:"Project Ideas",tags:["projects"],content:`# Project Ideas

- A habit tracker that syncs with [[Welcome|this app]]
- Weekly review template
- Reading list with ratings

Related reference: [[Markdown Cheatsheet]].`}];export{e as sampleNotes};
