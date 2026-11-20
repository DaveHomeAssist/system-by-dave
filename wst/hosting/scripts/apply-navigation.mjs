import {readFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {header,openingCard,adaptWorkspaceScript} from '../navigation/model.mjs';

export function adaptPage(route, html) {
  const root=route==='/'||route==='/index.html';
  const current=root?'home':route==='/handoff.html'?'handoff':route.startsWith('/run-review')?'review':route.startsWith('/stage')?'stage':'scenic';
  const common=header({root,current}).replace('data-wst-header','data-wst-header data-current="'+current+'"');
  if(html.includes('data-wst-header'))html=html.replace(/<header\b[^>]*data-wst-header[\s\S]*?<\/header>/,common);
  else if(root||current==='handoff')html=html.replace(/<header\b[\s\S]*?<\/header>/,common);
  else if(current==='review')html=html.replace(/<header class="top">/,common+'\n<header class="top">');
  else html=html.replace(/<body\b[^>]*>/,match=>match+common);
  html=html.replace(/<body\b([^>]*)>/,(_,attrs)=>{
    const classes='wst-page wst-page-'+(root?'root':current==='review'?'review':current);
    return '<body'+(/\bclass="/.test(attrs)?attrs.replace(/class="([^"]*)"/,(_,old)=>'class="'+[...new Set((old+' '+classes).split(/\s+/))].join(' ')+'"'):attrs+' class="'+classes+'"')+'>';
  });
  if(root){
    html=html.replace(/<div class="workspace-navigation">[\s\S]*?<\/nav><\/div>/,'');
    html=html.replace(/<nav class="show-pages"[\s\S]*?<\/nav>/,'');
    html=html.replace(/<nav class="planning-views"[\s\S]*?<\/nav>/,'');
    html=html.replace(/<button type="button" data-route="rig" data-open-controls data-controller-only hidden>[\s\S]*?<\/button>/,'');
    if(!html.includes('data-opening-at'))html=html.replace(/(<a class="home-choice" href="\/run-review\/">[\s\S]*?<\/a>)/,'$1\n'+openingCard());
    if(!html.includes('snow-title-rule'))html=html.replace('<span class="snow-mark"','<span class="snow-title-rule" aria-hidden="true"></span><span class="snow-mark"');
  }
  if(current==='review'){
    html=html.replace(/<h1><a id="workspace-link"[\s\S]*?<\/h1>/,'<h1>Run review</h1>');
    html=html.replace(/\s*<button type="button" id="theme-btn"[^>]*><\/button>/,'');
    html=html.replace(/    const btn = \$\('#theme-btn'\);[\s\S]*?    drawStrip\(\);/, '    drawStrip();');
    html=html.replace(/    \$\('#theme-btn'\)\.addEventListener\([^\n]*\n/,'');
  }
  if(current==='stage')html=html.replace('<a href="/" target="_top">Frozen Home</a> · ','');
  if(current==='scenic')html=html.replace(/<a class="scenic-link" href="\/">Back to Frozen<\/a>/,'');
  const add=[];
  if(!html.includes('href="/workspace-navigation.css"'))add.push('<link rel="stylesheet" href="/workspace-navigation.css">');
  if(!html.includes('src="/frozen-theme.js"')&&!html.includes('src="frozen-theme.js"')){const sharedTheme='<link rel="stylesheet" href="/frozen-theme.css"><script src="/frozen-theme.js"></script>';html=html.includes('Content-Security-Policy')?html.replace(/(<meta[^>]*Content-Security-Policy[^>]*>)/,'$1'+sharedTheme):html.replace('<head>','<head>'+sharedTheme);}
  if(!html.includes('src="/vendor/gsap.min.js"')&&!html.includes('src="vendor/gsap.min.js"'))add.push('<script defer src="/vendor/gsap.min.js"></script>');
  if(!html.includes('src="/workspace-navigation.js"'))add.push('<script defer src="/workspace-navigation.js"></script>');
  if(root&&!html.includes('src="/opening-night.js"'))add.push('<script defer src="/opening-night.js"></script>');
  html=html.replace('</head>',add.join('\n')+'\n</head>');
  // Review's inline bootstrap and application stay hash protected after the scoped theme edit.
  if(/script-src /.test(html)){
    const hashes=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(match=>"'sha256-"+createHash('sha256').update(match[1]).digest('base64')+"'");
    html=html.replace(/script-src [^;"<>]+/,"script-src 'self' "+hashes.join(' '));
  }
  return html;
}

export async function applyNavigation() {
  const workerFile=new URL('../dist/server/index.js',import.meta.url);
  const {default:worker}=await import(workerFile.href+'?navigation='+Date.now());
  const updates={};
  for(const route of ['/','/index.html','/handoff.html','/run-review/','/stage/index.html','/scenic/']){
    const response=await worker.fetch(new Request('https://wst.housevideo.app'+route),{});
    if(response.status!==200)continue;
    const html=await response.text();
    if(!/^<!doctype html>/i.test(html))continue;
    updates[route]=adaptPage(route,html);
  }
  const response=await worker.fetch(new Request('https://wst.housevideo.app/workspace.js'),{});
  updates['/workspace.js']=adaptWorkspaceScript(await response.text());
  for(const [route,name] of [['/workspace-navigation.css','navigation.css'],['/workspace-navigation.js','client.js'],['/opening-night.js','opening-night.js']])updates[route]=await readFile(new URL('../navigation/'+name,import.meta.url),'utf8');
  for(const name of ['snow-splash.js','snow-splash.css']){
    try{updates['/'+name]=await readFile(new URL('../'+name,import.meta.url),'utf8');}
    catch{updates['/'+name]=await readFile(new URL('../../'+name,import.meta.url),'utf8');}
  }
  await appendFile(workerFile,'\n/* Canonical Frozen navigation and opening night. */\n'+Object.entries(updates).map(([route,value])=>'ASSETS['+JSON.stringify(route)+']='+JSON.stringify(value)+';').join('\n')+'\n');
  console.log('Embedded canonical navigation on '+Object.keys(updates).filter(x=>updates[x].startsWith('<!doctype html>')).length+' HTML routes.');
}

if(process.argv[1] && new URL('file://'+process.argv[1]).href===import.meta.url)await applyNavigation();
