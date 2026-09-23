// Small structural validators that report every problem with a field path, so an import or a
// settings edit can name the offending field instead of failing with a generic message.

export interface Issue {
  /** Dotted path to the offending field, e.g. "venue.dimensions.stageWidth.value". */
  path: string;
  message: string;
}

export class IssueList {
  readonly issues: Issue[] = [];

  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  get ok(): boolean {
    return this.issues.length === 0;
  }
}

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function readObject(
  issues: IssueList,
  value: unknown,
  path: string,
): Record<string, unknown> | null {
  if (!isPlainObject(value)) {
    issues.add(path, "Expected an object.");
    return null;
  }
  return value;
}

export function readString(
  issues: IssueList,
  value: unknown,
  path: string,
  options: { maxLength?: number; allowEmpty?: boolean } = {},
): string | null {
  const { maxLength = 2000, allowEmpty = true } = options;
  if (typeof value !== "string") {
    issues.add(path, "Expected text.");
    return null;
  }
  if (!allowEmpty && value.trim() === "") {
    issues.add(path, "Must not be empty.");
    return null;
  }
  if (value.length > maxLength) {
    issues.add(path, `Must be at most ${maxLength} characters.`);
    return null;
  }
  return value;
}

export function readNumber(
  issues: IssueList,
  value: unknown,
  path: string,
  range?: { min: number; max: number; describe?: (v: number) => string },
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.add(path, "Expected a finite number.");
    return null;
  }
  if (range && (value < range.min || value > range.max)) {
    const show = range.describe ?? ((v: number) => String(v));
    issues.add(path, `Must be between ${show(range.min)} and ${show(range.max)}.`);
    return null;
  }
  return value;
}

export function readInteger(
  issues: IssueList,
  value: unknown,
  path: string,
  range: { min: number; max: number },
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    issues.add(path, "Expected a whole number.");
    return null;
  }
  if (value < range.min || value > range.max) {
    issues.add(path, `Must be between ${range.min} and ${range.max}.`);
    return null;
  }
  return value;
}

export function readBoolean(issues: IssueList, value: unknown, path: string): boolean | null {
  if (typeof value !== "boolean") {
    issues.add(path, "Expected true or false.");
    return null;
  }
  return value;
}

export function readEnum<T extends string>(
  issues: IssueList,
  value: unknown,
  path: string,
  allowed: readonly T[],
): T | null {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    issues.add(path, `Must be one of: ${allowed.join(", ")}.`);
    return null;
  }
  return value as T;
}

export function formatIssues(issues: readonly Issue[], limit = 6): string {
  const shown = issues.slice(0, limit).map((issue) => `${issue.path}: ${issue.message}`);
  const extra = issues.length > limit ? ` (+${issues.length - limit} more)` : "";
  return shown.join(" · ") + extra;
}
