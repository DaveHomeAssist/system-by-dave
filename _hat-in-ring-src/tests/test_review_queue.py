"""Review-queue persistence + resolution (M3) and the review-UI build.

The review queue is the human-in-the-loop control. Before this ticket it was
overwritten with only the current run's items, so anything a human hadn't acted
on vanished on the next daily run. ``pipeline.reconcile_review`` now persists the
queue across runs and applies committed decisions (confirm/dismiss).

These tests drive ``reconcile_review`` against a temp DATA dir (no network), and
build the dashboard to assert the queue is inlined + the review UI renders safely.
"""
from __future__ import annotations
import json
import shutil
import subprocess
from datetime import date
from pathlib import Path

import pytest

import hatring.pipeline as pl
from hatring.merge import Dataset, review_rid

ROOT = Path(__file__).resolve().parent.parent
SMOKE = Path(__file__).resolve().parent / "dashboard_smoke.js"
TODAY = date(2026, 6, 13)


def _rec(rid="x", name="Existing Person", keys=("consideringQuote",)):
    return {"id": rid, "name": name, "party": "Democrat", "role": "r",
            "bucket": "considering", "keys": list(keys), "conf": "Medium",
            "delta": 0, "lastSignal": "2026-06-01", "headline": "h",
            "why": "w", "quote": "", "tags": []}


def _item(name, url, keys, **extra):
    it = {"name": name, "url": url, "source": "AP", "date": "2026-06-10", "keys": list(keys)}
    it.update(extra)
    it["rid"] = review_rid(name, url, keys)
    it.setdefault("kind", "discovery")
    return it


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(pl, "DATA", tmp_path)
    return tmp_path


def _q(d):
    return json.loads((d / "review_queue.json").read_text())


# ---- persistence (the core M3 fix) -------------------------------------

def test_queue_persists_across_runs(data_dir):
    ds = Dataset([_rec()], today=TODAY)
    ds.review = [_item("Newcomer", "http://a", ["consideringQuote"])]
    pl.reconcile_review(ds, TODAY)
    assert len(_q(data_dir)) == 1

    # next run produces NO new review items; the prior one must survive
    ds2 = Dataset([_rec()], today=TODAY)
    ds2.review = []
    pl.reconcile_review(ds2, TODAY)
    assert len(_q(data_dir)) == 1, "prior review item was lost on the next run (M3)"


def test_new_items_dedup_by_rid(data_dir):
    ds = Dataset([_rec()], today=TODAY)
    ds.review = [_item("Newcomer", "http://a", ["consideringQuote"])]
    pl.reconcile_review(ds, TODAY)
    # same logical item re-produced next run -> still one entry
    ds2 = Dataset([_rec()], today=TODAY)
    ds2.review = [_item("Newcomer", "http://a", ["consideringQuote"])]
    pl.reconcile_review(ds2, TODAY)
    q = _q(data_dir)
    assert len(q) == 1
    assert len({i["rid"] for i in q}) == 1


def test_rid_is_stable_and_deterministic():
    a = review_rid("Jane Doe", "http://x", ["declared", "donors"])
    b = review_rid("Jane Doe", "http://x", ["donors", "declared"])  # order-independent
    assert a == b and len(a) == 12


# ---- resolution (confirm / dismiss) ------------------------------------

def test_confirm_applies_to_existing_person(data_dir):
    ds = Dataset([_rec(name="Existing Person", keys=["consideringQuote"])], today=TODAY)
    item = _item("Existing Person", "http://b", ["donors"])
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)                     # run 1: queue it

    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "confirm"}]))
    ds2 = Dataset([_rec(name="Existing Person", keys=["consideringQuote"])], today=TODAY)
    mutated = pl.reconcile_review(ds2, TODAY)          # run 2: confirm
    assert mutated is True
    person = next(r for r in ds2.records if r["name"] == "Existing Person")
    assert "donors" in person["keys"]
    assert _q(data_dir) == []                          # resolved -> removed


def test_confirm_creates_new_candidate(data_dir):
    ds = Dataset([_rec()], today=TODAY)
    item = _item("Brand New", "http://c", ["consideringQuote"])
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "confirm"}]))
    ds2 = Dataset([_rec()], today=TODAY)
    assert pl.reconcile_review(ds2, TODAY) is True
    assert any(r["name"] == "Brand New" for r in ds2.records)


def test_dismiss_removes_without_touching_dataset(data_dir):
    ds = Dataset([_rec()], today=TODAY)
    item = _item("Noise Name", "http://d", ["consideringQuote"])
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "dismiss"}]))
    ds2 = Dataset([_rec()], today=TODAY)
    mutated = pl.reconcile_review(ds2, TODAY)
    assert mutated is False
    assert _q(data_dir) == []
    assert not any(r["name"] == "Noise Name" for r in ds2.records)


