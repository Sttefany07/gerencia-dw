import { NormalizedRecord, ValidationWarning } from "../types";
import { createId } from "./ids";
import { roundNumber } from "./format";

type HeaderField =
  | "taskId"
  | "taskName"
  | "parentId"
  | "taskType"
  | "pais"
  | "cliente"
  | "proyecto"
  | "consultor"
  | "perfil"
  | "hitoFacturable"
  | "horasEstimadas"
  | "horasRegistradas"
  | "horasFacturables"
  | "fechaInicio"
  | "fechaFin";

const aliases: Record<HeaderField, string[]> = {
  taskId: ["task id", "id tarea", "taskid"],
  taskName: ["task name", "nombre tarea", "tarea", "name"],
  parentId: ["parent id", "id padre", "parentid"],
  taskType: ["task type", "tipo tarea", "tipo de tarea"],
  pais: ["país", "pais", "país drop down", "pais drop down", "country"],
  cliente: ["cliente", "cliente drop down", "client", "customer"],
  proyecto: ["proyecto", "proyecto drop down", "project"],
  consultor: ["assignee", "persona", "consultor", "responsable", "colaborador"],
  perfil: ["rol", "rol drop down", "perfil", "seniority", "rol estimado", "rol estimado drop down"],
  hitoFacturable: ["hito facturable", "hitos facturable", "hitos facturables", "hito", "milestone"],
  // IMPORTANTE: no incluir columnas Rolled Up. Solo horas propias de la fila/tarea.
  horasEstimadas: ["time estimate", "horas estimadas", "hh estimadas", "horas planificadas"],
  horasRegistradas: ["time logged", "horas registradas", "hh registradas", "horas ejecutadas", "horas reales"],
  horasFacturables: ["horas facturables", "horas facturables number", "hh facturables", "horas a facturar"],
  fechaInicio: ["fecha inicio", "inicio", "start date", "fecha de inicio"],
  fechaFin: ["due date", "fecha fin", "fin", "end date", "fecha de fin"]
};

export function normalizeExcelRows(rows: Record<string, unknown>[]) {
  const warnings: ValidationWarning[] = [];
  if (!rows.length) return { records: [], warnings };

  const headerMap = buildHeaderMap(rows[0] ?? {});
  const required: HeaderField[] = ["consultor", "pais", "cliente", "proyecto", "perfil", "horasEstimadas", "horasRegistradas", "fechaFin"];

  required.forEach((field) => {
    if (!headerMap[field]) {
      warnings.push({ id: createId("warn"), severity: "error", message: `Falta columna obligatoria o equivalente: ${label(field)}.` });
    }
  });

  const selected = selectAssignedLeafRows(rows, headerMap);
  if (selected.excluded > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      message: "Regla aplicada: solo se suman tareas finales con persona asignada. Se excluyeron tareas padre/control, proyectos, filas sin responsable y columnas Roll Up.",
      count: selected.excluded
    });
  }

  let invalidNumbers = 0;
  const records = selected.rows.map((row, index): NormalizedRecord => {
    const horasEstimadas = parseNumber(value(row, headerMap.horasEstimadas));
    const horasRegistradas = parseNumber(value(row, headerMap.horasRegistradas));
    const horasFacturables = parseNumber(value(row, headerMap.horasFacturables));
    if (horasEstimadas.invalid) invalidNumbers += 1;
    if (horasRegistradas.invalid) invalidNumbers += 1;
    if (horasFacturables.invalid) invalidNumbers += 1;

    const fechaFin = parseDateToIso(value(row, headerMap.fechaFin));
    const fechaInicio = parseDateToIso(value(row, headerMap.fechaInicio)) || fechaFin;

    return {
      id: createId(`row_${index + 1}`),
      taskId: cleanText(value(row, headerMap.taskId)),
      taskName: cleanText(value(row, headerMap.taskName)),
      parentId: cleanText(value(row, headerMap.parentId)),
      pais: normalizeText(value(row, headerMap.pais)),
      cliente: normalizeText(value(row, headerMap.cliente)),
      proyecto: normalizeText(value(row, headerMap.proyecto)),
      consultor: normalizeText(value(row, headerMap.consultor)),
      perfil: normalizeText(value(row, headerMap.perfil)),
      hitoFacturable: cleanText(value(row, headerMap.hitoFacturable)) || "No aplica",
      horasEstimadas: horasEstimadas.value,
      horasRegistradas: horasRegistradas.value,
      horasFacturables: horasFacturables.value,
      fechaInicio,
      fechaFin,
      raw: row
    };
  });

  if (invalidNumbers > 0) {
    warnings.push({ id: createId("warn"), severity: "warning", message: "Algunos valores de horas no eran numéricos y se convirtieron en 0.", count: invalidNumbers });
  }

  return { records, warnings };
}

