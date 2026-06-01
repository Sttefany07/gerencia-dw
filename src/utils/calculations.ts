import {
  CommercialRate,
  ComputedRow,
  ConsultantSummaryRow,
  CurrencyCode,
  FilterState,
  NormalizedRecord,
  OperationRate,
  SummaryRow,
  ValidationWarning
} from "../types";
import { createId } from "./ids";
import { roundNumber } from "./format";

export const emptyFilters: FilterState = {
  pais: "",
  cliente: "",
  proyecto: "",
  hitoFacturable: "",
  fechaInicio: "",
  fechaFin: ""
};

export function roleForOperations(row: NormalizedRecord) {
  return row.rolAsignado !== "No definido" ? row.rolAsignado : row.rolEstimado;
}

export function roleForCommercial(row: NormalizedRecord) {
  return row.rolEstimado !== "No definido" ? row.rolEstimado : roleForOperations(row);
}

export function ensureRatesForRecords(
  records: NormalizedRecord[],
  operationRates: OperationRate[],
  commercialRates: CommercialRate[]
) {
  const today = new Date().toISOString().slice(0, 10);
  const cleanOperationRates = sanitizeOperationRates(operationRates);
  const cleanCommercialRates = sanitizeCommercialRates(commercialRates);
  const opKeys = new Set(cleanOperationRates.map((rate) => rate.role.toLowerCase().trim()));
  const nextOperationRates = [...cleanOperationRates];

  records.forEach((row) => {
    const role = roleForOperations(row);
    const key = role.toLowerCase().trim();
    if (isValidRole(role) && !opKeys.has(key)) {
      opKeys.add(key);
      nextOperationRates.push({
        id: createId("op_rate"),
        role,
        rate: 0,
        currency: "USD",
        updatedAt: today,
        status: "Activo"
      });
    }
  });

  const commercialKeys = new Set(cleanCommercialRates.map(commercialKey));
  const nextCommercialRates = [...cleanCommercialRates];

  records.forEach((row) => {
    const role = roleForCommercial(row);
    const item: CommercialRate & { currency: CurrencyCode } = {
      id: createId("com_rate"),
      pais: row.pais,
      cliente: row.cliente,
      proyecto: row.proyecto,
      role,
      rate: 0,
      currency: "USD",
      validFrom: today,
      status: "Activo"
    };
    const key = commercialKey(item);
    if (isValidRole(role) && hasValidDimension(item.pais) && hasValidDimension(item.cliente) && hasValidDimension(item.proyecto) && !commercialKeys.has(key)) {
      commercialKeys.add(key);
      nextCommercialRates.push(item);
    }
  });

  return { operationRates: nextOperationRates, commercialRates: nextCommercialRates };
}

export function sanitizeOperationRates(rates: OperationRate[]) {
  return rates
    .filter((rate) => isValidRole(rate.role))
    .map((rate) => ({ ...rate, rate: roundNumber(rate.rate, 2), currency: coerceCurrency(rate.currency) }));
}

export function sanitizeCommercialRates(rates: CommercialRate[]) {
  return rates
    .filter(
      (rate) =>
        isValidRole(rate.role) &&
        hasValidDimension(rate.pais) &&
        hasValidDimension(rate.cliente) &&
        hasValidDimension(rate.proyecto)
    )
    .map((rate) => ({ ...rate, rate: roundNumber(rate.rate, 2), currency: coerceCurrency(rate.currency) }));
}

