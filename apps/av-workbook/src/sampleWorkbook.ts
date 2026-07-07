import type { AvWorkbook } from "./types";

const today = new Date().toISOString().slice(0, 10);

export function createSampleWorkbook(): AvWorkbook {
  return {
    schema: "system-by-dave.av-workbook.v1",
    workbookId: "wb-demo-corporate-keynote",
    savedAt: new Date().toISOString(),
    show: {
      showId: "show-corporate-keynote",
      showName: "Corporate Keynote Workbook",
      targetDate: today,
      venue: "Grand Ballroom",
      globalStatus: "ready_for_review",
      masterTimecodeFormat: "29.97_NDF"
    },
    operators: [
      { id: "op-a1", name: "Avery Chen", role: "A1", department: "Audio", phone: "555-0101", callTime: "08:00", status: "ready_for_show" },
      { id: "op-v1", name: "Mara Singh", role: "V1", department: "Video", phone: "555-0102", callTime: "08:00", status: "ready_for_review" },
      { id: "op-lead", name: "Jordan Miles", role: "Crew Lead", department: "Logistics", phone: "555-0103", callTime: "07:00", status: "draft" }
    ],
    rooms: [
      { id: "room-main", name: "Grand Ballroom", area: "Main", ownerRole: "Lead Tech", readiness: "ready_for_review", priority: "high" },
      { id: "room-201", name: "Breakout 201", area: "Breakout", ownerRole: "Room Tech", readiness: "issue", priority: "high", blocker: "Network drop not labeled" },
      { id: "room-green", name: "Green Room", area: "Backstage", ownerRole: "Producer", readiness: "draft", priority: "normal" }
    ],
    hardware: [
      { id: "hw-console", label: "FOH console", category: "Audio console", department: "Audio", caseId: "A-FOH", ownerRole: "A1", status: "ready_for_review" },
      { id: "hw-switcher", label: "Main video switcher", category: "Switcher", department: "Video", caseId: "V-SW1", ownerRole: "V1", status: "ready_for_review" },
      { id: "hw-rf", label: "Wireless rack", category: "RF", department: "Comms", caseId: "RF-01", ownerRole: "A2", status: "draft" }
    ],
    signalSources: [
      { id: "src-lav-1", label: "CEO lav", sourceType: "mic", roomId: "room-main", ownerRole: "A1", phantomRequired: false, status: "ready_for_review" },
      { id: "src-playback", label: "Playback laptop 1", sourceType: "playback", roomId: "room-main", ownerRole: "Playback", status: "ready_for_review" },
      { id: "src-lectern", label: "Lectern mic", sourceType: "mic", roomId: "room-main", ownerRole: "A1", phantomRequired: true, status: "draft" }
    ],
    patchRecords: [
      { id: "patch-1", signalSourceId: "src-lav-1", console: "QL5", channel: "1", stagebox: "A1", target: "FOH Ch 1", ownerRole: "A1", status: "ready_for_review" },
      { id: "patch-2", signalSourceId: "src-playback", console: "QL5", channel: "9/10", stagebox: "FOH", target: "FOH Ch 9/10", ownerRole: "Playback", status: "ready_for_review" },
      { id: "patch-3", signalSourceId: "src-lectern", console: "QL5", channel: "2", stagebox: "A2", target: "FOH Ch 1", ownerRole: "A1", status: "draft" }
    ],
    lineChecks: [
      { id: "lc-1", patchRecordId: "patch-1", checkedBy: "AC", checkedAt: today, result: "passed" },
      { id: "lc-2", patchRecordId: "patch-2", checkedBy: "AC", checkedAt: today, result: "passed" },
      { id: "lc-3", patchRecordId: "patch-3", result: "unchecked", notes: "Lectern not placed yet" }
    ],
    videoRoutes: [
      { id: "vid-1", source: "Playback laptop 1", processor: "Switcher IN 4", destination: "Main LED", resolution: "1920x1080", frameRate: "59.94", backup: "Playback laptop 2", status: "ready_for_review" },
      { id: "vid-2", source: "Camera 1", processor: "Switcher IN 1", destination: "Stream encoder", resolution: "1080p", frameRate: "59.94", status: "draft" }
    ],
    powerCircuits: [
      { id: "pwr-foh", label: "FOH audio rack", source: "FOH wall A1", phase: "single", breakerAmps: 20, estimatedAmps: 12, roomId: "room-main", backup: "UPS-FOH", status: "ready_for_review" },
      { id: "pwr-led", label: "Main LED wall", source: "Distro leg A", phase: "A", breakerAmps: 60, estimatedAmps: 51, roomId: "room-main", status: "issue" }
    ],
    rfChannels: [
      { id: "rf-ceo", label: "CEO lav", band: "G50", frequencyMhz: 542.125, role: "mic", roomId: "room-main", scanned: true, backupFrequencyMhz: 543.4, status: "ready_for_review" },
      { id: "rf-host", label: "Host handheld", band: "G50", frequencyMhz: 542.25, role: "mic", roomId: "room-main", scanned: false, status: "draft" }
    ],
    gearManifest: [
      { id: "gear-console", hardwareId: "hw-console", caseId: "A-FOH", quantity: 1, roomId: "room-main", truckZone: "A", loadOrder: 4, weightLbs: 180, status: "ready_for_review" },
      { id: "gear-switcher", hardwareId: "hw-switcher", caseId: "V-SW1", quantity: 1, roomId: "room-main", truckZone: "B", loadOrder: 6, weightLbs: 90, status: "ready_for_review" },
      { id: "gear-rf", hardwareId: "hw-rf", caseId: "RF-01", quantity: 1, roomId: "room-main", truckZone: "A", loadOrder: 8, weightLbs: 70, status: "draft" }
    ],
    tasks: [
      { id: "task-room-201-net", title: "Confirm Breakout 201 network drop", ownerRole: "IT", roomId: "room-201", due: "10:30", sourceTool: "room-check", status: "issue", blocker: "Drop label missing" },
      { id: "task-lectern", title: "Place and line check lectern mic", ownerRole: "A1", roomId: "room-main", due: "11:00", sourceTool: "line-check", status: "draft" }
    ],
    auditEvents: [
      { id: "audit-1", entityType: "workbook", entityId: "wb-demo-corporate-keynote", action: "created", operatorInitials: "DR", createdAt: new Date().toISOString(), summary: "Seeded AV workbook demo." }
    ]
  };
}
