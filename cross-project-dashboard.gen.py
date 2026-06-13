import os, subprocess, json, io, sys, datetime, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = r'c:/Users/digit/Desktop/github-davehomeassist'
SKIP = {'.claude', '__pycache__', '_codex_tmp', 'node_modules', '.git', 'system-by-dave'}
PRUNE = {'node_modules', '.git', 'dist', 'build', '.next', '.vite', 'vendor'}
now = datetime.datetime.now(datetime.timezone.utc)

def git(repo, args, timeout=20):
    try:
        r = subprocess.run(['git'] + args, cwd=repo, capture_output=True, text=True, timeout=timeout, encoding='utf-8', errors='replace')
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None

LANG = {'js':'JavaScript','jsx':'React','ts':'TypeScript','tsx':'React/TS','py':'Python','html':'HTML','css':'CSS',
        'md':'Markdown','json':'JSON','rs':'Rust','go':'Go','sh':'Shell','yml':'YAML','yaml':'YAML','vue':'Vue','svg':'SVG'}

def lang_of(files):
    c = collections.Counter()
    for f in files:
        ext = f.rsplit('.', 1)[-1].lower() if '.' in f else ''
        if ext in LANG: c[ext] += 1
    return LANG[c.most_common(1)[0][0]] if c else '—'

def churn_of(shortstat):
    # parse "N files changed, X insertions(+), Y deletions(-)" -> X + Y
    if not shortstat: return 0
    n = 0
    for part in shortstat.split(','):
        part = part.strip()
        if 'insertion' in part or 'deletion' in part:
            tok = part.split(' ', 1)[0]
            if tok.isdigit(): n += int(tok)
    return n

def count_files_nongit(path):
    n = 0
    for dp, dns, fns in os.walk(path):
        dns[:] = [d for d in dns if d not in PRUNE]
        n += len(fns)
        if n > 20000: return n
    return n

projects = []
for name in sorted(os.listdir(ROOT)):
    full = os.path.join(ROOT, name)
    if not os.path.isdir(full) or name in SKIP: continue
    is_git = os.path.exists(os.path.join(full, '.git'))
    p = {'name': name, 'git': is_git, 'branch': '', 'last_iso': '', 'last_msg': '', 'dirty': 0,
         'ahead': 0, 'behind': 0, 'c7': 0, 'c30': 0, 'total': 0, 'remote': '', 'files': 0, 'lang': '—',
         'stash': 0, 'churn': 0, 'uri': ''}
    if is_git:
        p['branch'] = git(full, ['rev-parse', '--abbrev-ref', 'HEAD']) or '?'
        last = git(full, ['log', '-1', '--format=%cI\x1f%s'])
        if last and '\x1f' in last:
            p['last_iso'], p['last_msg'] = last.split('\x1f', 1)
        st = git(full, ['status', '--porcelain'])
        p['dirty'] = len([l for l in st.splitlines() if l.strip()]) if st else 0
        lr = git(full, ['rev-list', '--count', '--left-right', '@{upstream}...HEAD'])
        if lr and '\t' in lr:
            b, a = lr.split('\t'); p['behind'] = int(b); p['ahead'] = int(a)
        for k, since in (('c7', '7 days ago'), ('c30', '30 days ago')):
            v = git(full, ['rev-list', '--count', '--since=' + since, 'HEAD'])
            p[k] = int(v) if v and v.isdigit() else 0
        tot = git(full, ['rev-list', '--count', 'HEAD']); p['total'] = int(tot) if tot and tot.isdigit() else 0
        rem = git(full, ['remote', 'get-url', 'origin'])
        if rem:
            m = rem.rstrip('/').replace('.git', '')
            p['remote'] = '/'.join(m.replace(':', '/').split('/')[-2:]) if '/' in m else m
        ls = git(full, ['ls-files'])
        fl = ls.splitlines() if ls else []
        p['files'] = len(fl); p['lang'] = lang_of(fl)
        sh = git(full, ['stash', 'list'])
        p['stash'] = len([l for l in sh.splitlines() if l.strip()]) if sh else 0
        if p['dirty'] > 0:
            p['churn'] = churn_of(git(full, ['diff', '--shortstat', 'HEAD']))
    else:
        try: p['last_iso'] = datetime.datetime.fromtimestamp(os.path.getmtime(full), datetime.timezone.utc).isoformat()
        except Exception: pass
        p['files'] = count_files_nongit(full)
    p['path'] = full
    p['uri'] = full.replace('\\', '/')
    projects.append(p)

def days_since(iso):
    if not iso: return None
    try:
        dt = datetime.datetime.fromisoformat(iso)
        if dt.tzinfo is None: dt = dt.replace(tzinfo=datetime.timezone.utc)
        return (now - dt).total_seconds() / 86400
    except Exception: return None
for p in projects:
    d = days_since(p['last_iso']); p['age_days'] = round(d, 2) if d is not None else None

