import { EVIDENCE_METHODS, type EvidenceMethod, type Provenance } from "../domain/evidence";
import { NoteField, SelectField } from "./fields";

const LABELS: Record<EvidenceMethod, string> = {
  unknown: "Not recorded", assumption: "Working assumption", photo: "Photo observation",
  "scaled-plan": "Scaled drawing", "staff-report": "Staff report", "field-measurement": "Field measurement",
  manufacturer: "Manufacturer specification", operator: "Operator entry",
};

export function ProvenanceFields({ value, onChange }: { value?: Provenance; onChange(value: Provenance): void }) {
  return (
    <>
      <SelectField<EvidenceMethod>
        label="Evidence method"
        value={value?.method ?? "unknown"}
        options={EVIDENCE_METHODS.map((method) => ({ value: method, label: LABELS[method] }))}
        onChange={(method) => onChange({ method, sourceIds: value?.sourceIds ?? [] })}
      />
      <NoteField
        label="Source identifiers (comma separated)"
        value={value?.sourceIds.join(", ") ?? ""}
        onCommit={(text) => onChange({ method: value?.method ?? "unknown", sourceIds: text.split(",").map((id) => id.trim()).filter(Boolean) })}
      />
    </>
  );
}
