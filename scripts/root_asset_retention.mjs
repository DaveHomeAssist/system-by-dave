#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Published build inputs only. Mutable pages, workers and configuration are excluded.
export const ASSET_ROOTS = ['noteforge/assets', 'pixelforge/assets', 'world-cup/assets', 'camera-sim/assets', 'cheesesteaks/_next/static'];
const EXTENSIONS = new Set(['.js','.mjs','.css','.woff','.woff2','.ttf','.otf','.svg','.png','.jpg','.jpeg','.webp','.gif','.ico','.json','.wasm']);
const SHA = /^[a-f0-9]{40}$/;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (repo, args, options = {}) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 32 * 1024 * 1024, ...options });

export async function previousDeployment(get, repository) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository)) throw new Error('Invalid repository');
  for (let page = 1; page <= 5; page++) {
    const deployments = await get(`/repos/${repository}/deployments?environment=github-pages&per_page=20&page=${page}`);
    if (!Array.isArray(deployments)) throw new Error('Invalid deployment list');
    for (const item of deployments) {
      if (item.environment !== 'github-pages' || item.ref !== 'main') continue;
      if (!Number.isSafeInteger(item.id) || !SHA.test(item.sha)) throw new Error('Invalid deployment identity');
      const statuses = await get(`/repos/${repository}/deployments/${item.id}/statuses?per_page=100`);
      if (!Array.isArray(statuses)) throw new Error('Invalid deployment statuses');
      // An inactive deployment is usable only with an explicit retained success receipt.
      if (statuses[0]?.state === 'success' || (statuses[0]?.state === 'inactive' && statuses.some(s => s.state === 'success'))) {
        return { id: item.id, sha: item.sha };
      }
    }
    if (deployments.length < 20) return null;
  }
  throw new Error('No proven previous deployment within 100 records; inspect release history');
}

// Read only. Do not print provider bodies or authorization headers on failure.
export function githubReader(token) {
  return async route => {
    if (!route.startsWith('/repos/')) throw new Error('Invalid API route');
    const response = await fetch('https://api.github.com' + route, {
      headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      redirect: 'error', signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`Deployment metadata request failed: HTTP ${response.status}`);
    return response.json();
  };
}

function safeSegments(value) {
  return value.split('/').every(part => /^[A-Za-z0-9_@()[\].-]+$/.test(part) && part !== '.' && part !== '..' && !part.startsWith('.'));
}
function safePath(root, relative) {
  if (!safeSegments(relative) || path.isAbsolute(relative)) throw new Error(`Unsafe asset path: ${relative}`);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    try {
      if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlink in staged asset path: ${relative}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return current;
}

export function retainAssets({ repo = ROOT, stage, previousSha, currentSha, maxFiles = 10000, maxBytes = 128 * 1024 * 1024 }) {
  if (!SHA.test(previousSha) || !SHA.test(currentSha)) throw new Error('Expected exact source commit SHAs');
  const stageRoot = path.resolve(stage);
  if (!existsSync(stageRoot) || lstatSync(stageRoot).isSymbolicLink() || !lstatSync(stageRoot).isDirectory()) throw new Error('Stage must be an existing real directory');
  if (realpathSync(stageRoot) !== stageRoot) throw new Error('Stage path must not traverse symlinks');
  git(repo, ['cat-file', '-e', `${previousSha}^{commit}`]);
  git(repo, ['cat-file', '-e', `${currentSha}^{commit}`]);
  git(repo, ['merge-base', '--is-ancestor', previousSha, currentSha]);
  const tree = git(repo, ['ls-tree', '-r', '-l', '-z', previousSha, '--', ...ASSET_ROOTS], { encoding: 'utf8' });
  const pending = [];
  let bytes = 0, present = 0, skipped = 0;
  // Validate the entire plan before copying a byte. Failure cannot publish a partial plan.
  for (const record of tree.split('\0').filter(Boolean)) {
    const match = /^(\d+) (\w+) ([a-f0-9]{40})\s+(\d+|-)\t(.+)$/.exec(record);
    if (!match) throw new Error('Invalid Git asset tree entry');
    const [,mode,type,oid,sizeText,relative] = match;
    const prefix = ASSET_ROOTS.find(p => relative.startsWith(p + '/'));
    if (!prefix || !safeSegments(relative)) throw new Error('Asset outside allowlist');
    if (mode !== '100644' && mode !== '100755' || type !== 'blob') throw new Error(`Unsupported asset mode: ${relative}`);
    if (!EXTENSIONS.has(path.extname(relative).toLowerCase())) throw new Error(`Unsupported asset extension: ${relative}`);
    const app = prefix.split('/')[0];
    const entry = safePath(stageRoot, `${app}/index.html`);
    const assetRoot = safePath(stageRoot, prefix);
    if (!existsSync(entry) || !existsSync(assetRoot)) { skipped++; continue; }
    if (!lstatSync(entry).isFile() || !lstatSync(assetRoot).isDirectory()) throw new Error('Invalid staged application');
    const target = safePath(stageRoot, relative);
    if (existsSync(target)) {
      if (!lstatSync(target).isFile()) throw new Error(`Invalid staged asset: ${relative}`);
      present++; continue;
    }
    const size = Number(sizeText);
    if (!Number.isSafeInteger(size) || size < 0 || size > 32 * 1024 * 1024) throw new Error(`Invalid asset size: ${relative}`);
    bytes += size;
    pending.push({ relative, target, oid, size });
    if (pending.length > maxFiles || bytes > maxBytes) throw new Error('Previous assets exceed retention limits');
  }
  for (const file of pending) {
    const content = git(repo, ['cat-file', 'blob', file.oid]);
    if (content.length !== file.size) throw new Error(`Asset size mismatch: ${file.relative}`);
    mkdirSync(path.dirname(file.target), { recursive: true });
    writeFileSync(file.target, content, { flag: 'wx', mode: 0o644 });
  }
  return { previousSha, currentSha, copied: pending.map(f => f.relative), bytes, present, skipped };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const args = process.argv.slice(2);
    if (args[0] !== '--stage' || !args[1] || args.length !== 2) throw new Error('usage: root_asset_retention.mjs --stage <directory>');
    const previous = await previousDeployment(githubReader(process.env.GITHUB_TOKEN), process.env.GITHUB_REPOSITORY || 'DaveHomeAssist/system-by-dave');
    const currentSha = git(ROOT, ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const result = previous ? retainAssets({ stage: args[1], previousSha: previous.sha, currentSha }) : { copied: [], reason: 'No proven earlier deployment in complete history' };
    console.log(JSON.stringify({ deployment: previous, ...result }));
  } catch (error) { console.error(`Root asset retention failed: ${error.message}`); process.exitCode = 1; }
}