export function buildComputedRows(
  records: NormalizedRecord[],
  operationRates: OperationRate[],
  commercialRates: CommercialRate[]
): ComputedRow[] {
  return records.map((row) => {
    const opRole = roleForOperations(row);
    const commercialRole = roleForCommercial(row);
    const operationRate = operationRates.find(
      (rate) => rate.status === "Activo" && normalize(rate.role) === normalize(opRole)
    );
    const commercialRate = commercialRates.find(
      (rate) =>
        rate.status === "Activo" &&
        normalize(rate.pais) === normalize(row.pais) &&
        normalize(rate.cliente) === normalize(row.cliente) &&
        normalize(rate.proyecto) === normalize(row.proyecto) &&
        normalize(rate.role) === normalize(commercialRole)
    );

    const opRateValue = operationRate?.rate && operationRate.rate > 0 ? roundNumber(operationRate.rate, 2) : null;
    const commercialRateValue = commercialRate?.rate && commercialRate.rate > 0 ? roundNumber(commercialRate.rate, 2) : null;
    const monedaOperaciones = coerceCurrency(operationRate?.currency);
    const monedaComercial = commercialRateValue ? coerceCurrency(commercialRate?.currency) : null;

    const costoEstimadoOperaciones = roundNumber(row.horasEstimadas * (opRateValue ?? 0), 2);
    const costoEjecutadoOperaciones = roundNumber(row.horasRegistradas * (opRateValue ?? 0), 2);
    const costoRealOperaciones = roundNumber(row.horasRegistradas * (opRateValue ?? 0), 2);

    const facturacionEstimadaComercial = roundNumber(row.horasEstimadas * (commercialRateValue ?? 0), 2);
    const facturacionRegistradaComercial = roundNumber(row.horasRegistradas * (commercialRateValue ?? 0), 2);
    const facturacionRealComercial = roundNumber(row.horasFacturables * (commercialRateValue ?? 0), 2);

    return {
      ...row,
      horasEstimadas: roundNumber(row.horasEstimadas, 2),
      horasRegistradas: roundNumber(row.horasRegistradas, 2),
      horasFacturables: roundNumber(row.horasFacturables, 2),
      tarifaOperacionesHora: opRateValue,
      tarifaComercialHora: commercialRateValue,
      monedaOperaciones,
      monedaComercial,
      facturacionEstimadaComercial,
      facturacionRegistradaComercial,
      facturacionRealComercial,
      costoEstimadoOperaciones,
      costoEjecutadoOperaciones,
      costoRealOperaciones,
      resultadoOperativo: commercialRateValue ? roundNumber(facturacionRealComercial - costoRealOperaciones, 2) : null,
      tieneTarifaOperaciones: Boolean(opRateValue),
      tieneTarifaComercial: Boolean(commercialRateValue)
    };
  });
}

export function buildGeneralSummary(rows: ComputedRow[]): SummaryRow[] {
  const groups = new Map<string, SummaryRow>();
  rows.forEach((row) => {
    const key = `${row.pais}__${row.proyecto}`;
    const current = groups.get(key) ?? {
      id: key,
      pais: row.pais,
      proyecto: row.proyecto,
      monedaOperaciones: "",
      monedaComercial: "",
      horasEstimadas: 0,
      horasRegistradas: 0,
      horasFacturables: 0,
      facturacionEstimadaComercial: 0,
      facturacionRegistradaComercial: 0,
      facturacionRealComercial: 0,
      costoRealOperaciones: 0,
      resultadoOperativo: 0
    };
    current.monedaOperaciones = mergeCurrencyLabel(current.monedaOperaciones, row.monedaOperaciones);
    current.monedaComercial = mergeCurrencyLabel(current.monedaComercial, row.monedaComercial);
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.horasFacturables += row.horasFacturables;
    current.facturacionEstimadaComercial! += row.facturacionEstimadaComercial;
    current.facturacionRegistradaComercial! += row.facturacionRegistradaComercial;
    current.facturacionRealComercial! += row.facturacionRealComercial;
    current.costoRealOperaciones += row.costoRealOperaciones;
    current.resultadoOperativo! += row.resultadoOperativo ?? 0;
    groups.set(key, current);
  });
  return Array.from(groups.values()).map(roundSummaryRow);
}

export function buildServicesSummary(rows: ComputedRow[]): SummaryRow[] {
  const groups = new Map<string, SummaryRow>();
  rows.forEach((row) => {
    const key = `${row.pais}__${row.proyecto}`;
    const current = groups.get(key) ?? {
      id: key,
      pais: row.pais,
      proyecto: row.proyecto,
      monedaOperaciones: "",
      horasEstimadas: 0,
      horasRegistradas: 0,
      horasFacturables: 0,
      costoEstimadoOperaciones: 0,
      costoEjecutadoOperaciones: 0,
      costoRealOperaciones: 0
    };
    current.monedaOperaciones = mergeCurrencyLabel(current.monedaOperaciones, row.monedaOperaciones);
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.horasFacturables += row.horasFacturables;
    current.costoEstimadoOperaciones! += row.costoEstimadoOperaciones;
    current.costoEjecutadoOperaciones! += row.costoEjecutadoOperaciones;
    current.costoRealOperaciones += row.costoRealOperaciones;
    groups.set(key, current);
  });
  return Array.from(groups.values()).map(roundSummaryRow);
}

