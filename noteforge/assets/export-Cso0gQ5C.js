import{r as e}from"./helpers-By97PZgD.js";function t(e){return String(e||``).trim().toLowerCase().replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``)||`note`}function n(t,n){let r=e(t||`Untitled`);return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${r}</title>
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
<h1>${r}</h1>
${n}
</article>
<footer>Exported from NoteForge</footer>
</body>
</html>
`}function r(e){let t=document.createElement(`template`);return t.innerHTML=e,t.content.querySelectorAll(`a[data-wikilink]`).forEach(e=>{let t=document.createElement(`span`);t.className=`wikilink`,t.textContent=e.textContent||``,e.replaceWith(t)}),t.innerHTML}export{n as buildNoteHtmlDoc,r as flattenExportWikilinks,t as noteFileStem};