def test_resolved_item_never_resurfaces(data_dir):
    ds = Dataset([_rec()], today=TODAY)
    item = _item("Gone For Good", "http://e", ["consideringQuote"])
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "dismiss"}]))
    pl.reconcile_review(Dataset([_rec()], today=TODAY), TODAY)
    # re-produced by a later run -> must stay gone (resolved set)
    ds3 = Dataset([_rec()], today=TODAY)
    ds3.review = [_item("Gone For Good", "http://e", ["consideringQuote"])]
    pl.reconcile_review(ds3, TODAY)
    assert _q(data_dir) == []


def test_decisions_are_idempotent(data_dir):
    ds = Dataset([_rec(name="Re Applied", keys=["consideringQuote"])], today=TODAY)
    item = _item("Re Applied", "http://f", ["donors"])
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "confirm"}]))
    pl.reconcile_review(Dataset([_rec(name="Re Applied", keys=["consideringQuote"])], today=TODAY), TODAY)
    # run the same decisions file again — must not double-apply or error
    ds3 = Dataset([_rec(name="Re Applied", keys=["consideringQuote"])], today=TODAY)
    mutated = pl.reconcile_review(ds3, TODAY)
    person = next(r for r in ds3.records if r["name"] == "Re Applied")
    assert person["keys"].count("donors") == 0     # not re-applied (already resolved)
    assert mutated is False


# ---- audit-hardening regressions (H1/H2/M1/M2/M4) ----------------------

def test_malformed_decisions_does_not_crash_run(data_dir):
    """H1: a corrupt review_decisions.json (the human-committed file) must NOT
    abort the unattended run — it fails safe to empty."""
    ds = Dataset([_rec()], today=TODAY)
    ds.review = [_item("Q", "http://q", ["consideringQuote"])]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text("{ this is not json ")
    # must not raise
    pl.reconcile_review(Dataset([_rec()], today=TODAY), TODAY)
    assert len(_q(data_dir)) == 1                       # queue intact


def test_wrong_type_decisions_does_not_crash(data_dir):
    """H1: a JSON object (not a list) in review_decisions.json must not crash."""
    ds = Dataset([_rec()], today=TODAY)
    ds.review = [_item("Q", "http://q", ["consideringQuote"])]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps({"rid": "confirm"}))
    pl.reconcile_review(Dataset([_rec()], today=TODAY), TODAY)   # no raise


def test_malformed_queue_does_not_crash(data_dir):
    """H1: a corrupt review_queue.json must fail safe to empty, not crash."""
    (data_dir / "review_queue.json").write_text("]]not json[[")
    pl.reconcile_review(Dataset([_rec()], today=TODAY), TODAY)   # no raise
    assert _q(data_dir) == []


def test_confirm_without_keys_is_not_dropped(data_dir):
    """H2: confirming an item that can't be applied (no keys) leaves it QUEUED,
    not silently resolved and lost."""
    ds = Dataset([_rec()], today=TODAY)
    bad = _item("No Keys", "http://nk", [])             # empty keys
    bad["rid"] = review_rid("No Keys", "http://nk", [])
    ds.review = [bad]
    pl.reconcile_review(ds, TODAY)
    assert len(_q(data_dir)) == 1
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": bad["rid"], "action": "confirm"}]))
    pl.reconcile_review(Dataset([_rec()], today=TODAY), TODAY)
    assert len(_q(data_dir)) == 1, "unapplyable confirm must stay queued (H2)"
    assert json.loads((data_dir / "review_resolved.json").read_text()) == []


def test_slug_colliding_names_get_unique_ids(data_dir):
    """M1: two distinct names that slug-collide must NOT produce duplicate ids."""
    ds = Dataset([_rec()], today=TODAY)
    a = _item("Bob Smith", "http://a", ["declared"])
    b = _item("Bob.Smith", "http://b", ["exploratory"])
    ds.review = [a, b]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps(
        [{"rid": a["rid"], "action": "confirm"}, {"rid": b["rid"], "action": "confirm"}]))
    ds2 = Dataset([_rec()], today=TODAY)
    pl.reconcile_review(ds2, TODAY)
    created = [r for r in ds2.records if r["id"].startswith("rev-")]
    ids = [r["id"] for r in created]
    assert len(ids) == 2 and len(set(ids)) == 2, f"duplicate ids: {ids}"
    assert len(ds2.by_id) == len(ds2.records)          # index consistent


