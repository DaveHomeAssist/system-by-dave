export type Kind = 'power' | 'network' | 'cable';
export type RecordRow = {
  id: string; type: Kind; name: string; status: string;
  location?: string; issue?: string; capacity?: string; draw?: string;
  ip?: string; vlan?: string; source?: string; destination?: string;
  sourceRecord?: Record<string, unknown>;
  [field: string]: unknown;
};
export type InfrastructurePlan = { schema: string; name: string; records: RecordRow[]; legacySources: unknown[]; [field: string]: unknown };
export const KEY: string;
export const SCHEMA: string;
export const TYPES: Record<Kind, { title: string; legacy: string; field: string; label: string; status: string[] }>;
export function blank(): InfrastructurePlan;
export function validPlan(value: unknown): InfrastructurePlan;
export function legacyPreview(value: unknown): {kind: Kind; records: RecordRow[]; original: unknown};
export function mergeLegacy(plan: InfrastructurePlan, preview: ReturnType<typeof legacyPreview>): InfrastructurePlan;
export function issueFor(row: RecordRow): string;
export function counts(rows: RecordRow[]): {total: number; issues: number; ready: number};
