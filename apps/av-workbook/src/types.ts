export type WorkbookStatus =
  | "draft"
  | "ready_for_review"
  | "ready_for_show"
  | "line_check_verified"
  | "signed_off"
  | "issue"
  | "archived";

export type IssueSeverity = "red" | "yellow" | "green";

export interface RegistryTool {
  id: string;
  name: string;
  href: string;
  dept: string;
  phases: string[];
  tag: string;
  desc: string;
}

export interface RegistryPhase {
  id: string;
  label: string;
}

export interface SbdRegistry {
  version: string;
  phases: RegistryPhase[];
  tools: RegistryTool[];
  recommended: Record<string, string[]>;
}

export interface ShowProfile {
  showId: string;
  showName: string;
  targetDate: string;
  venue: string;
  globalStatus: WorkbookStatus;
  masterTimecodeFormat: "24" | "25" | "29.97_NDF" | "29.97_DF" | "30";
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  department: string;
  phone?: string;
  email?: string;
  callTime?: string;
  status: WorkbookStatus;
}

export interface Room {
  id: string;
  name: string;
  area: string;
  ownerRole: string;
  readiness: WorkbookStatus;
  priority: "low" | "normal" | "high";
  blocker?: string;
}

export interface Hardware {
  id: string;
  label: string;
  category: string;
  department: string;
  caseId?: string;
  ownerRole?: string;
  status: WorkbookStatus;
}

export interface SignalSource {
  id: string;
  label: string;
  sourceType: "mic" | "line" | "playback" | "comms" | "stream" | "camera" | "other";
  roomId?: string;
  ownerRole?: string;
  phantomRequired?: boolean;
  status: WorkbookStatus;
}

export interface PatchRecord {
  id: string;
  signalSourceId: string;
  console: string;
  channel: string;
  stagebox: string;
  target: string;
  splitAllowed?: boolean;
  ownerRole?: string;
  status: WorkbookStatus;
}

export interface LineCheck {
  id: string;
  patchRecordId: string;
  checkedBy?: string;
  checkedAt?: string;
  result: "unchecked" | "passed" | "issue";
  notes?: string;
}

export interface PowerCircuit {
  id: string;
  label: string;
  source: string;
  phase: "A" | "B" | "C" | "single";
  breakerAmps: number;
  estimatedAmps: number;
  roomId?: string;
  backup?: string;
  status: WorkbookStatus;
}

export interface RfChannel {
  id: string;
  label: string;
  band: string;
  frequencyMhz: number;
  role: "mic" | "iem" | "ifb" | "comms";
  roomId?: string;
  scanned: boolean;
  backupFrequencyMhz?: number;
  status: WorkbookStatus;
}

export interface VideoRoute {
  id: string;
  source: string;
  processor: string;
  destination: string;
  resolution: string;
  frameRate: string;
  converter?: string;
  backup?: string;
  status: WorkbookStatus;
}

export interface GearManifestItem {
  id: string;
  hardwareId: string;
  caseId: string;
  quantity: number;
  roomId?: string;
  truckZone?: string;
  loadOrder?: number;
  weightLbs?: number;
  status: WorkbookStatus;
}

export interface Task {
  id: string;
  title: string;
  ownerRole: string;
  roomId?: string;
  due?: string;
  sourceTool?: string;
  status: WorkbookStatus;
  blocker?: string;
}

export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  operatorInitials: string;
  createdAt: string;
  summary: string;
}

export interface WorkbookIssue {
  id: string;
  severity: IssueSeverity;
  category: "audio" | "rf" | "power" | "video" | "logistics" | "rooms" | "closeout";
  entityType: string;
  entityId: string;
  message: string;
  ownerRole?: string;
  createdAt: string;
}

export interface AvWorkbook {
  schema: "system-by-dave.av-workbook.v1";
  workbookId: string;
  savedAt: string;
  show: ShowProfile;
  operators: Operator[];
  rooms: Room[];
  hardware: Hardware[];
  signalSources: SignalSource[];
  patchRecords: PatchRecord[];
  lineChecks: LineCheck[];
  videoRoutes: VideoRoute[];
  powerCircuits: PowerCircuit[];
  rfChannels: RfChannel[];
  gearManifest: GearManifestItem[];
  tasks: Task[];
  auditEvents: AuditEvent[];
}