gitn = sum(1 for p in projects if p['git'])
dirty = sum(1 for p in projects if p['dirty'] > 0)
active = sum(1 for p in projects if (p['age_days'] is not None and p['age_days'] <= 7))
c30 = sum(p['c30'] for p in projects)
unpushed = sum(1 for p in projects if p['ahead'] > 0)
stats = {'total': len(projects), 'git': gitn, 'dirty': dirty, 'active': active, 'c30': c30, 'unpushed': unpushed,
         'generated': now.astimezone().strftime('%Y-%m-%d %H:%M')}

# --- rolling snapshot history -> trend deltas + sparklines (one point per day, last 30) ---
HIST_PATH = os.path.join(ROOT, 'cross-project-dashboard.history.json')
today = now.astimezone().strftime('%Y-%m-%d')
try:
    hist = json.load(open(HIST_PATH, encoding='utf-8')) if os.path.exists(HIST_PATH) else {}
except Exception:
    hist = {}
if not isinstance(hist, dict): hist = {}
repos_hist = hist.get('repos') if isinstance(hist.get('repos'), dict) else {}
for p in projects:
    seq = repos_hist.get(p['name']) or []
    point = {'d': today, 'c7': p['c7'], 'c30': p['c30'], 'dirty': p['dirty'], 'ahead': p['ahead'], 'total': p['total']}
    if seq and seq[-1].get('d') == today:        # re-run same day -> overwrite, compare to day before
        prev = seq[-2] if len(seq) >= 2 else None
        seq[-1] = point
    else:
        prev = seq[-1] if seq else None
        seq.append(point)
    seq = seq[-30:]
    repos_hist[p['name']] = seq
    p['d_dirty'] = (p['dirty'] - prev.get('dirty', 0)) if prev else 0
    p['d_ahead'] = (p['ahead'] - prev.get('ahead', 0)) if prev else 0
    p['d_c7'] = (p['c7'] - prev.get('c7', 0)) if prev else 0
    p['hist'] = [{'dirty': x.get('dirty', 0), 'c7': x.get('c7', 0)} for x in seq]
hist['repos'] = repos_hist
hist['updated'] = stats['generated']
try:
    open(HIST_PATH, 'w', encoding='utf-8').write(json.dumps(hist, ensure_ascii=False))
except Exception:
    pass

data = json.dumps(projects, ensure_ascii=False).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')