export function buildConsultantSummary(rows: ComputedRow[]): ConsultantSummaryRow[] {
  type Draft = ConsultantSummaryRow & {
    paisCounts: Map<string, number>;
    clienteCounts: Map<string, number>;
    proyectoCounts: Map<string, number>;
    roleCounts: Map<string, number>;
  };

  const groups = new Map<string, Draft>();
  rows.forEach((row) => {
    const persona = row.persona || "No definido";
    const key = normalize(persona);
    const current = groups.get(key) ?? {
      id: key,
      persona,
      paises: "",
      clientes: "",
      proyectos: "",
      roles: "",
      monedaOperaciones: "",
      monedaComercial: "",
      horasEstimadas: 0,
      horasRegistradas: 0,
      horasFacturables: 0,
      facturacionEstimadaComercial: 0,
      facturacionRegistradaComercial: 0,
      facturacionRealComercial: 0,
      costoEstimadoOperaciones: 0,
      costoEjecutadoOperaciones: 0,
      costoRealOperaciones: 0,
      resultadoOperativo: null,
      paisCounts: new Map<string, number>(),
      clienteCounts: new Map<string, number>(),
      proyectoCounts: new Map<string, number>(),
      roleCounts: new Map<string, number>()
    };

    incrementCounter(current.paisCounts, row.pais);
    incrementCounter(current.clienteCounts, row.cliente);
    incrementCounter(current.proyectoCounts, row.proyecto);
    incrementCounter(current.roleCounts, roleForOperations(row));
    current.monedaOperaciones = mergeCurrencyLabel(current.monedaOperaciones, row.monedaOperaciones);
    current.monedaComercial = mergeCurrencyLabel(current.monedaComercial, row.monedaComercial);
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.horasFacturables += row.horasFacturables;
    current.facturacionEstimadaComercial += row.facturacionEstimadaComercial;
    current.facturacionRegistradaComercial += row.facturacionRegistradaComercial;
    current.facturacionRealComercial += row.facturacionRealComercial;
    current.costoEstimadoOperaciones += row.costoEstimadoOperaciones;
    current.costoEjecutadoOperaciones += row.costoEjecutadoOperaciones;
    current.costoRealOperaciones += row.costoRealOperaciones;
    current.resultadoOperativo = (current.resultadoOperativo ?? 0) + (row.resultadoOperativo ?? 0);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((row) => ({
      ...row,
      paises: mostFrequent(row.paisCounts),
      clientes: mostFrequent(row.clienteCounts),
      proyectos: mostFrequent(row.proyectoCounts),
      roles: mostFrequent(row.roleCounts),
      monedaOperaciones: row.monedaOperaciones || "USD",
      monedaComercial: row.monedaComercial || "Sin tarifa",
      horasEstimadas: roundNumber(row.horasEstimadas, 2),
      horasRegistradas: roundNumber(row.horasRegistradas, 2),
      horasFacturables: roundNumber(row.horasFacturables, 2),
      facturacionEstimadaComercial: roundNumber(row.facturacionEstimadaComercial, 2),
      facturacionRegistradaComercial: roundNumber(row.facturacionRegistradaComercial, 2),
      facturacionRealComercial: roundNumber(row.facturacionRealComercial, 2),
      costoEstimadoOperaciones: roundNumber(row.costoEstimadoOperaciones, 2),
      costoEjecutadoOperaciones: roundNumber(row.costoEjecutadoOperaciones, 2),
      costoRealOperaciones: roundNumber(row.costoRealOperaciones, 2),
      resultadoOperativo: row.resultadoOperativo === null ? null : roundNumber(row.resultadoOperativo, 2)
    }))
    .sort((a, b) => a.persona.localeCompare(b.persona, "es"));
}

export function filterRecords(records: NormalizedRecord[], filters: FilterState) {
  return records.filter((row) => {
    if (filters.pais && row.pais !== filters.pais) return false;
    if (filters.cliente && row.cliente !== filters.cliente) return false;
    if (filters.proyecto && row.proyecto !== filters.proyecto) return false;
    if (filters.hitoFacturable && row.hitoFacturable !== filters.hitoFacturable) return false;

    if (filters.fechaInicio && row.fechaFin && row.fechaFin < filters.fechaInicio) return false;
    if (filters.fechaFin && row.fechaInicio && row.fechaInicio > filters.fechaFin) return false;

    return true;
  });
}

export function getFilterOptions(records: NormalizedRecord[], filters: FilterState) {
  const byPais = filters.pais ? records.filter((row) => row.pais === filters.pais) : records;
  const byCliente = filters.cliente ? byPais.filter((row) => row.cliente === filters.cliente) : byPais;
  const byProyecto = filters.proyecto ? byCliente.filter((row) => row.proyecto === filters.proyecto) : byCliente;

  return {
    paises: unique(records.map((row) => row.pais)),
    clientes: unique(byPais.map((row) => row.cliente)),
    proyectos: unique(byCliente.map((row) => row.proyecto)),
    hitos: unique(byProyecto.map((row) => row.hitoFacturable))
  };
}

export function buildRuntimeWarnings(
  rows: ComputedRow[],
  filteredRawCount: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const missingOps = rows.filter((row) => !row.tieneTarifaOperaciones).length;
  const missingCommercial = rows.filter((row) => !row.tieneTarifaComercial).length;
  const zeroEstimated = rows.filter((row) => row.horasEstimadas === 0).length;

  if (filteredRawCount === 0) {
    warnings.push({
      id: createId("warn"),
      severity: "warning",
      type: "empty",
      message: "No existen datos para los filtros seleccionados."
    });
  }
  if (missingOps > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "warning",
      type: "tariff",
      message: "Existen roles sin tarifa de operaciones mayor que 0.",
      count: missingOps
    });
  }
  if (missingCommercial > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "warning",
      type: "tariff",
      message: "Existen proyectos o roles sin tarifa comercial mayor que 0.",
      count: missingCommercial
    });
  }
  if (zeroEstimated > 0) {
    warnings.push({
      id: createId("warn"),
      severity: "info",
      type: "zero",
      message: "Existen registros con horas estimadas en cero; el cumplimiento no puede calcularse correctamente para esos registros.",
      count: zeroEstimated
    });
  }
  return warnings;
}

