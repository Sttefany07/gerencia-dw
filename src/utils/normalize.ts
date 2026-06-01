import { NormalizedRecord, ValidationWarning } from "../types";
import { createId } from "./ids";
import { roundNumber } from "./format";

const columnAliases: Record<keyof Omit<NormalizedRecord, "id" | "raw">, string[]> = {
  pais: ["pais", "país", "país drop down", "country", "region", "territorio"],
  cliente: ["cliente", "cliente drop down", "client", "customer", "cuenta"],
  proyecto: ["proyecto", "proyecto drop down", "project", "nombre proyecto", "proyecto nombre"],
  hitoFacturable: [
    "hito facturable",
    "hitos facturable",
    "hitos facturables",
    "hito",
    "milestone",
    "entregable",
    "etapa facturable"
  ],
  rolEstimado: [
    "rol estimado",
    "rol estimado drop down",
    "rol planificado",
    "perfil estimado",
    "rol presupuesto",
    "estimated role",
    "role estimated"
  ],
  rolAsignado: ["rol asignado", "rol", "rol drop down", "perfil", "rol ejecutor", "role", "assigned role", "cargo"],
  persona: ["assignee", "persona", "consultor", "colaborador", "recurso", "nombre", "empleado", "responsable"],
  horasEstimadas: [
    "time estimate",
    "horas estimadas",
    "time estimate rolled up",
    "horas estimadas acumuladas",
    "hh estimadas",
    "horas planificadas",
    "horas presupuesto",
    "estimated hours",
    "time estimate"
  ],
  horasRegistradas: [
    "time logged",
    "horas registradas",
    "time logged rolled up",
    "horas registradas acumuladas",
    "hh registradas",
    "horas ejecutadas",
    "hh ejecutadas",
    "horas reales",
    "registered hours",
    "time logged"
  ],
  horasFacturables: ["horas facturables", "horas facturables number", "hh facturables", "horas a facturar", "billable hours"],
  fechaInicio: ["fecha inicio", "inicio", "fecha inicial", "start date", "fecha de inicio"],
  fechaFin: ["fecha fin", "fin", "fecha final", "end date", "fecha de fin", "due date"]
};

const requiredColumns: Array<keyof Omit<NormalizedRecord, "id" | "raw">> = [
  "pais",
  "cliente",
  "proyecto",
  "rolAsignado",
  "horasEstimadas",
  "horasRegistradas",
  "horasFacturables",
  "fechaFin"
];

