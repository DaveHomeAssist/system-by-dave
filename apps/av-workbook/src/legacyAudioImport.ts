import type { AvWorkbook, LineCheck, PatchRecord, SignalSource, WorkbookStatus } from "./types";

export const LEGACY_AUDIO_KEYS = {
  inputList: "input-list.v1",
  audioPatch: "audio-patch.v1",
  lineCheck: "line-check.v1"
} as const;

type LegacyAudioKey = (typeof LEGACY_AUDIO_KEYS)[keyof typeof LEGACY_AUDIO_KEYS];
type SourceType = SignalSource["sourceType"];
type PlainRecord = Record<string, unknown>;

type LegacyMetaKey =
  | "showName"
  | "venueName"
  | "venue"
  | "showDate"
  | "engineerName"
  | "consoleName"
  | "client"
  | "a1"
  | "leadTech"
  | "handoffTo";

type LegacyMeta = Partial<Record<LegacyMetaKey, string>>;

interface LegacyInputRow {
  id: string;
  channel: string;
  source: string;
  type: string;
  patch: string;
  conn: string;
  phantom: string;
  stand: string;
  monitor: string;
  owner: string;
  status: string;
  notes: string;
}

interface LegacyAudioPatchItem {
  id: string;
  channel: string;
  source: string;
  type: string;
  console: string;
  stagebox: string;
  input: string;
  phantom: string;
  gain: string;
  destination: string;
  monitor: string;
  status: string;
  notes: string;
}

interface LegacyLineCheckItem {
  id: string;
  channel: string;
  source: string;
  type: string;
  location: string;
  tech: string;
  console: string;
  input: string;
  destination: string;
  talkback: string;
  status: string;
  problem: string;
  notes: string;
}

export interface LegacyInputListState {
  key: typeof LEGACY_AUDIO_KEYS.inputList;
  meta: LegacyMeta;
  rows: LegacyInputRow[];
}

export interface LegacyAudioPatchState {
  key: typeof LEGACY_AUDIO_KEYS.audioPatch;
  meta: LegacyMeta;
  items: LegacyAudioPatchItem[];
}

export interface LegacyLineCheckState {
  key: typeof LEGACY_AUDIO_KEYS.lineCheck;
  meta: LegacyMeta;
  items: LegacyLineCheckItem[];
}

export interface LegacyAudioBundle {
  inputList?: LegacyInputListState;
  audioPatch?: LegacyAudioPatchState;
  lineCheck?: LegacyLineCheckState;
}

export interface LegacyStorageReader {
  getItem(key: string): string | null;
}

export interface LegacyAudioImportSummary {
  importedKeys: LegacyAudioKey[];
  skippedKeys: LegacyAudioKey[];
  signalSources: number;
  patchRecords: number;
  lineChecks: number;
}

export interface LegacyAudioImportResult {
  workbook: AvWorkbook;
  summary: LegacyAudioImportSummary;
}

const LEGACY_SOURCE_PREFIXES = ["legacy-input-", "legacy-audio-source-", "legacy-line-source-"];
const LEGACY_PATCH_PREFIXES = ["legacy-patch-", "legacy-input-patch-", "legacy-line-patch-"];
const LEGACY_LINE_CHECK_PREFIXES = ["legacy-linecheck-"];
const LEGACY_AUDIT_PREFIX = "legacy-audio-import-";

function isRecord(value: unknown): value is PlainRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, max = 160): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function readField(record: PlainRecord, key: string, max = 160): string {
  return cleanText(record[key], max);
}

function readMeta(value: unknown): LegacyMeta {
  const metaRecord = isRecord(value) ? value : {};
  const meta: LegacyMeta = {};
  (["showName", "venueName", "venue", "showDate", "engineerName", "consoleName", "client", "a1", "leadTech", "handoffTo"] as const).forEach((key) => {
    const next = readField(metaRecord, key, key === "showDate" ? 20 : 120);
    if (next) meta[key] = next;
  });
  return meta;
}

