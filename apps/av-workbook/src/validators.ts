import type { AvWorkbook, WorkbookIssue } from "./types";

function issue(input: Omit<WorkbookIssue, "id" | "createdAt">): WorkbookIssue {
  return {
    ...input,
    id: `${input.category}-${input.entityType}-${input.entityId}-${input.message}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    createdAt: new Date().toISOString()
  };
}

export function validateAudio(workbook: AvWorkbook): WorkbookIssue[] {
  const issues: WorkbookIssue[] = [];
  const sources = new Map(workbook.signalSources.map((source) => [source.id, source]));
  const targetMap = new Map<string, string[]>();
  workbook.patchRecords.forEach((record) => {
    if (record.target) targetMap.set(record.target, [...(targetMap.get(record.target) ?? []), record.id]);
    if (!record.ownerRole) {
      issues.push(issue({
        severity: "yellow",
        category: "audio",
        entityType: "patchRecord",
        entityId: record.id,
        message: `${record.channel} has no owner role.`,
        ownerRole: "A1"
      }));
    }
    const source = sources.get(record.signalSourceId);
    const lineCheck = workbook.lineChecks.find((check) => check.patchRecordId === record.id);
    if (!lineCheck || lineCheck.result === "unchecked") {
      issues.push(issue({
        severity: "yellow",
        category: "audio",
        entityType: "lineCheck",
        entityId: record.id,
        message: `${source?.label ?? record.channel} is not line checked.`,
        ownerRole: record.ownerRole || "A1"
      }));
    }
    if (lineCheck?.result === "issue") {
      issues.push(issue({
        severity: "red",
        category: "audio",
        entityType: "lineCheck",
        entityId: lineCheck.id,
        message: `${source?.label ?? record.channel} has a line check issue.`,
        ownerRole: record.ownerRole || "A1"
      }));
    }
    if (source?.phantomRequired && !record.stagebox) {
      issues.push(issue({
        severity: "yellow",
        category: "audio",
        entityType: "patchRecord",
        entityId: record.id,
        message: `${source.label} needs phantom power but no stagebox is assigned.`,
        ownerRole: record.ownerRole || "A1"
      }));
    }
  });

  targetMap.forEach((ids, target) => {
    if (ids.length < 2) return;
    const unsafe = ids.some((id) => !workbook.patchRecords.find((record) => record.id === id)?.splitAllowed);
    if (unsafe) {
      issues.push(issue({
        severity: "red",
        category: "audio",
        entityType: "patchRecord",
        entityId: ids.join("_"),
        message: `${target} is assigned to multiple hard targets without an explicit split.`,
        ownerRole: "A1"
      }));
    }
  });
  return issues;
}

export function validatePower(workbook: AvWorkbook): WorkbookIssue[] {
  return workbook.powerCircuits.flatMap((circuit) => {
    const load = circuit.breakerAmps > 0 ? circuit.estimatedAmps / circuit.breakerAmps : 1;
    const issues: WorkbookIssue[] = [];
    if (load > 0.8) {
      issues.push(issue({
        severity: "red",
        category: "power",
        entityType: "powerCircuit",
        entityId: circuit.id,
        message: `${circuit.label} is above 80 percent breaker load.`,
        ownerRole: "Power"
      }));
    } else if (load > 0.75) {
      issues.push(issue({
        severity: "yellow",
        category: "power",
        entityType: "powerCircuit",
        entityId: circuit.id,
        message: `${circuit.label} is above 75 percent breaker load.`,
        ownerRole: "Power"
      }));
    }
    if (!circuit.backup) {
      issues.push(issue({
        severity: "yellow",
        category: "power",
        entityType: "powerCircuit",
        entityId: circuit.id,
        message: `${circuit.label} has no backup power note.`,
        ownerRole: "Power"
      }));
    }
    return issues;
  });
}

export function validateRf(workbook: AvWorkbook): WorkbookIssue[] {
  const issues: WorkbookIssue[] = [];
  workbook.rfChannels.forEach((channel, index) => {
    if (!channel.scanned) {
      issues.push(issue({
        severity: "yellow",
        category: "rf",
        entityType: "rfChannel",
        entityId: channel.id,
        message: `${channel.label} is not scan verified.`,
        ownerRole: "A2"
      }));
    }
    if (!channel.backupFrequencyMhz) {
      issues.push(issue({
        severity: "yellow",
        category: "rf",
        entityType: "rfChannel",
        entityId: channel.id,
        message: `${channel.label} has no backup frequency.`,
        ownerRole: "A2"
      }));
    }
    workbook.rfChannels.slice(index + 1).forEach((other) => {
      const separation = Math.abs(channel.frequencyMhz - other.frequencyMhz);
      if (separation === 0) {
        issues.push(issue({
          severity: "red",
          category: "rf",
          entityType: "rfChannel",
          entityId: `${channel.id}_${other.id}`,
          message: `${channel.label} and ${other.label} share ${channel.frequencyMhz} MHz.`,
          ownerRole: "A2"
        }));
      } else if (separation < 0.25) {
        issues.push(issue({
          severity: "red",
          category: "rf",
          entityType: "rfChannel",
          entityId: `${channel.id}_${other.id}`,
          message: `${channel.label} and ${other.label} are inside the 0.25 MHz guard band.`,
          ownerRole: "A2"
        }));
      }
    });
  });
  return issues;
}

export function validateVideo(workbook: AvWorkbook): WorkbookIssue[] {
  return workbook.videoRoutes.flatMap((route) => {
    const issues: WorkbookIssue[] = [];
    if (!route.backup) {
      issues.push(issue({
        severity: "yellow",
        category: "video",
        entityType: "videoRoute",
        entityId: route.id,
        message: `${route.source} to ${route.destination} has no backup route.`,
        ownerRole: "V1"
      }));
    }
    if (/4k|2160/i.test(route.resolution) && !route.converter) {
      issues.push(issue({
        severity: "yellow",
        category: "video",
        entityType: "videoRoute",
        entityId: route.id,
        message: `${route.destination} may need a scaler/converter for ${route.resolution}.`,
        ownerRole: "V1"
      }));
    }
    return issues;
  });
}

export function validateLogistics(workbook: AvWorkbook): WorkbookIssue[] {
  const issues: WorkbookIssue[] = [];
  const zoneWeights = new Map<string, number>();
  workbook.gearManifest.forEach((item) => {
    if (!item.roomId) {
      issues.push(issue({
        severity: "yellow",
        category: "logistics",
        entityType: "gearManifest",
        entityId: item.id,
        message: `${item.caseId} has no destination room.`,
        ownerRole: "Crew Lead"
      }));
    }
    if (!item.truckZone) {
      issues.push(issue({
        severity: "yellow",
        category: "logistics",
        entityType: "gearManifest",
        entityId: item.id,
        message: `${item.caseId} has no truck zone.`,
        ownerRole: "Crew Lead"
      }));
    }
    if (item.truckZone) zoneWeights.set(item.truckZone, (zoneWeights.get(item.truckZone) ?? 0) + (item.weightLbs ?? 0));
  });
  zoneWeights.forEach((weight, zone) => {
    if (weight > 240) {
      issues.push(issue({
        severity: "red",
        category: "logistics",
        entityType: "truckZone",
        entityId: zone,
        message: `Truck zone ${zone} is over the 240 lb planning threshold.`,
        ownerRole: "Crew Lead"
      }));
    }
  });
  return issues;
}

export function validateWorkbookIssues(workbook: AvWorkbook): WorkbookIssue[] {
  return [
    ...validateAudio(workbook),
    ...validatePower(workbook),
    ...validateRf(workbook),
    ...validateVideo(workbook),
    ...validateLogistics(workbook)
  ];
}