def test_confirmed_downgrade_updates_bucket(data_dir):
    """M2: confirming ruledOut on an existing record moves bucket to 'out' so the
    dashboard's bucket-driven stats/filter/feed agree with the lowered tier."""
    ds = Dataset([_rec(name="Wavering Gov", keys=["consideringQuote"])], today=TODAY)
    item = _item("Wavering Gov", "http://w", ["ruledOut"], note="confirm", kind="denial")
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "confirm"}]))
    ds2 = Dataset([_rec(name="Wavering Gov", keys=["consideringQuote"])], today=TODAY)
    pl.reconcile_review(ds2, TODAY)
    rec = next(r for r in ds2.records if r["name"] == "Wavering Gov")
    assert "ruledOut" in rec["keys"]
    assert rec["bucket"] == "out", "bucket must follow the confirmed downgrade"


def test_decisions_inbox_emptied_after_consume(data_dir):
    """M4: decisions are single-use — the file is emptied after a run so a stale
    committed 'confirm' can't re-fire on a future item reusing the same rid."""
    ds = Dataset([_rec(name="P", keys=["consideringQuote"])], today=TODAY)
    item = _item("P", "http://p", ["donors"])
    ds.review = [item]
    pl.reconcile_review(ds, TODAY)
    (data_dir / "review_decisions.json").write_text(json.dumps([{"rid": item["rid"], "action": "confirm"}]))
    pl.reconcile_review(Dataset([_rec(name="P", keys=["consideringQuote"])], today=TODAY), TODAY)
    assert json.loads((data_dir / "review_decisions.json").read_text()) == []


# ---- build inlines the queue + UI renders safely -----------------------

def test_build_inlines_review_queue(tmp_path):
    from hatring.build import render
    (tmp_path / "candidates.json").write_text((ROOT / "data" / "seed.json").read_text())
    (tmp_path / "review_queue.json").write_text(json.dumps([
        _item("Hostile <script>", "http://x", ["consideringQuote"], headline="</script><img src=x onerror=alert(1)>"),
    ]))
    out = tmp_path / "index.html"
    render(tmp_path / "candidates.json", ROOT / "templates", out, built=TODAY)
    html = out.read_text()
    assert "const REVIEW =" in html
    # the hostile headline must be escaped in the SEED/REVIEW literal (no breakout)
    rev = html[html.index("const REVIEW ="):html.index("const REVIEW =") + 1000]
    assert "</script" not in rev.lower()


@pytest.mark.skipif(shutil.which("node") is None, reason="node not available")
def test_review_view_renders_and_escapes(tmp_path):
    from hatring.build import render
    (tmp_path / "candidates.json").write_text((ROOT / "data" / "seed.json").read_text())
    (tmp_path / "review_queue.json").write_text(json.dumps([
        _item("Evil <b>", "http://x", ["consideringQuote"], headline="<img src=x onerror=alert(1)>", kind="discovery"),
        _item("Denial Person", "http://y", ["ruledOut"], note="confirm", kind="denial"),
    ]))
    out = tmp_path / "index.html"
    render(tmp_path / "candidates.json", ROOT / "templates", out, built=TODAY)
    # board still renders (regression) + the review list renders escaped
    check = subprocess.run(["node", "-e", _REVIEW_NODE, str(out)], capture_output=True, text=True, timeout=60)
    assert check.returncode == 0, f"{check.stdout}\n{check.stderr}"
    assert "PASS" in check.stdout


_REVIEW_NODE = r"""
const fs=require('fs');
const html=fs.readFileSync(process.argv[1],'utf8');
const main=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('GENERATED_AT'));
const byId={};
function mkEl(){return {_html:'',value:'',dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return[]},querySelector(){return mkEl()},closest(){return null},appendChild(){},click(){},setAttribute(){},getAttribute(){return null},set innerHTML(v){this._html=v},get innerHTML(){return this._html},set textContent(v){this._t=v},get textContent(){return this._t}};}
function el(s){return byId[s]=byId[s]||mkEl();}
const document={querySelector:el,querySelectorAll(){return[]},createElement(){return mkEl()},addEventListener(){},body:{addEventListener(){}}};
const localStorage={getItem(){return null},setItem(){},removeItem(){}};const window={addEventListener(){}};const URL={createObjectURL(){return'x'}};function Blob(){}function confirm(){return false}
try{ eval(main+'\n init(); renderReview();'); }catch(e){console.log('FAIL threw',e.message);process.exit(1);}
const list=(byId['#reviewList']||{})._html||'';
const n=(list.match(/class="reviewItem"/g)||[]).length;
if(n!==2){console.log('FAIL expected 2 review items, got '+n);process.exit(2);}
if(/<(img|script|svg)/i.test(list)){console.log('FAIL raw tag leaked into review list');process.exit(3);}
if(!list.includes('data-confirm=')||!list.includes('data-dismiss=')){console.log('FAIL missing action buttons');process.exit(4);}
console.log('PASS review view: '+n+' items, escaped, actionable');
"""