function parseStoredState(storage: LegacyStorageReader, key: LegacyAudioKey): PlainRecord | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeInputRow(value: unknown, index: number): LegacyInputRow {
  const row = isRecord(value) ? value : {};
  return {
    id: readField(row, "id", 80),
    channel: readField(row, "ch", 24) || String(index + 1),
    source: readField(row, "source", 100),
    type: readField(row, "type", 40),
    patch: readField(row, "patch", 100),
    conn: readField(row, "conn", 40),
    phantom: readField(row, "phantom", 20),
    stand: readField(row, "stand", 80),
    monitor: readField(row, "monitor", 100),
    owner: readField(row, "owner", 80),
    status: readField(row, "status", 40),
    notes: readField(row, "notes", 240)
  };
}

function normalizeAudioPatchItem(value: unknown, index: number): LegacyAudioPatchItem {
  const item = isRecord(value) ? value : {};
  return {
    id: readField(item, "id", 80),
    channel: readField(item, "channel", 24) || String(index + 1),
    source: readField(item, "source", 100),
    type: readField(item, "type", 40),
    console: readField(item, "console", 100),
    stagebox: readField(item, "stagebox", 100),
    input: readField(item, "input", 80),
    phantom: readField(item, "phantom", 20),
    gain: readField(item, "gain", 40),
    destination: readField(item, "destination", 120),
    monitor: readField(item, "monitor", 120),
    status: readField(item, "status", 40),
    notes: readField(item, "notes", 240)
  };
}

function normalizeLineCheckItem(value: unknown, index: number): LegacyLineCheckItem {
  const item = isRecord(value) ? value : {};
  return {
    id: readField(item, "id", 80),
    channel: readField(item, "channel", 24) || String(index + 1),
    source: readField(item, "source", 100),
    type: readField(item, "type", 40),
    location: readField(item, "location", 100),
    tech: readField(item, "tech", 80),
    console: readField(item, "console", 100),
    input: readField(item, "input", 100),
    destination: readField(item, "destination", 120),
    talkback: readField(item, "talkback", 160),
    status: readField(item, "status", 40),
    problem: readField(item, "problem", 160),
    notes: readField(item, "notes", 240)
  };
}

export function readLegacyAudioBundle(storage: LegacyStorageReader): LegacyAudioBundle {
  const bundle: LegacyAudioBundle = {};
  const inputList = parseStoredState(storage, LEGACY_AUDIO_KEYS.inputList);
  if (inputList && Array.isArray(inputList.rows)) {
    bundle.inputList = {
      key: LEGACY_AUDIO_KEYS.inputList,
      meta: readMeta(inputList.meta),
      rows: inputList.rows.map(normalizeInputRow).filter((row) => row.source || row.patch || row.notes)
    };
  }

  const audioPatch = parseStoredState(storage, LEGACY_AUDIO_KEYS.audioPatch);
  if (audioPatch && Array.isArray(audioPatch.items)) {
    bundle.audioPatch = {
      key: LEGACY_AUDIO_KEYS.audioPatch,
      meta: readMeta(audioPatch.meta),
      items: audioPatch.items.map(normalizeAudioPatchItem).filter((item) => item.source || item.console || item.stagebox || item.destination)
    };
  }

  const lineCheck = parseStoredState(storage, LEGACY_AUDIO_KEYS.lineCheck);
  if (lineCheck && Array.isArray(lineCheck.items)) {
    bundle.lineCheck = {
      key: LEGACY_AUDIO_KEYS.lineCheck,
      meta: readMeta(lineCheck.meta),
      items: lineCheck.items.map(normalizeLineCheckItem).filter((item) => item.source || item.console || item.input || item.problem || item.notes)
    };
  }

  return bundle;
}

function hasPrefix(id: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => id.startsWith(prefix));
}

function isSampleWorkbook(workbook: AvWorkbook): boolean {
  return workbook.workbookId === "wb-demo-corporate-keynote" && workbook.show.showId === "show-corporate-keynote";
}

function hasLegacyData(bundle: LegacyAudioBundle): boolean {
  return !!(bundle.inputList?.rows.length || bundle.audioPatch?.items.length || bundle.lineCheck?.items.length);
}

function importedKeys(bundle: LegacyAudioBundle): LegacyAudioKey[] {
  const keys: LegacyAudioKey[] = [];
  if (bundle.inputList?.rows.length) keys.push(LEGACY_AUDIO_KEYS.inputList);
  if (bundle.audioPatch?.items.length) keys.push(LEGACY_AUDIO_KEYS.audioPatch);
  if (bundle.lineCheck?.items.length) keys.push(LEGACY_AUDIO_KEYS.lineCheck);
  return keys;
}