function buildHeaderMap(sample: Record<string, unknown>) {
  const headers = Object.keys(sample);
  const normalized = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const map: Partial<Record<HeaderField, string>> = {};

  (Object.keys(aliases) as HeaderField[]).forEach((field) => {
    const normalizedAliases = aliases[field].map(normalizeHeader);

    const exact = normalized.find((header) => normalizedAliases.includes(header.normalized));
    if (exact) {
      map[field] = exact.original;
      return;
    }

    // Para horas no hacemos match flexible, para evitar capturar Time Estimate Rolled Up.
    if (["horasEstimadas", "horasRegistradas"].includes(field)) return;

    const loose = normalized.find((header) => normalizedAliases.some((alias) => header.normalized.includes(alias) || alias.includes(header.normalized)));
    if (loose) map[field] = loose.original;
  });

  return map;
}

function selectAssignedLeafRows(rows: Record<string, unknown>[], headerMap: Partial<Record<HeaderField, string>>) {
  const assigneeKey = headerMap.consultor;
  const taskIdKey = headerMap.taskId;
  const parentIdKey = headerMap.parentId;
  const taskTypeKey = headerMap.taskType;

  let excluded = 0;
  if (!assigneeKey) return { rows: [] as Record<string, unknown>[], excluded: rows.length };

  const parentIds = new Set<string>();
  if (parentIdKey) {
    rows.forEach((row) => {
      const parentId = cleanText(row[parentIdKey]);
      if (parentId && !isMetadataValue(parentId)) parentIds.add(parentId);
    });
  }

  const selectedRows = rows.filter((row) => {
    const assignee = cleanText(row[assigneeKey]);
    if (!hasRealAssignee(assignee)) {
      excluded += 1;
      return false;
    }

    const taskType = normalizeHeader(taskTypeKey ? cleanText(row[taskTypeKey]) : "");
    if (taskType === "proyecto" || taskType === "project") {
      excluded += 1;
      return false;
    }

    const taskId = taskIdKey ? cleanText(row[taskIdKey]) : "";
    if (taskId && parentIds.has(taskId)) {
      excluded += 1;
      return false;
    }

    return true;
  });

  return { rows: selectedRows, excluded };
}

function value(row: Record<string, unknown>, key?: string) {
  return key ? row[key] : "";
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeText(value: unknown) {
  return cleanText(value) || "No definido";
}

function hasRealAssignee(value: string) {
  const cleaned = cleanText(value);
  if (!cleaned) return false;
  const normalized = normalizeHeader(cleaned);
  return !["assignee", "persona", "consultor", "responsable", "no definido", "unassigned", "sin asignar", "none", "null"].includes(normalized);
}

function isMetadataValue(value: string) {
  const normalized = normalizeHeader(value);
  return normalized.includes("drop down") || ["task id", "parent id", "task type", "assignee", "persona", "rol"].includes(normalized);
}

function parseNumber(value: unknown): { value: number; invalid: boolean } {
  if (value === null || value === undefined || value === "") return { value: 0, invalid: false };
  if (typeof value === "number") return { value: Number.isFinite(value) ? roundNumber(value, 2) : 0, invalid: !Number.isFinite(value) };

  const raw = String(value).trim();
  if (!raw) return { value: 0, invalid: false };

  const duration = parseDurationToHours(raw);
  if (duration !== null) return { value: roundNumber(duration, 2), invalid: false };

  let cleaned = raw.replace(/[^\d,.-]/g, "");
  const commas = (cleaned.match(/,/g) ?? []).length;
  const dots = (cleaned.match(/\./g) ?? []).length;
  if (commas > 0 && dots > 0) {
    cleaned = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (commas > 0) {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? { value: roundNumber(parsed, 2), invalid: false } : { value: 0, invalid: true };
}

function parseDurationToHours(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, ".");
  const hasUnit = /\b\d+(?:\.\d+)?\s*(h|hr|hrs|hora|horas|m|min|s|seg|secs|segundos)\b/.test(normalized);
  if (!hasUnit) return null;
  return (
    sumDuration(normalized, /([+-]?\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hora|horas)\b/g, 1) +
    sumDuration(normalized, /([+-]?\d+(?:\.\d+)?)\s*(?:m|min|minuto|minutos)\b/g, 60) +
    sumDuration(normalized, /([+-]?\d+(?:\.\d+)?)\s*(?:s|seg|secs|segundo|segundos)\b/g, 3600)
  );
}

function sumDuration(value: string, regex: RegExp, divisor: number) {
  let total = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) total += parsed / divisor;
  }
  return total;
}

function parseDateToIso(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 86400000).toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(Date.UTC(year, month, day));
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function label(field: HeaderField) {
  const labels: Record<HeaderField, string> = {
    taskId: "Task ID",
    taskName: "Task Name",
    parentId: "Parent ID",
    taskType: "Task Type",
    pais: "País",
    cliente: "Cliente",
    proyecto: "Proyecto",
    consultor: "Consultor / Assignee",
    perfil: "Perfil / Rol",
    hitoFacturable: "Hito facturable",
    horasEstimadas: "Time Estimate",
    horasRegistradas: "Time Logged",
    horasFacturables: "Horas facturables",
    fechaInicio: "Fecha inicio",
    fechaFin: "Fecha fin / Due Date"
  };
  return labels[field];
}
