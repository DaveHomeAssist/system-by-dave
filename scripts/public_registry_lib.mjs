import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const PREFIX = 'window.SBD_PROJECT_REGISTRY = ';
export const START = '<!-- registry:generated:start -->';
export const END = '<!-- registry:generated:end -->';
const namePattern = /^[A-Za-z0-9_.-]+$/;
const safeInt = value => Number.isSafeInteger(value) && value >= 0;
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const text = value => typeof value === 'string' && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
export function validateAllowlist(config) {
  assert.equal(config.version, 1); assert.ok(namePattern.test(config.owner));
  assert.ok(Array.isArray(config.repositories) && config.repositories.length > 0);
  const seen = new Set();
  for (const entry of config.repositories) {
    assert.ok(namePattern.test(entry.name)); assert.ok(text(entry.category) && entry.category);
    assert.ok(!seen.has(entry.name.toLowerCase()), 'Duplicate allowlist name'); seen.add(entry.name.toLowerCase());
    assert.deepEqual(Object.keys(entry).sort(), ['category', 'name']);
  }
  return config;
}
export function queryFor(config, entries, since, until) {
  return `query { ${entries.map((entry, i) => `r${i}:repository(owner:${JSON.stringify(config.owner)},name:${JSON.stringify(entry.name)}) {
    nameWithOwner url visibility isPrivate isArchived isEmpty description pushedAt diskUsage
    languages(first:100,orderBy:{field:SIZE,direction:DESC}){nodes{name} pageInfo{hasNextPage}}
    defaultBranchRef{name target{... on Commit{oid history(since:${JSON.stringify(since)},until:${JSON.stringify(until)}){totalCount}}}}
  }`).join('\n')} }`;
}
export function normalizeRepository(repo, entry, owner) {
  assert.ok(repo && repo.visibility === 'PUBLIC' && repo.isPrivate === false, 'Repository is missing or not public');
  const parts = repo.nameWithOwner?.split('/');
  assert.ok(parts?.length === 2 && parts[0].toLowerCase() === owner.toLowerCase() && namePattern.test(parts[1]), 'Unexpected repository identity');
  assert.equal(repo.url, `https://github.com/${repo.nameWithOwner}`);
  assert.equal(typeof repo.isArchived, 'boolean'); assert.equal(typeof repo.isEmpty, 'boolean');
  assert.ok(repo.description === null || text(repo.description));
  assert.ok(repo.pushedAt === null || date(repo.pushedAt)); assert.ok(safeInt(repo.diskUsage));
  assert.equal(repo.languages?.pageInfo?.hasNextPage, false, 'Incomplete language result');
  assert.ok(Array.isArray(repo.languages.nodes)); assert.ok(repo.languages.nodes.every(n => text(n.name) && n.name));
  const branch = repo.defaultBranchRef;
  if (!repo.isEmpty) { assert.ok(branch && text(branch.name) && branch.name); assert.match(branch.target?.oid || '', /^[a-f0-9]{40}$/); assert.ok(safeInt(branch.target.history?.totalCount)); }
  else assert.equal(branch, null, 'Inconsistent empty repository');
  return { name: parts[1], fullName: repo.nameWithOwner, requestedName: entry.name, category: entry.category,
    purpose: repo.description || 'No public description provided.', stack: repo.languages.nodes.map(n => n.name),
    defaultBranch: branch?.name || null, defaultHead: branch?.target.oid || null,
    lastRemoteUpdate: repo.pushedAt, recentCommits90d: branch?.target.history.totalCount || 0,
    sizeKB: repo.diskUsage, archived: repo.isArchived, status: repo.isArchived ? 'archived' : 'active', github: repo.url };
}
export function snapshot(config, projects, generatedAt) {
  const result = { registry: { version: 2, generatedAt, source: 'GitHub public repository metadata', owner: config.owner,
    activitySince: new Date(Date.parse(generatedAt) - 90 * 86400000).toISOString(),
    counts: { total: projects.length, active: projects.filter(p => !p.archived).length, archived: projects.filter(p => p.archived).length } },
    projects: projects.slice().sort((a,b) => a.fullName.localeCompare(b.fullName, 'en')) };
  validateSnapshot(result, config, Date.parse(generatedAt)); return result;
}
const projectKeys = ['name','fullName','requestedName','category','purpose','stack','defaultBranch','defaultHead','lastRemoteUpdate','recentCommits90d','sizeKB','archived','status','github'].sort();
export function validateSnapshot(data, config, now = Date.now()) {
  validateAllowlist(config);
  assert.deepEqual(Object.keys(data).sort(), ['projects','registry']);
  const r = data.registry;
  assert.deepEqual(Object.keys(r).sort(), ['activitySince','counts','generatedAt','owner','source','version']);
  assert.equal(r.version,2); assert.equal(r.owner,config.owner); assert.equal(r.source,'GitHub public repository metadata');
  assert.ok(date(r.generatedAt)); const age = now - Date.parse(r.generatedAt);
  assert.ok(age >= -300000 && age <= 30 * 86400000, 'Snapshot is stale or future dated');
  assert.equal(Date.parse(r.activitySince),Date.parse(r.generatedAt)-90*86400000);
  assert.ok(Array.isArray(data.projects)); assert.equal(data.projects.length,config.repositories.length);
  const requested = new Set(), canonical = new Set();
  for (const p of data.projects) {
    assert.deepEqual(Object.keys(p).sort(),projectKeys,'Unexpected public fields');
    const entry = config.repositories.find(e => e.name === p.requestedName); assert.ok(entry,'Not allowlisted');
    assert.equal(p.category,entry.category); assert.ok(!requested.has(p.requestedName)); requested.add(p.requestedName);
    assert.ok(namePattern.test(p.name)); assert.equal(p.fullName.toLowerCase(),`${config.owner}/${p.name}`.toLowerCase());
    assert.ok(!canonical.has(p.fullName.toLowerCase()),'Duplicate canonical repository'); canonical.add(p.fullName.toLowerCase());
    assert.equal(p.github,`https://github.com/${p.fullName}`); assert.ok(text(p.purpose));
    assert.ok(Array.isArray(p.stack) && p.stack.every(s => text(s) && s));
    assert.equal(typeof p.archived,'boolean'); assert.equal(p.status,p.archived?'archived':'active');
    assert.ok(p.lastRemoteUpdate === null || date(p.lastRemoteUpdate));
    assert.ok(safeInt(p.recentCommits90d) && safeInt(p.sizeKB));
    if(p.defaultBranch===null){ assert.equal(p.defaultHead,null); assert.equal(p.recentCommits90d,0); }
    else { assert.ok(text(p.defaultBranch)&&p.defaultBranch); assert.match(p.defaultHead,/^[a-f0-9]{40}$/); }
  }
  assert.deepEqual(r.counts,{total:data.projects.length,active:data.projects.filter(p=>!p.archived).length,archived:data.projects.filter(p=>p.archived).length});
  return data;
}
export function serialize(data) { return PREFIX + JSON.stringify(data,null,2).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026') + ';\n'; }
export function parse(source) { assert.ok(source.startsWith(PREFIX) && source.trimEnd().endsWith(';')); return JSON.parse(source.slice(PREFIX.length).trimEnd().slice(0,-1)); }
export function escape(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function renderRows(projects) {
  return projects.map(p=>`<tr><td><a href="${escape(p.github)}" target="_blank" rel="noopener noreferrer">${escape(p.name)}</a><small>${escape(p.defaultBranch || 'No default branch')}</small></td><td>${escape(p.category)}</td><td>${escape(p.purpose)}</td><td>${escape(p.stack.join(', ') || 'No languages reported')}</td><td>${p.archived?'Archived':'Unarchived'}</td><td>${escape(p.lastRemoteUpdate?.slice(0,10)||'Unknown push date')}<small>${p.recentCommits90d} commits / 90d</small></td></tr>`).join('\n');
}
export function renderGenerated(data) {
  return `<p id="registry-generated">Snapshot <time datetime="${escape(data.registry.generatedAt)}">${escape(data.registry.generatedAt.slice(0,10))}</time></p>\n<div class="directory" data-web2-scroll tabindex="0" role="region" aria-label="Public repository directory"><table><caption id="registry-count">${data.projects.length} public repositories</caption><thead><tr><th>Repository</th><th>Category</th><th>Description</th><th>Languages</th><th>Status</th><th>Activity</th></tr></thead><tbody id="registry-rows">${renderRows(data.projects)}</tbody></table></div>`;
}
export function renderHtml(html,data) {
  const start=html.indexOf(START),end=html.indexOf(END);
  assert.ok(start>=0 && end>start && html.indexOf(START,start+1)<0 && html.indexOf(END,end+1)<0,'Generated markers invalid');
  return html.slice(0,start+START.length)+'\n'+renderGenerated(data)+'\n'+html.slice(end);
}
// Stage all bytes first; preserve originals and keep backups if rollback itself fails.
export function replaceArtifacts(files, {rename=renameSync}={}) {
  const id=randomUUID();const staged=[];const installed=[];
  try {
    for(const [path,content] of files){const old=readFileSync(path);const temp=path+'.'+id+'.tmp';const backup=path+'.'+id+'.bak';writeFileSync(backup,old,{flag:'wx'});staged.push({path,temp,backup});writeFileSync(temp,content,{flag:'wx'});}
    for(const item of staged){rename(item.temp,item.path);installed.push(item);}
  } catch(error) {
    let rollbackFailed=false;
    for(const item of installed.reverse()){try{rename(item.backup,item.path);}catch{rollbackFailed=true;}}
    if(rollbackFailed) throw new Error('Artifact promotion and rollback failed; retain .bak files for recovery',{cause:error});
    for(const item of staged){if(existsSync(item.temp))unlinkSync(item.temp);if(existsSync(item.backup))unlinkSync(item.backup);}
    throw error;
  }
  for(const item of staged)unlinkSync(item.backup);
}
export async function collect(config,generatedAt,request) {
  validateAllowlist(config); const since=new Date(Date.parse(generatedAt)-90*86400000).toISOString();const projects=[];
  for(let offset=0;offset<config.repositories.length;offset+=5){
    const entries=config.repositories.slice(offset,offset+5);const result=await request(queryFor(config,entries,since,generatedAt));
    assert.ok(!result.errors && result.data,'Incomplete GitHub query');
    entries.forEach((entry,i)=>projects.push(normalizeRepository(result.data['r'+i],entry,config.owner)));
  }
  return snapshot(config,projects,generatedAt);
}