export function normalizeExcelRows(rows: Record<string, unknown>[]) {
  const warnings: ValidationWarning[] = [];
  const headerMap = buildHeaderMap(rows[0] ?? {});
  const rowsToNormalize = getAtomicAssignedRows(rows, headerMap);

  if (!headerMap.fechaInicio && headerMap.fechaFin) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      type: "date",
      message: "No se encontró Fecha inicio; se usará Fecha fin/Due Date como fecha de referencia para habilitar los filtros por rango."
    });
  }

  for (const field of requiredColumns) {
    if (!headerMap[field]) {
      warnings.push({
        id: createId("warn"),
        severity: "error",
        type: "missing-column",
        message: `Falta la columna obligatoria o equivalente: ${prettyField(field)}.`
      });
    }
  }

  let nonNumericCount = 0;
  let replacedHitoCount = 0;
  let replacedTextCount = 0;
  let invalidDateCount = 0;
  let multiPersonActivityCount = 0;
  let addedPersonRowsCount = 0;

  const normalized = rowsToNormalize.flatMap((row, index): NormalizedRecord[] => {
    const hitoRaw = getValue(row, headerMap.hitoFacturable);
    const hito = cleanText(hitoRaw);
    if (!hito) replacedHitoCount += 1;

    const pais = normalizeImportantText(getValue(row, headerMap.pais));
    const cliente = normalizeImportantText(getValue(row, headerMap.cliente));
    const proyecto = normalizeImportantText(getValue(row, headerMap.proyecto));
    const rolEstimado = normalizeImportantText(getValue(row, headerMap.rolEstimado));
    const rolAsignado = normalizeImportantText(getValue(row, headerMap.rolAsignado));
    const personaBase = normalizeImportantText(getValue(row, headerMap.persona));
    const personas = splitPeople(personaBase);

    if (personas.length > 1) {
      multiPersonActivityCount += 1;
      addedPersonRowsCount += personas.length - 1;
    }

    [pais, cliente, proyecto, rolEstimado, rolAsignado, personaBase].forEach((value) => {
      if (value === "No definido") replacedTextCount += 1;
    });

    const horasEstimadas = parseNumber(getValue(row, headerMap.horasEstimadas));
    const horasRegistradas = parseNumber(getValue(row, headerMap.horasRegistradas));
    const horasFacturables = parseNumber(getValue(row, headerMap.horasFacturables));

    if (horasEstimadas.invalid) nonNumericCount += 1;
    if (horasRegistradas.invalid) nonNumericCount += 1;
    if (horasFacturables.invalid) nonNumericCount += 1;

    const fechaFin = parseDateToIso(getValue(row, headerMap.fechaFin));
    const fechaInicio = parseDateToIso(getValue(row, headerMap.fechaInicio)) || fechaFin;
    if (headerMap.fechaInicio && !fechaInicio) invalidDateCount += 1;
    if (headerMap.fechaFin && !fechaFin) invalidDateCount += 1;

    return personas.map((persona, personaIndex) => ({
      id: createId(`row_${index + 1}_${personaIndex + 1}`),
      pais,
      cliente,
      proyecto,
      hitoFacturable: hito || "No aplica",
      rolEstimado,
      rolAsignado,
      persona,
      horasEstimadas: horasEstimadas.value,
      horasRegistradas: horasRegistradas.value,
      horasFacturables: horasFacturables.value,
      fechaInicio: fechaInicio || "",
      fechaFin: fechaFin || "",
      raw: row
    }));
  });

  if (replacedHitoCount > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      type: "default",
      message: `Se reemplazaron hitos facturables vacíos por “No aplica”.`,
      count: replacedHitoCount
    });
  }

  if (replacedTextCount > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      type: "default",
      message: `Se reemplazaron campos de texto vacíos por “No definido”.`,
      count: replacedTextCount
    });
  }

  if (multiPersonActivityCount > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      type: "default",
      message: `Se detectaron actividades con más de una persona. Cada persona recibió las mismas horas de la actividad.`,
      count: addedPersonRowsCount
    });
  }

  if (nonNumericCount > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "warning",
      type: "numeric",
      message: `Se encontraron valores no numéricos en campos de horas. Fueron convertidos a 0 para no romper los cálculos.`,
      count: nonNumericCount
    });
  }

  // Las fechas inválidas se dejan vacías, pero no se muestran como alerta.
  // En los Excel de ClickUp suelen existir filas padre o campos de rango que no deben contaminar la carga ejecutiva.
  void invalidDateCount;

  return { records: normalized, warnings };
}

function buildHeaderMap(sample: Record<string, unknown>) {
  const headers = Object.keys(sample);
  const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const map: Partial<Record<keyof Omit<NormalizedRecord, "id" | "raw">, string>> = {};

  Object.entries(columnAliases).forEach(([field, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);

    for (const alias of normalizedAliases) {
      const exactMatch = normalizedHeaders.find((header) => header.normalized === alias);
      if (exactMatch) {
        map[field as keyof Omit<NormalizedRecord, "id" | "raw">] = exactMatch.original;
        return;
      }
    }

    for (const alias of normalizedAliases) {
      const looseMatch = normalizedHeaders.find(
        (header) => header.normalized.includes(alias) || alias.includes(header.normalized)
      );
      if (looseMatch) {
        map[field as keyof Omit<NormalizedRecord, "id" | "raw">] = looseMatch.original;
        return;
      }
    }
  });

  return map;
}