HTML = r'''<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cross-Project Tracker — github-davehomeassist</title>
<style>
:root{--bg:#0a0b10;--surface:#13151d;--raised:#1a1d28;--border:#262a37;--text:#e8eaf2;--dim:#8b90a6;--mut:#5b6072;
--violet:#a78bfa;--teal:#2dd4bf;--green:#34d399;--amber:#fbbf24;--red:#f87171;--blue:#60a5fa;}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font:13.5px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:0 0 60px}
.bar{position:sticky;top:0;z-index:10;background:rgba(10,11,16,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--border);padding:16px 24px}
h1{font-size:17px;font-weight:750;letter-spacing:-.3px;display:flex;align-items:center;gap:10px}
h1 .logo{width:24px;height:24px;border-radius:7px;background:linear-gradient(135deg,var(--violet),var(--teal));display:inline-flex;align-items:center;justify-content:center;font-size:14px}
h1 .gen{margin-left:auto;font-size:11.5px;font-weight:400;color:var(--mut);font-family:ui-monospace,monospace}
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;max-width:1240px;margin:20px auto 0;padding:0 24px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:16px 18px}
.stat .v{font-size:30px;font-weight:750;letter-spacing:-1px;line-height:1}
.stat .l{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--dim);margin-top:7px;font-weight:600}
.stat.g .v{color:var(--teal)}.stat.d .v{color:var(--amber)}.stat.a .v{color:var(--green)}.stat.u .v{color:var(--blue)}.stat.c .v{color:var(--violet)}
.controls{display:flex;flex-wrap:wrap;gap:9px;max-width:1240px;margin:18px auto 0;padding:0 24px;align-items:center}
#q{flex:1;min-width:200px;background:var(--raised);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:9px 13px;font-size:13.5px;outline:none}
#q:focus{border-color:var(--violet)}
select{background:var(--raised);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px 10px;font-size:12.5px;outline:none}
.cnt{font-size:12px;color:var(--dim);margin-left:auto}
.wrap{max-width:1240px;margin:16px auto 0;padding:0 24px}
table{width:100%;border-collapse:collapse;font-size:12.8px}
th{text-align:left;color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;padding:8px 10px;border-bottom:1px solid var(--border);position:sticky;top:60px;background:var(--bg);cursor:pointer;white-space:nowrap}
th:hover{color:var(--text)}
td{padding:10px;border-bottom:1px solid rgba(38,42,55,.6);vertical-align:middle}
tr:hover td{background:var(--surface)}
.name{font-weight:650;display:flex;align-items:center;gap:9px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot.act{background:var(--green);box-shadow:0 0 0 3px rgba(52,211,153,.16)}
.dot.warm{background:var(--amber)}.dot.cold{background:var(--mut);opacity:.5}.dot.none{background:var(--border)}
.b{font-size:10.5px;padding:2px 7px;border-radius:999px;border:1px solid var(--border);color:var(--dim);white-space:nowrap}
.b.branch{font-family:ui-monospace,monospace;color:#c4b5fd}
.b.dirty{color:var(--amber);border-color:rgba(251,191,36,.4);background:rgba(251,191,36,.1)}
.b.clean{color:var(--green);border-color:rgba(52,211,153,.3)}
.b.ahead{color:var(--blue);border-color:rgba(96,165,250,.4)}
.b.behind{color:var(--red);border-color:rgba(248,113,113,.4)}
.msg{color:var(--dim);max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.when{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--dim);white-space:nowrap}
.actbar{height:6px;border-radius:3px;background:var(--border);overflow:hidden;width:70px;display:inline-block;vertical-align:middle}
.actbar i{display:block;height:100%;background:linear-gradient(90deg,var(--teal),var(--green))}
.num{font-family:ui-monospace,monospace;color:var(--dim)}
a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
.note{max-width:1240px;margin:14px auto 0;padding:0 24px;color:var(--mut);font-size:11.5px}
.agepill{font-family:ui-monospace,monospace;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--border);color:var(--dim);margin-left:8px}
.agepill.fresh{color:var(--green);border-color:rgba(52,211,153,.4)}
.agepill.aging{color:var(--amber);border-color:rgba(251,191,36,.4)}
.agepill.stale,.agepill.warn{color:var(--red);border-color:rgba(248,113,113,.5)}
.b.risk{color:var(--red);border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.08);font-family:ui-monospace,monospace}
.glink{font-size:10.5px;color:var(--mut);margin-left:7px}.glink:hover{color:var(--teal)}
.insights{max-width:1240px;margin:16px auto 0;padding:0 24px}
.ins-head{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:10px}
.ins-toggle{margin-left:auto;background:none;border:1px solid var(--border);color:var(--dim);border-radius:7px;padding:3px 9px;font-size:10.5px;cursor:pointer}
.ins-toggle:hover{color:var(--text)}
.insights.collapsed .ins-body{display:none}
.ins-rail{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}
.ins-card{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:12px 14px;cursor:pointer;transition:border-color .15s}
.ins-card:hover{border-color:var(--violet)}
.ins-card.muted{opacity:.5;cursor:default}
.ins-lab{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--dim)}
.ins-name{font-weight:650;font-size:13px;margin:5px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ins-val{font-family:ui-monospace,monospace;font-size:12px;color:var(--teal)}
.ins-dist{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.dist-title{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin-bottom:7px}
.dist-row{display:flex;align-items:center;gap:10px;padding:3px 0;cursor:pointer}
.dist-row:hover .dist-lab{color:var(--text)}
.dist-lab{font-size:11.5px;color:var(--dim);min-width:96px}
.dist-bar{flex:1;height:7px;border-radius:4px;background:var(--border);overflow:hidden}
.dist-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--violet),var(--teal))}
.dist-n{font-family:ui-monospace,monospace;font-size:11px;color:var(--mut);min-width:24px;text-align:right}
.chip{background:rgba(167,139,250,.16);border:1px solid var(--violet);color:var(--violet);border-radius:999px;padding:2px 10px;font-size:11px;cursor:pointer;margin-right:8px}
@media(max-width:760px){.ins-rail{grid-template-columns:repeat(2,1fr)}.ins-dist{grid-template-columns:1fr}}
.actions{max-width:1240px;margin:16px auto 0;padding:0 24px}
.act-head{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:10px}
.act-stamp{margin-left:auto;color:var(--mut);font-family:ui-monospace,monospace;font-size:10.5px;text-transform:none;letter-spacing:0}
.act-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.act-card{background:var(--surface);border:1px solid var(--border);border-radius:11px;overflow:hidden}
.act-card.done{border-color:rgba(52,211,153,.32)}.act-card.now{border-color:rgba(251,191,36,.36)}.act-card.next{border-color:rgba(96,165,250,.34)}
.act-title{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:var(--text)}
.act-title span:last-child{font-family:ui-monospace,monospace;color:var(--dim);font-size:10.5px}
.act-list{display:flex;flex-direction:column}
.act-item{padding:10px 13px;border-bottom:1px solid rgba(38,42,55,.55)}
.act-item:last-child{border-bottom:0}
.act-meta{display:flex;align-items:center;gap:7px;margin-bottom:3px;min-width:0}
.act-pill{font-size:10px;line-height:1;border:1px solid var(--border);border-radius:999px;padding:3px 6px;color:var(--dim);white-space:nowrap;font-family:ui-monospace,monospace}
.act-pill.p0{color:var(--red);border-color:rgba(248,113,113,.45);background:rgba(248,113,113,.08)}
.act-pill.p1{color:var(--amber);border-color:rgba(251,191,36,.45);background:rgba(251,191,36,.08)}
.act-pill.p2{color:var(--blue);border-color:rgba(96,165,250,.45);background:rgba(96,165,250,.08)}
.act-name{font-weight:650;font-size:12.4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.act-copy{font-size:11.5px;color:var(--dim);line-height:1.45}
.act-copy b{color:var(--text);font-weight:650}
.fixit{margin-left:7px;background:none;border:1px solid var(--border);color:var(--mut);border-radius:6px;padding:1px 6px;font-size:11px;line-height:1.4;cursor:pointer}
.fixit:hover{color:var(--teal);border-color:var(--teal)}
.fixit.done{color:var(--green);border-color:var(--green)}
@media(max-width:920px){.act-grid{grid-template-columns:1fr}.act-stamp{display:none}}
.spark{vertical-align:middle}
.dlt{font-family:ui-monospace,monospace;font-size:10px;margin-left:5px;vertical-align:middle}
.dlt.up{color:var(--amber)}.dlt.dn{color:var(--green)}
.b.risk.ackd{opacity:.4;filter:grayscale(.5)}
.glink.open{color:var(--blue)}.glink.open:hover{color:var(--teal)}
.tool{background:var(--raised);border:1px solid var(--border);color:var(--dim);border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer;white-space:nowrap}
.tool:hover{color:var(--text);border-color:var(--violet)}
.tool.on{color:var(--violet);border-color:var(--violet)}
.ackbtn{font-size:10.5px}
#autoacts{margin-top:8px}#autoacts:empty{display:none}
</style></head><body>
<div class="bar"><h1><span class="logo">▦</span> Cross-Project Tracker <span class="gen" id="gen"></span><span class="agepill" id="agepill"></span></h1></div>
<div class="stats" id="stats"></div>
<section class="insights" id="insights">
  <div class="ins-head"><span>Insights</span><button class="ins-toggle" id="insToggle" aria-expanded="true">hide</button></div>
  <div class="ins-body">
    <div class="ins-rail" id="insRail"></div>
    <div class="ins-dist">
      <div><div class="dist-title">By language</div><div id="insLang"></div></div>
      <div><div class="dist-title">By activity</div><div id="insAct"></div></div>
    </div>
  </div>
</section>
__ACTIONS__
<section class="actions" id="autoacts"></section>
<div class="controls">
  <input id="q" placeholder="Filter projects… ( / to focus )" autocomplete="off">
  <select id="filt">
    <option value="">All projects</option><option value="attention">Needs attention</option><option value="dirty">Uncommitted changes</option>
    <option value="clean">Clean</option><option value="active">Active (≤7d)</option>
    <option value="warm">Touched ≤30d</option><option value="stale">Stale (&gt;90d)</option>
    <option value="ahead">Unpushed (ahead)</option><option value="nongit">Non-git</option>
  </select>
  <button class="tool" id="digest" title="Copy a Markdown standup summary to the clipboard">⧉ Digest</button>
  <button class="tool" id="csv" title="Download the table as CSV">CSV</button>
  <button class="tool" id="json" title="Download the raw snapshot as JSON">JSON</button>
  <button class="tool" id="ackToggle" title="Show snoozed / acknowledged risk items">acked: off</button>
  <span id="hichip"></span><span class="cnt" id="cnt"></span>
</div>
<div class="wrap"><table><thead><tr id="head"></tr></thead><tbody id="body"></tbody></table></div>
<p class="note">Local working-tree snapshot — branch, uncommitted-change counts, and ahead/behind reflect this machine. Private; not published.</p>
<script id="d" type="application/json">__DATA__</script>
<script>
const D=JSON.parse(document.getElementById('d').textContent);const S=__STATS__;
const $=i=>document.getElementById(i);const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const enc=b=>(b||'').split('/').map(encodeURIComponent).join('/');
$('gen').textContent='snapshot '+S.generated;
const genMs=Date.parse(String(S.generated).replace(' ','T'));
function updatePill(){const el=$('agepill');const ageH=(Date.now()-genMs)/36e5;if(isNaN(genMs)||ageH<0||ageH>8760){el.className='agepill warn';el.textContent='age unknown';return;}const tier=ageH<2?'fresh':ageH<72?'aging':'stale';el.className='agepill '+tier;el.textContent='~'+(ageH<1?'<1h':ageH<48?Math.round(ageH)+'h':Math.round(ageH/24)+'d')+' old';}
updatePill();setInterval(updatePill,60000);
$('stats').innerHTML=[['total','Projects',''],['git','Git repos','g'],['dirty','Uncommitted','d'],['active','Active ≤7d','a'],['unpushed','Unpushed','u'],['c30','Commits 30d','c']].map(([k,l,c])=>'<div class="stat '+c+'"><div class="v">'+S[k]+'</div><div class="l">'+l+'</div></div>').join('');
const maxc30=Math.max(1,...D.map(p=>p.c30));
const liveAge=p=>{if(!p.last_iso)return p.age_days;const ms=Date.parse(p.last_iso);if(isNaN(ms))return p.age_days;const d=(Date.now()-ms)/864e5;return d<0?p.age_days:d;};
const score=p=>(p.dirty||0)*3+(p.ahead||0)*2+(p.behind||0)+(p.git&&!p.remote?2:0)+((p.dirty>0&&liveAge(p)!=null&&liveAge(p)>30)?3:0);
function rel(a){if(a==null)return '—';if(a<1)return 'today';if(a<2)return '1d';if(a<30)return Math.round(a)+'d';if(a<365)return Math.round(a/30)+'mo';return (a/365).toFixed(1)+'y';}
function dotcls(p){const a=liveAge(p);if(a==null)return p.git?'cold':'none';if(a<=7)return 'act';if(a<=30)return 'warm';return 'cold';}
const gitCmd=p=>{const cd=p.path?('cd "'+p.path+'" && '):'';return cd+(p.dirty>0?'git status':(p.ahead>0&&p.behind>0)?'git pull --rebase':p.ahead>0?'git push':p.behind>0?'git pull --ff-only':'git fetch');};
function flashBtn(b,t){const o=b.textContent;b.textContent=t;b.classList.add('done');setTimeout(()=>{b.textContent=o;b.classList.remove('done');},1200);}
function doCopy(text,b){const ok=()=>flashBtn(b,'✓');if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(ok,()=>fbCopy(text,ok));}else fbCopy(text,ok);}
function fbCopy(text,ok){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok();}catch(e){}document.body.removeChild(ta);}
const COLS=[['name','Project'],['_score','Risk'],['branch','Branch'],['dirty','Δ'],['sync','Ahead/Behind'],['last_iso','Last commit'],['msg','Message'],['c30','30d'],['files','Files'],['lang','Lang'],['remote','Remote']];
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
let sortKey='_score',sortDir=-1,q='',filt='',hi=null;
const _v=LS.get('cpt.view',null);if(_v){if(_v.sortKey)sortKey=_v.sortKey;if(_v.sortDir)sortDir=_v.sortDir;filt=_v.filt||'';q=_v.q||'';}
let ack=LS.get('cpt.ack',{}),showAck=false;
function saveView(){LS.set('cpt.view',{sortKey,sortDir,filt,q});}
const stateHash=p=>p.dirty+'|'+p.ahead+'|'+p.behind+'|'+p.branch;
const isAck=p=>ack[p.name]===stateHash(p);
function toggleAck(p){if(isAck(p))delete ack[p.name];else ack[p.name]=stateHash(p);LS.set('cpt.ack',ack);buildAuto();render();}
function reasons(p){const r=[];const a=liveAge(p);
  if(p.ahead>0&&p.behind>0)r.push('diverged '+p.ahead+'↑/'+p.behind+'↓');
  else if(p.ahead>0)r.push(p.ahead+' unpushed');else if(p.behind>0)r.push(p.behind+' behind upstream');
  if(p.dirty>0)r.push(p.dirty+' uncommitted'+(p.churn?' (~'+p.churn+' lines)':''));
  if(p.dirty>0&&a!=null&&a>30)r.push('dirty work sitting '+rel(a));
  if(p.git&&!p.remote)r.push('no remote — unbacked');
  if(p.stash>0)r.push(p.stash+' stash'+(p.stash>1?'es':''));
  return r;}
function spark(arr,key,color){if(!arr||arr.length<2)return '';const v=arr.map(x=>x[key]||0),max=Math.max(...v),min=Math.min(...v),W=46,H=14,n=v.length;
  const pts=v.map((y,i)=>((i/(n-1))*W).toFixed(1)+','+(H-2-((y-min)/((max-min)||1))*(H-4)).toFixed(1)).join(' ');
  return '<svg class="spark" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5" stroke-linejoin="round"/></svg>';}
function rows(){
  let r=D.filter(p=>{
    if(q&&!p.name.toLowerCase().includes(q)&&!(p.last_msg||'').toLowerCase().includes(q))return false;
    if(hi){if(hi.key==='name'&&p.name!==hi.val)return false;if(hi.key==='lang'&&p.lang!==hi.val)return false;}
    if(filt==='dirty'&&!(p.dirty>0))return false;
    if(filt==='clean'&&!(p.git&&p.dirty===0))return false;
    if(filt==='attention'&&!(p._score>0&&(showAck||!isAck(p))))return false;
    if(filt==='active'&&!(liveAge(p)!=null&&liveAge(p)<=7))return false;
    if(filt==='warm'&&!(liveAge(p)!=null&&liveAge(p)<=30))return false;
    if(filt==='stale'&&!(liveAge(p)!=null&&liveAge(p)>90))return false;
    if(filt==='ahead'&&!(p.ahead>0))return false;
    if(filt==='nongit'&&p.git)return false;
    return true;
  });
  r.sort((a,b)=>{let x,y;
    if(sortKey==='sync'){x=a.ahead-a.behind;y=b.ahead-b.behind;}
    else if(sortKey==='name'||sortKey==='branch'||sortKey==='msg'||sortKey==='lang'||sortKey==='remote'){x=(a[sortKey==='msg'?'last_msg':sortKey]||'').toLowerCase();y=(b[sortKey==='msg'?'last_msg':sortKey]||'').toLowerCase();return x<y?-sortDir:x>y?sortDir:0;}
    else if(sortKey==='last_iso'){x=liveAge(a)==null?1e9:liveAge(a);y=liveAge(b)==null?1e9:liveAge(b);return (x-y)*-sortDir;}
    else{x=a[sortKey]||0;y=b[sortKey]||0;}
    return (x-y)*sortDir;
  });
  return r;
}
function render(){
  D.forEach((p,i)=>{p._score=score(p);p._i=i;});
  $('head').innerHTML=COLS.map(([k,l])=>'<th data-k="'+k+'"'+(k==='_score'?' title="risk = dirty×3 + ahead×2 + behind + no-remote×2 + stale&amp;dirty×3"':'')+'>'+l+(sortKey===k?(sortDir<0?' ▾':' ▴'):'')+'</th>').join('');
  const r=rows();
  $('body').innerHTML=r.map(p=>{
    const sync=(p.ahead?'<span class="b ahead">↑'+p.ahead+'</span> ':'')+(p.behind?'<span class="b behind">↓'+p.behind+'</span>':'')||(p.git?'<span class="num">—</span>':'');
    const dd=p.d_dirty?'<span class="dlt '+(p.d_dirty>0?'up':'dn')+'" title="change since previous snapshot">'+(p.d_dirty>0?'+':'')+p.d_dirty+'</span>':'';
    const dirty=p.git?(p.dirty>0?'<span class="b dirty">'+p.dirty+'</span>'+dd:'<span class="b clean">✓</span>'):'';
    const rl=p.remote?('<a href="https://github.com/'+esc(p.remote)+'" target="_blank" rel="noopener">'+esc(p.remote)+'</a>'+'<a class="glink" href="https://github.com/'+esc(p.remote)+'/commits/'+enc(p.branch)+'" target="_blank" rel="noopener">commits</a>'+(p.ahead>0?'<a class="glink" href="https://github.com/'+esc(p.remote)+'/compare/'+enc(p.branch)+'" target="_blank" rel="noopener">compare</a>':'')):'<span class="num">local</span>';
    const open=p.path?'<a class="glink open" href="vscode://file/'+esc(p.uri||p.path.replace(/\\/g,"/"))+'" title="Open this folder in VSCode">open</a>':'';
    const rsn=reasons(p);
    const riskBadge=p._score>0?'<span class="b risk'+(isAck(p)?' ackd':'')+'" title="'+esc(rsn.join(' • '))+'">'+p._score+'</span>':'<span class="num">0</span>';
    const fixBtn=p.git?'<button class="fixit" data-fix="'+p._i+'" title="Copy git command for this repo" aria-label="Copy git command">⧉</button>':'';
    const ackBtn=p._score>0?'<button class="fixit ackbtn" data-ack="'+p._i+'" title="'+(isAck(p)?'Un-acknowledge':'Snooze until git state changes')+'" aria-label="Acknowledge risk">'+(isAck(p)?'🔔':'🔕')+'</button>':'';
    const velo=(p.hist&&p.hist.length>1)?spark(p.hist,'c7','#2dd4bf'):'<span class="actbar"><i style="width:'+Math.round((p.c30/maxc30)*100)+'%"></i></span>';
    return '<tr><td><div class="name"><span class="dot '+dotcls(p)+'"></span>'+esc(p.name)+open+'</div></td>'
      +'<td>'+riskBadge+fixBtn+ackBtn+'</td>'
      +'<td>'+(p.git?'<span class="b branch">'+esc(p.branch)+'</span>':'<span class="num">—</span>')+'</td>'
      +'<td>'+dirty+'</td><td>'+sync+'</td>'
      +'<td><span class="when">'+rel(liveAge(p))+'</span></td>'
      +'<td><div class="msg" title="'+esc(p.last_msg)+'">'+esc(p.last_msg||'—')+'</div></td>'
      +'<td>'+velo+' <span class="num" title="commits in last 30 days">'+(p.c30||0)+'</span></td>'
      +'<td class="num">'+(p.files||0)+'</td><td class="num">'+esc(p.lang)+'</td><td>'+rl+'</td></tr>';
  }).join('');
  $('cnt').textContent=r.length+' / '+D.length+' projects';
  $('hichip').innerHTML=hi?'<button class="chip" data-clear="1">showing: '+esc(hi.val)+' ✕</button>':'';
}
$('head').addEventListener('click',e=>{const th=e.target.closest('[data-k]');if(!th)return;const k=th.dataset.k;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=(k==='name'||k==='branch'||k==='lang'||k==='remote'||k==='msg')?1:-1;}saveView();render();});
let t;$('q').addEventListener('input',e=>{clearTimeout(t);t=setTimeout(()=>{q=e.target.value.toLowerCase().trim();hi=null;saveView();render();},90);});
$('filt').addEventListener('change',e=>{filt=e.target.value;hi=null;saveView();render();});
$('body').addEventListener('click',e=>{const a=e.target.closest('[data-ack]');if(a){const p=D[+a.dataset.ack];if(p)toggleAck(p);return;}const b=e.target.closest('[data-fix]');if(b){const p=D[+b.dataset.fix];if(p)doCopy(gitCmd(p),b);}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==$('q')){e.preventDefault();$('q').focus();}});
function argmax(arr,fn){let bp=null,bv=-Infinity;for(const p of arr){const v=fn(p);if(v!=null&&v>bv){bv=v;bp=p;}}return bv>0?{p:bp,v:bv}:null;}
function buildInsights(){
  const rail=[['🔥','Hottest 7d',argmax(D,p=>p.c7),'commits'],['📝','Most uncommitted',argmax(D,p=>p.dirty),'files'],['↑','Most unpushed',argmax(D,p=>p.ahead),'ahead'],['🧊','Coldest w/ remote',argmax(D.filter(p=>p.git&&p.remote),p=>liveAge(p)),'old']].map(([ic,lab,res,unit])=>res?('<div class="ins-card" data-hi-name="'+esc(res.p.name)+'"><div class="ins-lab">'+ic+' '+lab+'</div><div class="ins-name">'+esc(res.p.name)+'</div><div class="ins-val">'+(unit==='old'?rel(res.v):res.v+' '+unit)+'</div></div>'):('<div class="ins-card muted"><div class="ins-lab">'+ic+' '+lab+'</div><div class="ins-val">none</div></div>')).join('');
  $('insRail').innerHTML=rail;
  const lc={};D.forEach(p=>{if(p.lang&&p.lang!=='—')lc[p.lang]=(lc[p.lang]||0)+1;});
  const langs=Object.entries(lc).sort((a,b)=>b[1]-a[1]).slice(0,8),lmax=Math.max(1,...langs.map(x=>x[1]));
  $('insLang').innerHTML=langs.map(([k,n])=>'<div class="dist-row" data-hi-lang="'+esc(k)+'"><span class="dist-lab">'+esc(k)+'</span><span class="dist-bar"><i style="width:'+Math.round(n/lmax*100)+'%"></i></span><span class="dist-n">'+n+'</span></div>').join('');
  const buck=[['active','Active ≤7d',p=>liveAge(p)!=null&&liveAge(p)<=7],['warm','Touched ≤30d',p=>liveAge(p)!=null&&liveAge(p)<=30],['stale','Stale >90d',p=>liveAge(p)!=null&&liveAge(p)>90],['nongit','Non-git',p=>!p.git]];
  const bmax=Math.max(1,...buck.map(([,,f])=>D.filter(f).length));
  $('insAct').innerHTML=buck.map(([fv,lab,f])=>{const n=D.filter(f).length;return '<div class="dist-row" data-filt="'+fv+'"><span class="dist-lab">'+lab+'</span><span class="dist-bar"><i style="width:'+Math.round(n/bmax*100)+'%"></i></span><span class="dist-n">'+n+'</span></div>';}).join('');
}
function setHi(h){hi=h;q='';$('q').value='';filt='';$('filt').value='';render();window.scrollTo({top:0,behavior:'auto'});}
$('insights').addEventListener('click',e=>{
  if(e.target.closest('#insToggle')){const c=$('insights').classList.toggle('collapsed');LS.set('cpt.ins',c);const b=$('insToggle');b.textContent=c?'show':'hide';b.setAttribute('aria-expanded',c?'false':'true');return;}
  const cn=e.target.closest('[data-hi-name]');if(cn){setHi({key:'name',val:cn.dataset.hiName});return;}
  const cl=e.target.closest('[data-hi-lang]');if(cl){setHi({key:'lang',val:cl.dataset.hiLang});return;}
  const cf=e.target.closest('[data-filt]');if(cf){hi=null;filt=cf.dataset.filt;$('filt').value=cf.dataset.filt;render();}
});
$('hichip').addEventListener('click',e=>{if(e.target.closest('[data-clear]')){hi=null;render();}});
function buildAuto(){
  D.forEach((p,i)=>{p._score=score(p);p._i=i;});
  const cand=D.filter(p=>p._score>0&&(showAck||!isAck(p))).sort((a,b)=>b._score-a._score);
  const el=$('autoacts');
  if(!cand.length){el.innerHTML='';return;}
  const sev=p=>((p.ahead>0&&p.behind>0)||(p.dirty>0&&liveAge(p)!=null&&liveAge(p)>30)||(p.git&&!p.remote))?0:(p.dirty>0||p.ahead>0||p.behind>0)?1:2;
  const groups=[[0,'Urgent','now'],[1,'Soon','next'],[2,'Watch','done']];
  const cards=groups.map(([s,lab,cls])=>{
    const items=cand.filter(p=>sev(p)===s);if(!items.length)return '';
    const rowsH=items.map(p=>{
      const cmd=gitCmd(p).replace(/^cd "[^"]*" && /,'');
      const open=p.path?'<a class="glink open" href="vscode://file/'+esc(p.uri||p.path.replace(/\\/g,"/"))+'" title="Open in VSCode">open</a>':'';
      return '<div class="act-item"><div class="act-meta"><span class="act-pill p'+s+'">P'+s+'</span><span class="act-name">'+esc(p.name)+'</span><button class="fixit" data-fix="'+p._i+'" title="Copy git command">⧉</button>'+open+'</div><p class="act-copy">'+esc(reasons(p).slice(0,3).join(' • '))+' — <b>'+esc(cmd)+'</b></p></div>';
    }).join('');
    return '<article class="act-card '+cls+'"><div class="act-title"><span>'+lab+'</span><span>'+items.length+'</span></div><div class="act-list">'+rowsH+'</div></article>';
  }).join('');
  el.innerHTML='<div class="act-head"><span>Live action queue</span><span class="act-stamp">auto from git state · '+cand.length+' repo'+(cand.length>1?'s':'')+' need attention</span></div><div class="act-grid">'+cards+'</div>';
}
$('autoacts').addEventListener('click',e=>{const b=e.target.closest('[data-fix]');if(b){const p=D[+b.dataset.fix];if(p)doCopy(gitCmd(p),b);}});
function download(name,text,type){const b=new Blob([text],{type:type||'text/plain'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),1500);}
function csvText(){const cols=['name','git','branch','dirty','churn','ahead','behind','c7','c30','total','stash','last_iso','last_msg','remote','lang','files','path'];const cell=s=>{s=s==null?'':String(s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};return [cols.join(',')].concat(D.map(p=>cols.map(c=>cell(p[c])).join(','))).join('\n');}
function digestText(){const fmt=p=>'- **'+p.name+'**'+(p.branch?' ('+p.branch+')':'')+(p.last_msg?' — '+p.last_msg:'');
  const active=D.filter(p=>liveAge(p)!=null&&liveAge(p)<=7).sort((a,b)=>liveAge(a)-liveAge(b));
  const sync=D.filter(p=>p.ahead>0||p.behind>0);
  const dl=D.filter(p=>p.dirty>0).sort((a,b)=>b.dirty-a.dirty);
  let m='# Cross-project digest — '+S.generated+'\n\n';
  m+='**Active ≤7d:** '+active.length+' · **Unpushed/diverged:** '+sync.length+' · **Uncommitted:** '+dl.length+'\n';
  if(active.length)m+='\n## Active this week\n'+active.map(fmt).join('\n')+'\n';
  if(sync.length)m+='\n## Needs push / pull\n'+sync.map(p=>'- **'+p.name+'** '+(p.ahead?'↑'+p.ahead:'')+(p.behind?' ↓'+p.behind:'')+(p.remote?' · '+p.remote:'')).join('\n')+'\n';
  if(dl.length)m+='\n## Uncommitted work\n'+dl.map(p=>'- **'+p.name+'** — '+p.dirty+' files'+(p.churn?' (~'+p.churn+' lines)':'')).join('\n')+'\n';
  return m;}
const fileStamp=String(S.generated).replace(/[^0-9]/g,'');
$('digest').addEventListener('click',e=>doCopy(digestText(),e.target.closest('button')));
$('csv').addEventListener('click',()=>download('cross-project-'+fileStamp+'.csv',csvText(),'text/csv'));
$('json').addEventListener('click',()=>download('cross-project-'+fileStamp+'.json',JSON.stringify(D,null,2),'application/json'));
$('ackToggle').addEventListener('click',e=>{showAck=!showAck;const b=e.target.closest('button');b.textContent='acked: '+(showAck?'on':'off');b.classList.toggle('on',showAck);buildAuto();render();});
$('filt').value=filt;$('q').value=q;
if(LS.get('cpt.ins',false)){$('insights').classList.add('collapsed');const b=$('insToggle');b.textContent='show';b.setAttribute('aria-expanded','false');}
buildInsights();buildAuto();render();
</script></body></html>'''
acts = ''
_ap = os.path.join(ROOT, 'cross-project-actions.html')
if os.path.exists(_ap): acts = open(_ap, encoding='utf-8').read()
HTML = HTML.replace('__DATA__', data).replace('__STATS__', json.dumps(stats)).replace('__ACTIONS__', acts)
out = os.path.join(ROOT, 'cross-project-dashboard.html')
open(out, 'w', encoding='utf-8').write(HTML)
print('scanned projects:', len(projects), '| git:', gitn, '| dirty:', dirty, '| active≤7d:', active, '| commits30d:', c30, '| unpushed:', unpushed)
print('wrote', out, '|', len(HTML.encode('utf-8')), 'bytes')
print('\ntop activity (30d):')
for p in sorted(projects, key=lambda x: -x['c30'])[:8]:
    print('  %3d  %-42s %-12s dirty=%-3d %s' % (p['c30'], p['name'][:42], p['branch'][:12], p['dirty'], (p['last_msg'] or '')[:40]))
