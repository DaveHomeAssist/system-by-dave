import { z } from "zod";

const statusSchema = z.enum([
  "draft",
  "ready_for_review",
  "ready_for_show",
  "line_check_verified",
  "signed_off",
  "issue",
  "archived"
]);

export const avWorkbookSchema = z.object({
  schema: z.literal("system-by-dave.av-workbook.v1"),
  workbookId: z.string().min(1),
  savedAt: z.string().min(1),
  show: z.object({
    showId: z.string().min(1),
    showName: z.string().min(1),
    targetDate: z.string().min(1),
    venue: z.string(),
    globalStatus: statusSchema,
    masterTimecodeFormat: z.enum(["24", "25", "29.97_NDF", "29.97_DF", "30"])
  }),
  operators: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    department: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    callTime: z.string().optional(),
    status: statusSchema
  })),
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    area: z.string(),
    ownerRole: z.string(),
    readiness: statusSchema,
    priority: z.enum(["low", "normal", "high"]),
    blocker: z.string().optional()
  })),
  hardware: z.array(z.object({
    id: z.string(),
    label: z.string(),
    category: z.string(),
    department: z.string(),
    caseId: z.string().optional(),
    ownerRole: z.string().optional(),
    status: statusSchema
  })),
  signalSources: z.array(z.object({
    id: z.string(),
    label: z.string(),
    sourceType: z.enum(["mic", "line", "playback", "comms", "stream", "camera", "other"]),
    roomId: z.string().optional(),
    ownerRole: z.string().optional(),
    phantomRequired: z.boolean().optional(),
    status: statusSchema
  })),
  patchRecords: z.array(z.object({
    id: z.string(),
    signalSourceId: z.string(),
    console: z.string(),
    channel: z.string(),
    stagebox: z.string(),
    target: z.string(),
    splitAllowed: z.boolean().optional(),
    ownerRole: z.string().optional(),
    status: statusSchema
  })),
  lineChecks: z.array(z.object({
    id: z.string(),
    patchRecordId: z.string(),
    checkedBy: z.string().optional(),
    checkedAt: z.string().optional(),
    result: z.enum(["unchecked", "passed", "issue"]),
    notes: z.string().optional()
  })),
  videoRoutes: z.array(z.object({
    id: z.string(),
    source: z.string(),
    processor: z.string(),
    destination: z.string(),
    resolution: z.string(),
    frameRate: z.string(),
    converter: z.string().optional(),
    backup: z.string().optional(),
    status: statusSchema
  })),
  powerCircuits: z.array(z.object({
    id: z.string(),
    label: z.string(),
    source: z.string(),
    phase: z.enum(["A", "B", "C", "single"]),
    breakerAmps: z.number(),
    estimatedAmps: z.number(),
    roomId: z.string().optional(),
    backup: z.string().optional(),
    status: statusSchema
  })),
  rfChannels: z.array(z.object({
    id: z.string(),
    label: z.string(),
    band: z.string(),
    frequencyMhz: z.number(),
    role: z.enum(["mic", "iem", "ifb", "comms"]),
    roomId: z.string().optional(),
    scanned: z.boolean(),
    backupFrequencyMhz: z.number().optional(),
    status: statusSchema
  })),
  gearManifest: z.array(z.object({
    id: z.string(),
    hardwareId: z.string(),
    caseId: z.string(),
    quantity: z.number(),
    roomId: z.string().optional(),
    truckZone: z.string().optional(),
    loadOrder: z.number().optional(),
    weightLbs: z.number().optional(),
    status: statusSchema
  })),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    ownerRole: z.string(),
    roomId: z.string().optional(),
    due: z.string().optional(),
    sourceTool: z.string().optional(),
    status: statusSchema,
    blocker: z.string().optional()
  })),
  auditEvents: z.array(z.object({
    id: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    action: z.string(),
    operatorInitials: z.string(),
    createdAt: z.string(),
    summary: z.string()
  }))
});