export function totals(rows: ComputedRow[]) {
  const horasEstimadas = roundNumber(rows.reduce((acc, row) => acc + row.horasEstimadas, 0), 2);
  const horasRegistradas = roundNumber(rows.reduce((acc, row) => acc + row.horasRegistradas, 0), 2);
  const horasFacturables = roundNumber(rows.reduce((acc, row) => acc + row.horasFacturables, 0), 2);
  const cumplimiento = horasEstimadas > 0 ? roundNumber((horasRegistradas / horasEstimadas) * 100, 2) : null;
  return { horasEstimadas, horasRegistradas, horasFacturables, cumplimiento };
}

function roundSummaryRow(row: SummaryRow): SummaryRow {
  return {
    ...row,
    monedaOperaciones: row.monedaOperaciones || "USD",
    monedaComercial: row.monedaComercial || "Sin tarifa",
    horasEstimadas: roundNumber(row.horasEstimadas, 2),
    horasRegistradas: roundNumber(row.horasRegistradas, 2),
    horasFacturables: roundNumber(row.horasFacturables, 2),
    facturacionEstimadaComercial: row.facturacionEstimadaComercial === undefined ? undefined : roundNumber(row.facturacionEstimadaComercial, 2),
    facturacionRegistradaComercial: row.facturacionRegistradaComercial === undefined ? undefined : roundNumber(row.facturacionRegistradaComercial, 2),
    facturacionRealComercial: row.facturacionRealComercial === undefined ? undefined : roundNumber(row.facturacionRealComercial, 2),
    costoEstimadoOperaciones: row.costoEstimadoOperaciones === undefined ? undefined : roundNumber(row.costoEstimadoOperaciones, 2),
    costoEjecutadoOperaciones: row.costoEjecutadoOperaciones === undefined ? undefined : roundNumber(row.costoEjecutadoOperaciones, 2),
    costoRealOperaciones: roundNumber(row.costoRealOperaciones, 2),
    resultadoOperativo: row.resultadoOperativo === undefined ? undefined : roundNumber(row.resultadoOperativo, 2)
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

function joinSet(values: Set<string>) {
  return Array.from(values).filter(Boolean).sort((a, b) => a.localeCompare(b, "es")).join("; ");
}

function incrementCounter(counter: Map<string, number>, value: string) {
  const cleanValue = value || "No definido";
  counter.set(cleanValue, (counter.get(cleanValue) ?? 0) + 1);
}

function mostFrequent(counter: Map<string, number>) {
  return Array.from(counter.entries())
    .filter(([value]) => Boolean(value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))[0]?.[0] ?? "No definido";
}

function mergeCurrencyLabel(existing: string | undefined, next: string | null | undefined) {
  if (!next) return existing ?? "";
  if (!existing) return next;
  const parts = new Set(existing.split("/").concat(next.split("/")).map((item) => item.trim()).filter(Boolean));
  return Array.from(parts).sort().join("/");
}

function coerceCurrency(value?: string | null): CurrencyCode {
  const normalizedValue = String(value ?? "USD").toUpperCase().trim();
  return normalizedValue === "PEN" ? "PEN" : "USD";
}

function isValidRole(role: string) {
  const value = normalize(role);
  if (!value || value === "no definido") return false;
  if (value.includes("drop down")) return false;
  if (["rol", "rol estimado", "rol asignado", "role", "assigned role", "cargo"].includes(value)) return false;
  return true;
}

function hasValidDimension(value: string) {
  const normalizedValue = normalize(value);
  if (!normalizedValue || normalizedValue === "no definido") return false;
  if (normalizedValue.includes("drop down")) return false;
  if (["pais", "país", "cliente", "proyecto", "country", "client", "project"].includes(normalizedValue)) return false;
  return true;
}

function commercialKey(rate: CommercialRate) {
  return [rate.pais, rate.cliente, rate.proyecto, rate.role].map(normalize).join("|");
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}
