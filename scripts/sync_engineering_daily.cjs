'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const input=process.argv[2];
if(!input)throw Error('Pass the canonical archive HTML path');
const source=fs.readFileSync(input,'utf8'),match=source.match(/<script id="archive-data" type="application\/json">([\s\S]*?)<\/script>/);
if(!match)throw Error('Archive data missing');
const records=JSON.parse(match[1]),root=path.resolve(__dirname,'../demos/engineering-daily');
if(!records.length||new Set(records.map(r=>r.id)).size!==records.length)throw Error('Invalid edition IDs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const metadata=`<meta name="description" content="A practical video engineering lesson archive with a calendar, sourced diagrams, story cards and interactive signal models.">
<meta name="theme-color" content="#eeeeee">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'">
<link rel="canonical" href="https://systembydave.com/demos/engineering-daily/">
<meta property="og:site_name" content="System by Dave">
<meta property="og:type" content="website">
<meta property="og:title" content="Video Engineering Daily">
<meta property="og:description" content="Practical lessons, sourced diagrams and interactive signal models.">
<meta property="og:url" content="https://systembydave.com/demos/engineering-daily/">
<meta property="og:image" content="https://systembydave.com/demos/og/hub.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Video Engineering Daily">
<meta name="twitter:description" content="Practical lessons, sourced diagrams and interactive signal models.">
<meta name="twitter:image" content="https://systembydave.com/demos/og/hub.png">`;
let html=source.replace('<title>Video Engineering / Reference</title>','<title>Video Engineering Daily | System by Dave</title>\n'+metadata);
html=html.replace('<body>','<body>\n<a class="dailySkip" href="#daily-main">Skip to Video Engineering</a>\n<noscript>Video Engineering Daily requires JavaScript for its calendar and models. <a href="/demos/">Return to AV demos</a>.</noscript>');
html=html.replace('<main class="workbench">','<main class="workbench" id="daily-main" tabindex="-1">');
html=html.replace('<div class="appIcon" aria-hidden="true">V/</div>','<a class="appIcon" href="/" aria-label="System by Dave home">⌂</a>');
html=html.replace('<h1>Video Engineering</h1>','<h1><a href="/demos/" aria-label="AV demos, parent of Video Engineering Daily">Video Engineering</a></h1>');
html=html.replace('</style>',`.dailySkip {position:fixed;top:-100px;left:8px;z-index:100;background:var(--surface);padding:12px;color:var(--ink)}
.dailySkip:focus {top:8px}
.appIdentity h1 a {color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
.appHeader .appIcon {display:grid;flex-shrink:0;width:44px;height:44px;text-decoration:none}
@media(max-height:330px) {.appHeader .appIdentity {display:block}.appHeader {grid-column:1/-1;justify-content:space-between}.appIdentity h1 {font-size:12px}.appHeader .appIcon {width:44px;height:44px}.toolbar {display:none}}
noscript {position:fixed;inset:0;z-index:200;background:var(--surface);color:var(--ink);padding:24px}
</style>`);
html=html.split('\n').map(line=>line.replace(/[ \t]+$/,'').replace(/^ +(?=\t)/,'')).join('\n');
if(html.includes('/'+'Users/'))throw Error('Private local path in export');
fs.mkdirSync(path.join(root,'Story Cards'),{recursive:true});
const files=[];
for(const record of records){
 if(!record.illustration?.body||!record.illustration?.caption)throw Error('Missing diagram '+record.id);
 for(const ext of ['svg','png']){
  const name='Edition '+String(record.id).padStart(3,'0')+'.'+ext;
  const bytes=fs.readFileSync(path.join(path.dirname(input),'Story Cards',name));
  if(ext==='png'&&(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==1080||bytes.readUInt32BE(20)!==1920))throw Error('Invalid PNG '+name);
  fs.writeFileSync(path.join(root,'Story Cards',name),bytes);files.push({name,id:record.id,date:record.date,title:record.title,sha256:sha(bytes)});
 }
}
fs.writeFileSync(path.join(root,'index.html'),html);
fs.writeFileSync(path.join(root,'release.json'),JSON.stringify({schema:1,sourceSha256:sha(source),publicSha256:sha(html),editions:records.length,files},null,2)+'\n');
console.log(JSON.stringify({editions:records.length,files:files.length,publicSha256:sha(html)}));
