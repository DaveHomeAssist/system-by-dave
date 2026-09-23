import { useState } from "react";
import { type BowlRecord, solveBowl } from "../domain/bowl";
import { editedEvidence } from "../domain/evidence";
import { type VenueGeometry } from "../domain/venue";
import { EvidenceBadge, NumberField, SelectField } from "./fields";

export function BowlInspector({ bowl, geometry, onChange }: { bowl: BowlRecord; geometry: VenueGeometry; onChange(bowl: BowlRecord): void }) {
  const [selected, setSelected] = useState(bowl.sectors[2]?.id ?? bowl.sectors[0].id);
  const sector = bowl.sectors.find(s => s.id === selected) ?? bowl.sectors[0];
  const solved = solveBowl(bowl, geometry.pitDepth, geometry.deckHeight);
  const rows = solved.rows.filter(r => r.sectorId === sector.id);
  const segments = solved.segments.filter(s => s.sectorId === sector.id);
  const edit = (change: (draft: BowlRecord) => void) => { const draft = structuredClone(bowl); change(draft); onChange(draft); };
  const index = bowl.sectors.indexOf(sector);
  const end = Math.max(...solved.rows.map(r => r.outer - bowl.focusUpstage.value));
  const top = Math.max(geometry.camera.height, ...solved.rows.map(r => r.nextY)) + 3;
  const floor = -geometry.deckHeight - 1;
  const x = (downstage: number) => 25 + downstage / end * 350;
  const y = (height: number) => 170 - (height - floor) / (top - floor) * 150;
  const projection = Math.cos((sector.fromDeg.value + sector.toDeg.value) / 2 * Math.PI / 180);
  const points = rows.flatMap(r => [`${x(r.inner * projection - bowl.focusUpstage.value)},${y(r.y)}`, `${x(r.outer * projection - bowl.focusUpstage.value)},${y(r.y)}`]).join(" ");
  return <fieldset className="dimension" data-testid="bowl-inspector">
    <legend>Bowl pitch inspector <EvidenceBadge status="demo" /></legend>
    <p>Unmeasured starting geometry, in metres above the stage deck. P096 informs unequal sections only. Seating pitch is not surveyed; the dashed line projects the camera-to-stage sightline into side elevation. Grades use radial row run, not its shortened side projection.</p>
    <SelectField label="Seating sector" value={sector.id} options={bowl.sectors.map(s => ({ value: s.id, label: `${s.label} · level ${s.level.value}` }))} onChange={setSelected} />
    <svg viewBox="0 0 400 195" role="img" aria-label={`Side elevation of sector ${sector.label} and camera to stage sightline`} style={{ width: "100%", background: "var(--panel-bg, transparent)" }}>
      <line x1={x(0)} x2={x(end)} y1={y(0)} y2={y(0)} stroke="currentColor" opacity="0.3" />
      <polyline points={points} fill="none" stroke="#238d91" strokeWidth="2" />
      <line x1={x(-geometry.camera.upstage)} y1={y(geometry.camera.height)} x2={x(0)} y2={y(0)} stroke="currentColor" strokeDasharray="5 4" />
      <circle cx={x(-geometry.camera.upstage)} cy={y(geometry.camera.height)} r="3" fill="currentColor" />
      <text x="25" y="190" fill="currentColor" fontSize="11">Stage / DSE</text><text x="280" y="190" fill="currentColor" fontSize="11">Toward rear house</text>
    </svg>
    <div style={{ overflowX: "auto" }}>
      <table className="spec-table" data-testid="bowl-pitch-table"><caption>Section {sector.label} · unverified pitch</caption><thead><tr><th>Rows</th><th>Run</th><th>Rise</th><th>Grade</th><th>Angle</th></tr></thead><tbody>
        {segments.map(s => <tr key={s.fromRow}><th>{s.fromRow}–{s.toRow}</th><td>{s.run.toFixed(2)} m</td><td>{s.rise.toFixed(2)} m</td><td>{s.grade.toFixed(2)}%</td><td>{s.angle.toFixed(2)}°</td></tr>)}
      </tbody></table>
    </div>
    <p data-testid="bowl-row-heights">First tread {rows[0].y.toFixed(2)} m · last tread {rows.at(-1)!.y.toFixed(2)} m. Each segment ends at its next riser; the cross aisle adds {bowl.band.width.value.toFixed(2)} m of run and {bowl.band.elevationStep.value.toFixed(2)} m of elevation separately.</p>
    <NumberField label="Row run" value={sector.rowRun.value} unit="m" digits={2} onCommit={value => edit(d => { d.sectors[index].rowRun = { ...editedEvidence(d.sectors[index].rowRun), value }; })} />
    {sector.elevations.slice(1).map((point, j) => {
      const start = sector.elevations[j], runRows = point.row.value - start.row.value;
      return <NumberField key={j} label={`Rise per row, segment ${j + 1}`} value={(point.elevation.value - start.elevation.value) / runRows} unit="m" digits={3} onCommit={value => edit(d => {
        const points = d.sectors[index].elevations;
        const delta = start.elevation.value + value * runRows - point.elevation.value;
        for (let i = j + 1; i < points.length; i++) points[i].elevation = { ...editedEvidence(points[i].elevation), value: points[i].elevation.value + delta };
      })} />;
    })}
    {sector.elevations.map((p, i) => <div key={i}>
      <NumberField label={`Control point ${i + 1} row`} value={p.row.value} digits={0} onCommit={value => edit(d => { d.sectors[index].elevations[i].row = { ...editedEvidence(p.row), value }; })} />
      <NumberField label={`Control point ${i + 1} elevation`} value={p.elevation.value} unit="m" digits={2} onCommit={value => edit(d => { d.sectors[index].elevations[i].elevation = { ...editedEvidence(p.elevation), value }; })} />
      {i > 0 && i < sector.elevations.length - 1 && <button className="tool-button" type="button" onClick={() => edit(d => { d.sectors[index].elevations.splice(i, 1); })}>Remove point {i + 1}</button>}
    </div>)}
    <button className="tool-button" type="button" disabled={sector.elevations.length >= 12 || !sector.elevations.some((p, i) => i && p.row.value - sector.elevations[i - 1].row.value > 1)} onClick={() => edit(d => {
      const pts = d.sectors[index].elevations;
      const i = pts.findIndex((p, j) => j > 0 && p.row.value - pts[j - 1].row.value > 1);
      if (i < 1) return;
      const a = pts[i - 1], b = pts[i], row = Math.floor((a.row.value + b.row.value) / 2);
      pts.splice(i, 0, { row: { ...editedEvidence(a.row), value: row }, elevation: { ...editedEvidence(a.elevation), value: a.elevation.value + (b.elevation.value - a.elevation.value) * (row - a.row.value) / (b.row.value - a.row.value) } });
    })}>Add elevation control point</button>
    <NumberField label="Cross aisle width" value={bowl.band.width.value} unit="m" digits={2} onCommit={value => edit(d => { d.band.width = { ...editedEvidence(d.band.width), value }; })} />
    <NumberField label="Cross aisle elevation step" value={bowl.band.elevationStep.value} unit="m" digits={2} onCommit={value => edit(d => { d.band.elevationStep = { ...editedEvidence(d.band.elevationStep), value }; })} />
  </fieldset>;
}
