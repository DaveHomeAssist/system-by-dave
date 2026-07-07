import type { GridColumn } from "./grid";
import type { Operator, Room, WorkbookStatus } from "./types";

export const statusOptions: WorkbookStatus[] = [
  "draft",
  "ready_for_review",
  "ready_for_show",
  "line_check_verified",
  "signed_off",
  "issue",
  "archived"
];

export const crewColumns: GridColumn<Operator>[] = [
  { key: "name", label: "Name", width: "210px" },
  { key: "role", label: "Role", width: "150px" },
  { key: "department", label: "Department", width: "160px" },
  { key: "phone", label: "Phone", width: "150px" },
  { key: "email", label: "Email", width: "220px" },
  { key: "callTime", label: "Call Time", width: "130px" },
  { key: "status", label: "Status", width: "190px", options: statusOptions }
];

export const roomColumns: GridColumn<Room>[] = [
  { key: "name", label: "Room", width: "220px" },
  { key: "area", label: "Area", width: "160px" },
  { key: "ownerRole", label: "Owner Role", width: "170px" },
  { key: "readiness", label: "Readiness", width: "190px", options: statusOptions },
  { key: "priority", label: "Priority", width: "140px", options: ["low", "normal", "high"] },
  { key: "blocker", label: "Blocker", width: "260px" }
];

export function createCrewRow(): Operator {
  return {
    id: `op-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    name: "",
    role: "",
    department: "",
    phone: "",
    email: "",
    callTime: "",
    status: "draft"
  };
}

export function createRoomRow(): Room {
  return {
    id: `room-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    name: "",
    area: "",
    ownerRole: "",
    readiness: "draft",
    priority: "normal",
    blocker: ""
  };
}
