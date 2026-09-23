import { type ReactNode, useEffect, useId, useState } from "react";
import { EVIDENCE_HINTS, EVIDENCE_LABELS, type EvidenceStatus } from "../domain/evidence";
import { type Issue } from "../domain/validate";

/**
 * A change can be refused because of a different field (pan left against pan right, distance
 * against height). Report the refusal on the edited field as well, so it shows why and its text
 * resets to the live value once the refusal clears.
 */
export function withFieldIssue(issues: Issue[], fieldPath: string): Issue[] {
  if (issues.length === 0 || issues.some((issue) => issue.path.startsWith(fieldPath))) return issues;
  return [...issues, { path: fieldPath, message: `Not applied: ${issues[0].message}` }];
}

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return (
    <span className={`evidence evidence-${status}`} title={EVIDENCE_HINTS[status]}>
      {EVIDENCE_LABELS[status]}
    </span>
  );
}

interface NumberFieldProps {
  label: ReactNode;
  value: number;
  /** Digits shown after the decimal point. */
  digits: number;
  unit?: string;
  step?: number;
  help?: ReactNode;
  error?: string;
  onCommit(value: number): void;
}

/**
 * A number input that commits on blur or Enter, so a value is only validated once the operator has
 * finished typing. A rejected value stays in the box with the reason; the last valid value stays live.
 */
export function NumberField({ label, value, digits, unit, step, help, error, onCommit }: NumberFieldProps) {
  const id = useId();
  const shown = value.toFixed(digits);
  const [draft, setDraft] = useState(shown);
  // Show the live value whenever it changes or a rejection clears.
  useEffect(() => {
    if (!error) setDraft(shown);
  }, [shown, error]);
  const commit = () => {
    const trimmed = draft.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) {
      setDraft(shown);
      return;
    }
    if (parsed.toFixed(digits) !== shown || error) onCommit(parsed);
    else setDraft(shown);
  };
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step ?? Math.pow(10, -digits)}
          value={draft}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
        {unit && <span className="field-unit">{unit}</span>}
      </div>
      {error ? (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : (
        help && (
          <p className="field-help" id={`${id}-help`}>
            {help}
          </p>
        )
      )}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: ReactNode;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange(value: T): void;
}

export function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NoteFieldProps {
  label: ReactNode;
  value: string;
  onCommit(value: string): void;
}

/** Free-text source note; commits on blur. */
export function NoteField({ label, value, onCommit }: NoteFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={2}
        maxLength={2000}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== value) onCommit(draft);
        }}
      />
    </div>
  );
}

interface RadioGroupProps<T extends string> {
  legend: ReactNode;
  value: T;
  options: ReadonlyArray<{ value: T; label: string; hint?: string }>;
  onChange(value: T): void;
}

export function RadioGroup<T extends string>({ legend, value, options, onChange }: RadioGroupProps<T>) {
  const name = useId();
  return (
    <fieldset className="radio-group">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="radio-option">
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
          <span>
            {option.label}
            {option.hint && <small>{option.hint}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