function getAtomicAssignedRows(
  rows: Record<string, unknown>[],
  headerMap: Partial<Record<keyof Omit<NormalizedRecord, "id" | "raw">, string>>
) {
  if (!rows.length) return rows;

  const sample = rows[0] ?? {};
  const taskIdKey = findColumn(sample, ["task id", "id tarea", "taskid"]);
  const parentIdKey = findColumn(sample, ["parent id", "id padre", "parentid"]);
  const taskTypeKey = findColumn(sample, ["task type", "tipo tarea", "tipo de tarea"]);
  const assigneeKey = headerMap.persona;

  if (!taskIdKey || !parentIdKey || !assigneeKey) return rows;

  const parentIds = new Set(
    rows
      .map((row) => cleanText(row[parentIdKey]))
      .filter((value) => value && !isMetadataValue(value))
  );

  const atomicRows = rows.filter((row) => {
    const taskId = cleanText(row[taskIdKey]);
    const taskType = cleanText(taskTypeKey ? row[taskTypeKey] : "");
    const assignee = cleanText(row[assigneeKey]);

    const isParentTask = taskId ? parentIds.has(taskId) : false;
    const isProjectRow = normalizeHeader(taskType) === "proyecto" || normalizeHeader(taskType) === "project";
    const hasAssignee = Boolean(assignee) && !isMetadataValue(assignee);

    return hasAssignee && !isParentTask && !isProjectRow;
  });

  return atomicRows.length ? atomicRows : rows;
}

function findColumn(sample: Record<string, unknown>, aliases: string[]) {
  const headers = Object.keys(sample).map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const normalizedAliases = aliases.map(normalizeHeader);

  return headers.find((header) => normalizedAliases.includes(header.normalized))?.original;
}

function isMetadataValue(value: string) {
  const normalized = normalizeHeader(value);
  return (
    normalized.endsWith("drop down") ||
    normalized.includes("drop down") ||
    normalized === "assignee" ||
    normalized === "persona" ||
    normalized === "task id" ||
    normalized === "parent id" ||
    normalized === "task type"
  );
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

function prettyField(field: string) {
  const labels: Record<string, string> = {
    pais: "País",
    cliente: "Cliente",
    proyecto: "Proyecto",
    hitoFacturable: "Hito facturable",
    rolEstimado: "Rol estimado",
    rolAsignado: "Rol asignado",
    persona: "Persona",
    horasEstimadas: "Horas estimadas",
    horasRegistradas: "Horas registradas",
    horasFacturables: "Horas facturables",
    fechaInicio: "Fecha inicio",
    fechaFin: "Fecha fin"
  };
  return labels[field] ?? field;
}

function getValue(row: Record<string, unknown>, key?: string) {
  if (!key) return "";
  return row[key];
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeImportantText(value: unknown) {
  const cleaned = cleanText(value);
  return cleaned || "No definido";
}

function splitPeople(value: string) {
  if (!value || value === "No definido") return ["No definido"];

  const parts = value
    .replace(/\s+(?:y|and)\s+/gi, ";")
    .split(/\s*(?:;|\||\n|\r|,)\s*/g)
    .map((item) => cleanText(item))
    .filter(Boolean);

  const uniquePeople = Array.from(new Set(parts));
  return uniquePeople.length ? uniquePeople : ["No definido"];
}

function parseNumber(value: unknown): { value: number; invalid: boolean } {
  if (value === null || value === undefined || value === "") return { value: 0, invalid: false };
  if (typeof value === "number") return { value: Number.isFinite(value) ? roundNumber(value, 2) : 0, invalid: !Number.isFinite(value) };

  const original = String(value).trim();
  if (!original) return { value: 0, invalid: false };

  const durationValue = parseDurationToHours(original);
  if (durationValue !== null) return { value: roundNumber(durationValue, 2), invalid: false };

  let cleaned = original.replace(/[^\d,.-]/g, "");
  const commaCount = (cleaned.match(/,/g) ?? []).length;
  const dotCount = (cleaned.match(/\./g) ?? []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number(cleaned);
  if (Number.isFinite(parsed)) return { value: roundNumber(parsed, 2), invalid: false };
  return { value: 0, invalid: true };
}

function parseDurationToHours(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, ".");
  const hasDurationUnit = /\b\d+(?:\.\d+)?\s*(h|hr|hrs|hora|horas|m|min|s|seg|secs|segundos)\b/.test(normalized);
  if (!hasDurationUnit) return null;

  const hours = sumDurationUnit(normalized, /([+-]?\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hora|horas)\b/g, 1);
  const minutes = sumDurationUnit(normalized, /([+-]?\d+(?:\.\d+)?)\s*(?:m|min|minuto|minutos)\b/g, 60);
  const seconds = sumDurationUnit(normalized, /([+-]?\d+(?:\.\d+)?)\s*(?:s|seg|secs|segundo|segundos)\b/g, 3600);

  return hours + minutes + seconds;
}

function sumDurationUnit(value: string, regex: RegExp, divisor: number) {
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

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]) - 1;
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}
