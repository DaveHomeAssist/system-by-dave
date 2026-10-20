import { z } from "zod";

/* Design contract only. Application entry points must not import this module
   until AVV-STREAM-KEY-1 and the dependent implementation brief are resolved. */
export const streamFields = ["encoder", "type", "platform", "destination", "server", "keyLabel", "input", "resolution", "bitrate", "audio", "record", "backup", "status", "notes"] as const;
export const recordFields = ["record", "source", "type", "format", "resolution", "audio", "media", "status", "duration", "backup", "notes"] as const;
export const streamStatuses = ["planned", "configured", "sending", "tested", "ready", "issue", "backup"] as const;
export const recordStatuses = ["armed", "rolling", "stopped", "issue", "delivered"] as const;
export const streamTypes = ["primary", "backup", "record", "simulcast", "social", "monitor", "archive", "other"] as const;
export const recordTypes = ["program", "iso", "slides", "audio", "stream", "backup", "other"] as const;

const text = z.string();
export const streamRowSchema = z.object({
  id: text, origin: text, routeId: text,
  encoder: text, type: text, platform: text, destination: text, server: text,
  keyLabel: text, input: text, resolution: text, bitrate: text, audio: text,
  record: text, backup: text, status: text, notes: text,
}).strict();
export const recordRowSchema = z.object({
  id: text, origin: text, routeId: text,
  record: text, source: text, type: text, format: text, resolution: text,
  audio: text, media: text, status: text, duration: text, backup: text, notes: text,
}).strict();

export type StreamRow = z.infer<typeof streamRowSchema>;
export type RecordRow = z.infer<typeof recordRowSchema>;

// Text shape is deliberately separate from credential eligibility. Neither
// schema approves a candidate for import, persistence, export or recovery.
export type LegacyStreamFixture = {
  schema?: "system-by-dave.stream-plan.v1";
  exportedAt?: string;
  meta: Record<string, string>;
  items: (Pick<StreamRow, typeof streamFields[number]> & { id: string; [key: string]: unknown })[];
};
export type LegacyRecordFixture = {
  schema?: "system-by-dave.record-log.v1";
  exportedAt?: string;
  meta: Record<string, string>;
  records: (Pick<RecordRow, typeof recordFields[number]> & { id: string; [key: string]: unknown })[];
};
