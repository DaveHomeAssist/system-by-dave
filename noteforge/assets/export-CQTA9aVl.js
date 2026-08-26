import{e as d}from"./index-C9X9iXpA.js";function n(o){return String(o||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"note"}function i(o,e){const t=d(o||"Untitled");return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 720px; margin: 2rem auto; padding: 0 1.25rem;
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1d24; background: #fff; }
  h1, h2, h3, h4 { line-height: 1.25; }
  a { color: #3b6ef6; }
  code { background: #f0f1f4; padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f0f1f4; padding: 12px 14px; border-radius: 8px; overflow: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 0; padding: 0.2em 1em; border-left: 3px solid #d0d3da; opacity: 0.9; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d0d3da; padding: 6px 10px; }
  img { max-width: 100%; height: auto; }
  hr { border: none; border-top: 1px solid #d0d3da; }
  .wikilink { color: inherit; text-decoration: underline dotted; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #d0d3da; font-size: 0.85em; opacity: 0.6; }
  @media (prefers-color-scheme: dark) {
    body { color: #e6e8ee; background: #16181d; }
    a { color: #7aa2ff; }
    code, pre { background: #22262e; }
    blockquote, th, td, hr, footer { border-color: #3a3f4b; }
  }
</style>
</head>
<body>
<article>
<h1>${t}</h1>
${e}
</article>
<footer>Exported from NoteForge</footer>
</body>
</html>
`}function l(o){const e=document.createElement("template");return e.innerHTML=o,e.content.querySelectorAll("a[data-wikilink]").forEach(t=>{const r=document.createElement("span");r.className="wikilink",r.textContent=t.textContent||"",t.replaceWith(r)}),e.innerHTML}export{i as buildNoteHtmlDoc,l as flattenExportWikilinks,n as noteFileStem};
