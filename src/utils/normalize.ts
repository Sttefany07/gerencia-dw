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
  | "horasEstimadas"
  | "horasRegistradas"
  | "progreso"
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
  // IMPORTANTE: no incluir columnas Rolled Up. Solo horas propias de la fila/tarea.
  horasEstimadas: ["time estimate", "horas estimadas", "hh estimadas", "horas planificadas"],
  horasRegistradas: ["time logged", "horas registradas", "hh registradas", "horas ejecutadas", "horas reales"],
  progreso: ["progreso", "progreso number", "progress", "avance"],
  fechaInicio: ["fecha inicio", "inicio", "start date", "fecha de inicio"],
  fechaFin: ["due date", "fecha fin", "fin", "end date", "fecha de fin"]
};

export function normalizeExcelRows(rows: Record<string, unknown>[]) {
  const warnings: ValidationWarning[] = [];
  if (!rows.length) return { records: [], warnings };

  const headerMap = buildHeaderMap(rows[0] ?? {});
  const required: HeaderField[] = ["consultor", "pais", "cliente", "proyecto", "perfil", "horasRegistradas", "fechaFin"];

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
  const projectProgress = buildProjectProgress(rows, headerMap);
  let splitAssignments = 0;
  const records = selected.rows.flatMap((row, index): NormalizedRecord[] => {
    const horasEstimadas = parseNumber(value(row, headerMap.horasEstimadas));
    const horasRegistradas = parseNumber(value(row, headerMap.horasRegistradas));
    if (horasEstimadas.invalid) invalidNumbers += 1;
    if (horasRegistradas.invalid) invalidNumbers += 1;

    const fechaFin = parseDateToIso(value(row, headerMap.fechaFin));
    const fechaInicio = parseDateToIso(value(row, headerMap.fechaInicio)) || fechaFin;
    const consultants = splitConsultants(value(row, headerMap.consultor));
    if (consultants.length > 1) splitAssignments += consultants.length - 1;
    const pais = normalizeText(value(row, headerMap.pais));
    const cliente = normalizeText(value(row, headerMap.cliente));
    const proyecto = normalizeText(value(row, headerMap.proyecto));

    return consultants.map((consultor, consultantIndex) => ({
      id: createId(`row_${index + 1}_${consultantIndex + 1}`),
      taskId: cleanText(value(row, headerMap.taskId)),
      taskName: cleanText(value(row, headerMap.taskName)),
      parentId: cleanText(value(row, headerMap.parentId)),
      pais,
      cliente,
      proyecto,
      consultor,
      perfil: normalizeProfileName(value(row, headerMap.perfil)),
      horasEstimadas: horasEstimadas.value,
      horasRegistradas: horasRegistradas.value,
      progreso: projectProgress.get(projectKey(pais, cliente, proyecto)) ?? normalizeProgress(parseNumber(value(row, headerMap.progreso)).value),
      fechaInicio,
      fechaFin,
      raw: row
    }));
  });

  if (invalidNumbers > 0) {
    warnings.push({ id: createId("warn"), severity: "warning", message: "Algunos valores de horas no eran numéricos y se convirtieron en 0.", count: invalidNumbers });
  }
  if (splitAssignments > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      message: "Se separaron tareas con múltiples consultores. Cada consultor conserva las mismas horas de la tarea.",
      count: splitAssignments
    });
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

function buildProjectProgress(rows: Record<string, unknown>[], headerMap: Partial<Record<HeaderField, string>>) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const pais = normalizeText(value(row, headerMap.pais));
    const cliente = normalizeText(value(row, headerMap.cliente));
    const proyecto = normalizeText(value(row, headerMap.proyecto));
    const progress = normalizeProgress(parseNumber(value(row, headerMap.progreso)).value);
    if (progress > 0) map.set(projectKey(pais, cliente, proyecto), progress);
  });
  return map;
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 1 ? value / 100 : value;
}

function projectKey(pais: string, cliente: string, proyecto: string) {
  return [pais, cliente, proyecto].map((part) => normalizeHeader(part)).join("__");
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

function normalizeProfileName(value: unknown) {
  const text = cleanText(value);
  const normalized = normalizeHeader(text);
  if (normalized === "semi senior" || normalized === "semisenior") return "Semi senior";
  if (normalized === "arquitecto") return "Arquitecto";
  if (normalized === "senior") return "Senior";
  if (normalized === "gerencia") return "Gerencia";
  if (normalized === "junior") return "Junior";
  if (normalized === "lead") return "Lead";
  return text || "No definido";
}

function splitConsultants(value: unknown) {
  const raw = cleanText(value);
  if (!raw) return ["No definido"];
  const parts = raw
    .split(/\s*(?:,|;|\n|\r)\s*/g)
    .map((item) => cleanText(item))
    .filter((item) => item && hasRealAssignee(item));
  const unique = Array.from(new Set(parts));
  return unique.length ? unique : ["No definido"];
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
    horasEstimadas: "Time Estimate",
    horasRegistradas: "Time Logged",
    progreso: "Progreso",
    fechaInicio: "Fecha inicio",
    fechaFin: "Fecha fin / Due Date"
  };
  return labels[field];
}