function skippedKeys(bundle: LegacyAudioBundle): LegacyAudioKey[] {
  const imported = new Set(importedKeys(bundle));
  return Object.values(LEGACY_AUDIO_KEYS).filter((key) => !imported.has(key));
}

function slug(value: string, fallback: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return cleaned || fallback;
}

function uniqueId(prefix: string, value: string, fallback: string, used: Set<string>): string {
  const base = `${prefix}-${slug(value, fallback)}`;
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function lookupKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function sourceLookupKeys(source: string, channel: string): string[] {
  const sourceKey = lookupKey(source);
  const channelKey = lookupKey(channel);
  return [
    sourceKey ? `source:${sourceKey}` : "",
    sourceKey && channelKey ? `source:${sourceKey}|channel:${channelKey}` : ""
  ].filter(Boolean);
}

function patchLookupKeys(source: string, channel: string, consoleLabel: string, input: string): string[] {
  const sourceKey = lookupKey(source);
  const channelKey = lookupKey(channel);
  const consoleKey = lookupKey(consoleLabel);
  const inputKey = lookupKey(input);
  if (sourceKey) {
    return [
      channelKey ? `source:${sourceKey}|channel:${channelKey}` : "",
      consoleKey ? `source:${sourceKey}|console:${consoleKey}` : "",
      `source:${sourceKey}`
    ].filter(Boolean);
  }
  return [
    channelKey && consoleKey ? `channel:${channelKey}|console:${consoleKey}` : "",
    channelKey && inputKey ? `channel:${channelKey}|input:${inputKey}` : "",
    channelKey ? `channel:${channelKey}` : ""
  ].filter(Boolean);
}

function setIfAbsent(map: Map<string, string>, keys: string[], id: string): void {
  keys.forEach((key) => {
    if (key && !map.has(key)) map.set(key, id);
  });
}

function firstFromMeta(metas: LegacyMeta[], keys: LegacyMetaKey[]): string {
  for (const meta of metas) {
    for (const key of keys) {
      const value = meta[key];
      if (value) return value;
    }
  }
  return "";
}

function mapSourceType(value: string): SourceType {
  const type = lookupKey(value);
  if (/(wireless|lav|handheld|podium|vocal|audience|mic|microphone)/.test(type)) return "mic";
  if (/(di|line|instrument|guitar|keyboard|bass)/.test(type)) return "line";
  if (/(playback|media|laptop|computer|music)/.test(type)) return "playback";
  if (/(comm|comms|intercom|ifb|program feed)/.test(type)) return "comms";
  if (/(stream|record|program)/.test(type)) return "stream";
  if (/(camera|video)/.test(type)) return "camera";
  return "other";
}

function mapInputStatus(value: string): WorkbookStatus {
  switch (lookupKey(value)) {
    case "checked":
      return "line_check_verified";
    case "patched":
      return "ready_for_review";
    case "problem":
      return "issue";
    case "open":
    default:
      return "draft";
  }
}

function mapPatchStatus(value: string): WorkbookStatus {
  switch (lookupKey(value)) {
    case "ready":
      return "ready_for_show";
    case "linecheck":
    case "line check":
      return "line_check_verified";
    case "gained":
    case "patched":
      return "ready_for_review";
    case "issue":
      return "issue";
    case "spare":
      return "archived";
    case "planned":
    default:
      return "draft";
  }
}

function mapLinePatchStatus(value: string, hasProblem: boolean): WorkbookStatus {
  if (hasProblem) return "issue";
  switch (lookupKey(value)) {
    case "passed":
    case "checked":
      return "line_check_verified";
    case "patched":
      return "ready_for_review";
    case "issue":
      return "issue";
    case "muted":
    case "spare":
      return "archived";
    case "pending":
    default:
      return "draft";
  }
}

function mapLineResult(status: string, problem: string): LineCheck["result"] {
  if (problem || lookupKey(status) === "issue") return "issue";
  if (["passed", "checked"].includes(lookupKey(status))) return "passed";
  return "unchecked";
}

function isAffirmative(value: string): boolean {
  return /^(yes|on|true|1|48v)$/i.test(value.trim());
}

function joinParts(parts: string[], separator = " / "): string {
  return parts.map((part) => cleanText(part)).filter(Boolean).join(separator);
}

function targetFrom(consoleLabel: string, destination: string, fallback: string): string {
  const route = joinParts([consoleLabel, destination], " -> ");
  return route || destination || fallback;
}

function composeLineNotes(item: LegacyLineCheckItem): string {
  return joinParts([
    item.problem ? `Problem: ${item.problem}` : "",
    item.destination ? `Destination: ${item.destination}` : "",
    item.talkback ? `Talkback: ${item.talkback}` : "",
    item.location ? `Location: ${item.location}` : "",
    item.notes
  ], " | ");
}

function nextShowProfile(workbook: AvWorkbook, bundle: LegacyAudioBundle): AvWorkbook["show"] {
  if (!isSampleWorkbook(workbook)) return workbook.show;
  const metas = [bundle.inputList?.meta, bundle.audioPatch?.meta, bundle.lineCheck?.meta].filter(Boolean) as LegacyMeta[];
  const showName = firstFromMeta(metas, ["showName"]) || workbook.show.showName;
  const venue = firstFromMeta(metas, ["venueName", "venue"]) || workbook.show.venue;
  const targetDate = firstFromMeta(metas, ["showDate"]) || workbook.show.targetDate;
  return {
    ...workbook.show,
    showName,
    venue,
    targetDate
  };
}

export function mergeLegacyAudioIntoWorkbook(workbook: AvWorkbook, bundle: LegacyAudioBundle): LegacyAudioImportResult {
  const keys = importedKeys(bundle);
  const emptySummary: LegacyAudioImportSummary = {
    importedKeys: keys,
    skippedKeys: skippedKeys(bundle),
    signalSources: 0,
    patchRecords: 0,
    lineChecks: 0
  };
  if (!hasLegacyData(bundle)) return { workbook, summary: emptySummary };

  const replaceSampleAudio = isSampleWorkbook(workbook);
  const keptSignalSources = replaceSampleAudio ? [] : workbook.signalSources.filter((source) => !hasPrefix(source.id, LEGACY_SOURCE_PREFIXES));
  const keptPatchRecords = replaceSampleAudio ? [] : workbook.patchRecords.filter((record) => !hasPrefix(record.id, LEGACY_PATCH_PREFIXES));
  const keptLineChecks = replaceSampleAudio ? [] : workbook.lineChecks.filter((check) => !hasPrefix(check.id, LEGACY_LINE_CHECK_PREFIXES));
  const keptAuditEvents = workbook.auditEvents.filter((event) => !event.id.startsWith(LEGACY_AUDIT_PREFIX));

  const signalSources: SignalSource[] = [...keptSignalSources];
  const patchRecords: PatchRecord[] = [...keptPatchRecords];
  const lineChecks: LineCheck[] = [...keptLineChecks];

  const sourceIds = new Set(signalSources.map((source) => source.id));
  const patchIds = new Set(patchRecords.map((record) => record.id));
  const lineCheckIds = new Set(lineChecks.map((check) => check.id));
  const sourceByLookup = new Map<string, string>();
  const patchByLookup = new Map<string, string>();

  signalSources.forEach((source) => {
    setIfAbsent(sourceByLookup, sourceLookupKeys(source.label, ""), source.id);
  });
  patchRecords.forEach((record) => {
    const source = signalSources.find((item) => item.id === record.signalSourceId);
    setIfAbsent(patchByLookup, patchLookupKeys(source?.label ?? "", record.channel, record.console, record.stagebox), record.id);
  });

  function findSourceId(source: string, channel: string): string | undefined {
    return sourceLookupKeys(source, channel).map((key) => sourceByLookup.get(key)).find(Boolean);
  }

  function findPatchId(source: string, channel: string, consoleLabel: string, input: string): string | undefined {
    return patchLookupKeys(source, channel, consoleLabel, input).map((key) => patchByLookup.get(key)).find(Boolean);
  }

  function ensureSource(input: {
    idPrefix: string;
    idValue: string;
    fallback: string;
    label: string;
    channel: string;
    type: string;
    ownerRole: string;
    phantom?: boolean;
    status: WorkbookStatus;
  }): string {
    const label = input.label || `Channel ${input.channel || input.fallback}`;
    const existing = findSourceId(label, input.channel);
    if (existing) return existing;
    const id = uniqueId(input.idPrefix, input.idValue || `${input.channel}-${label}`, input.fallback, sourceIds);
    const source: SignalSource = {
      id,
      label,
      sourceType: mapSourceType(input.type),
      status: input.status,
      ...(input.ownerRole ? { ownerRole: input.ownerRole } : {}),
      ...(input.phantom !== undefined ? { phantomRequired: input.phantom } : {})
    };
    signalSources.push(source);
    setIfAbsent(sourceByLookup, sourceLookupKeys(label, input.channel), id);
    return id;
  }

  function addPatch(input: {
    idPrefix: string;
    idValue: string;
    fallback: string;
    sourceId: string;
    sourceLabel: string;
    channel: string;
    console: string;
    stagebox: string;
    input: string;
    target: string;
    ownerRole: string;
    status: WorkbookStatus;
  }): string {
    const existing = findPatchId(input.sourceLabel, input.channel, input.console, input.input);
    if (existing) return existing;
    const id = uniqueId(input.idPrefix, input.idValue || `${input.channel}-${input.sourceLabel}`, input.fallback, patchIds);
    const record: PatchRecord = {
      id,
      signalSourceId: input.sourceId,
      console: input.console,
      channel: input.channel,
      stagebox: input.stagebox,
      target: input.target,
      status: input.status,
      ...(input.ownerRole ? { ownerRole: input.ownerRole } : {})
    };
    patchRecords.push(record);
    setIfAbsent(patchByLookup, patchLookupKeys(input.sourceLabel, input.channel, input.console, input.input || input.stagebox), id);
    return id;
  }

  bundle.inputList?.rows.forEach((row, index) => {
    ensureSource({
      idPrefix: "legacy-input",
      idValue: row.id || `${row.channel}-${row.source}`,
      fallback: `input-${index + 1}`,
      label: row.source,
      channel: row.channel,
      type: row.type,
      ownerRole: row.owner,
      phantom: row.phantom ? isAffirmative(row.phantom) : undefined,
      status: mapInputStatus(row.status)
    });
  });

  bundle.audioPatch?.items.forEach((item, index) => {
    const ownerRole = item.notes.match(/\bA[12]\b/i)?.[0] || bundle.audioPatch?.meta.a1 || "";
    const sourceId = ensureSource({
      idPrefix: "legacy-audio-source",
      idValue: item.id || `${item.channel}-${item.source}`,
      fallback: `audio-source-${index + 1}`,
      label: item.source,
      channel: item.channel,
      type: item.type,
      ownerRole,
      phantom: item.phantom ? isAffirmative(item.phantom) : undefined,
      status: mapPatchStatus(item.status)
    });
    const sourceLabel = signalSources.find((source) => source.id === sourceId)?.label ?? item.source;
    const consoleName = bundle.audioPatch?.meta.consoleName || item.console;
    addPatch({
      idPrefix: "legacy-patch",
      idValue: item.id || `${item.channel}-${item.source}`,
      fallback: `patch-${index + 1}`,
      sourceId,
      sourceLabel,
      channel: item.channel,
      console: consoleName,
      stagebox: joinParts([item.stagebox, item.input]),
      input: item.input,
      target: targetFrom(item.console, item.destination, item.monitor || `Ch ${item.channel}`),
      ownerRole: bundle.audioPatch?.meta.a1 || ownerRole,
      status: mapPatchStatus(item.status)
    });
  });

  bundle.inputList?.rows.forEach((row, index) => {
    if (!row.patch && !["patched", "checked", "problem"].includes(lookupKey(row.status))) return;
    const sourceId = ensureSource({
      idPrefix: "legacy-input",
      idValue: row.id || `${row.channel}-${row.source}`,
      fallback: `input-${index + 1}`,
      label: row.source,
      channel: row.channel,
      type: row.type,
      ownerRole: row.owner,
      phantom: row.phantom ? isAffirmative(row.phantom) : undefined,
      status: mapInputStatus(row.status)
    });
    const sourceLabel = signalSources.find((source) => source.id === sourceId)?.label ?? row.source;
    addPatch({
      idPrefix: "legacy-input-patch",
      idValue: row.id || `${row.channel}-${row.source}`,
      fallback: `input-patch-${index + 1}`,
      sourceId,
      sourceLabel,
      channel: row.channel,
      console: bundle.inputList?.meta.consoleName ?? "",
      stagebox: row.patch,
      input: row.patch,
      target: targetFrom(row.patch, row.monitor, row.conn || `Input list Ch ${row.channel}`),
      ownerRole: row.owner || bundle.inputList?.meta.engineerName || "",
      status: mapInputStatus(row.status)
    });
  });

  bundle.lineCheck?.items.forEach((item, index) => {
    const hasProblem = !!item.problem || lookupKey(item.status) === "issue";
    const sourceId = ensureSource({
      idPrefix: "legacy-line-source",
      idValue: item.id || `${item.channel}-${item.source}`,
      fallback: `line-source-${index + 1}`,
      label: item.source,
      channel: item.channel,
      type: item.type,
      ownerRole: item.tech || bundle.lineCheck?.meta.leadTech || "",
      status: mapLinePatchStatus(item.status, hasProblem)
    });
    const sourceLabel = signalSources.find((source) => source.id === sourceId)?.label ?? item.source;
    const existingPatch = findPatchId(sourceLabel, item.channel, item.console, item.input);
    const patchRecordId = existingPatch ?? addPatch({
      idPrefix: "legacy-line-patch",
      idValue: item.id || `${item.channel}-${item.source}`,
      fallback: `line-patch-${index + 1}`,
      sourceId,
      sourceLabel,
      channel: item.channel,
      console: item.console || bundle.lineCheck?.meta.a1 || "",
      stagebox: item.input,
      input: item.input,
      target: targetFrom(item.console, item.destination, `Line check Ch ${item.channel}`),
      ownerRole: item.tech || bundle.lineCheck?.meta.leadTech || "",
      status: mapLinePatchStatus(item.status, hasProblem)
    });
    const result = mapLineResult(item.status, item.problem);
    const checkedAt = result === "unchecked" ? "" : bundle.lineCheck?.meta.showDate || bundle.audioPatch?.meta.showDate || bundle.inputList?.meta.showDate || "";
    const id = uniqueId("legacy-linecheck", item.id || `${item.channel}-${item.source}`, `linecheck-${index + 1}`, lineCheckIds);
    const check: LineCheck = {
      id,
      patchRecordId,
      result,
      ...(item.tech || bundle.lineCheck?.meta.leadTech ? { checkedBy: item.tech || bundle.lineCheck?.meta.leadTech } : {}),
      ...(checkedAt ? { checkedAt } : {}),
      ...(composeLineNotes(item) ? { notes: composeLineNotes(item) } : {})
    };
    lineChecks.push(check);
  });

  const importedSourceCount = signalSources.filter((source) => hasPrefix(source.id, LEGACY_SOURCE_PREFIXES)).length;
  const importedPatchCount = patchRecords.filter((record) => hasPrefix(record.id, LEGACY_PATCH_PREFIXES)).length;
  const importedLineCheckCount = lineChecks.filter((check) => hasPrefix(check.id, LEGACY_LINE_CHECK_PREFIXES)).length;
  const now = new Date().toISOString();
  const next: AvWorkbook = {
    ...workbook,
    savedAt: now,
    show: nextShowProfile(workbook, bundle),
    signalSources,
    patchRecords,
    lineChecks,
    auditEvents: [
      ...keptAuditEvents,
      {
        id: `${LEGACY_AUDIT_PREFIX}${keys.map((key) => key.replace(/[^a-z0-9]+/g, "-")).join("-")}`,
        entityType: "workbook",
        entityId: workbook.workbookId,
        action: "legacy_audio_imported",
        operatorInitials: "SBD",
        createdAt: now,
        summary: `Imported ${importedSourceCount} signal sources, ${importedPatchCount} patch records, and ${importedLineCheckCount} line checks from ${keys.join(", ")}.`
      }
    ]
  };

  return {
    workbook: next,
    summary: {
      importedKeys: keys,
      skippedKeys: skippedKeys(bundle),
      signalSources: importedSourceCount,
      patchRecords: importedPatchCount,
      lineChecks: importedLineCheckCount
    }
  };
}
