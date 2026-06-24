import {
  ComputedRecord,
  CurrencyCode,
  FilterState,
  GeneralConsultantSummary,
  GeneralProjectSummary,
  NormalizedRecord,
  ProjectEstimate,
  SeniorityProfitabilitySummary,
  ServiceConsultantSummary,
  ServiceProjectSummary,
  TariffRate
} from "../types";
import { roundNumber } from "./format";
import { createId } from "./ids";

export const emptyFilters: FilterState = {
  fechaInicio: "",
  fechaFin: "",
  pais: "",
  cliente: "",
  proyecto: ""
};

export const defaultTariffs: TariffRate[] = [
  { id: "tariff-junior", perfil: "Junior", tarifa: 45, moneda: "USD", status: "Activo" },
  { id: "tariff-semi-senior", perfil: "Semi Senior", tarifa: 65, moneda: "USD", status: "Activo" },
  { id: "tariff-senior", perfil: "Senior", tarifa: 90, moneda: "USD", status: "Activo" },
  { id: "tariff-lead", perfil: "Lead", tarifa: 110, moneda: "USD", status: "Activo" },
  { id: "tariff-architect", perfil: "Arquitecto", tarifa: 130, moneda: "USD", status: "Activo" }
];

export function sanitizeTariffs(rates: TariffRate[]) {
  if (!Array.isArray(rates) || rates.length === 0) return defaultTariffs;
  const byProfile = new Map<string, TariffRate>();
  rates.forEach((rate) => {
    const perfil = normalizeProfile(rate.perfil);
    if (!perfil) return;
    byProfile.set(normalize(perfil), {
      id: rate.id || createId("tariff"),
      perfil,
      tarifa: Number.isFinite(Number(rate.tarifa)) ? Number(rate.tarifa) : 0,
      moneda: rate.moneda === "PEN" ? "PEN" : "USD",
      status: rate.status === "Inactivo" ? "Inactivo" : "Activo"
    });
  });
  return Array.from(byProfile.values());
}

export function ensureTariffsForRecords(records: NormalizedRecord[], tariffs: TariffRate[], estimates: ProjectEstimate[] = []) {
  const current = sanitizeTariffs(tariffs);
  const existing = new Set(current.map((rate) => normalize(rate.perfil)));
  const additions: TariffRate[] = [];
  const perfiles = [
    ...records.map((record) => record.perfil),
    ...estimates.flatMap((estimate) => estimate.items.map((item) => item.perfil))
  ];

  unique(perfiles).forEach((perfil) => {
    if (!existing.has(normalize(perfil))) {
      additions.push({ id: createId("tariff"), perfil, tarifa: 0, moneda: "USD", status: "Activo" });
      existing.add(normalize(perfil));
    }
  });

  return [...current, ...additions];
}

export function buildEstimatesFromRecords(records: NormalizedRecord[], tariffs: TariffRate[], fileName: string): ProjectEstimate[] {
  const rates = sanitizeTariffs(tariffs);
  const projects = new Map<string, ProjectEstimate>();

  records.forEach((record) => {
    const key = projectKey(record.pais, record.cliente, record.proyecto);
    const estimate = projects.get(key) ?? {
      id: createId("estimate_import"),
      version: "Estimacion",
      pais: record.pais,
      cliente: record.cliente,
      proyecto: record.proyecto,
      fechaInicio: record.fechaInicio || record.fechaFin || new Date().toISOString().slice(0, 10),
      fechaFin: record.fechaFin || record.fechaInicio || new Date().toISOString().slice(0, 10),
      estado: "Aprobada" as const,
      createdAt: new Date().toISOString(),
      items: []
    };

    if (record.fechaInicio && record.fechaInicio < estimate.fechaInicio) estimate.fechaInicio = record.fechaInicio;
    if (record.fechaFin && record.fechaFin > estimate.fechaFin) estimate.fechaFin = record.fechaFin;

    const perfil = record.perfil || "No definido";
    const monthIndex = monthIndexFromDate(estimate.fechaInicio, record.fechaFin || record.fechaInicio);
    const existing = estimate.items.find((item) => item.perfil === perfil && item.monthIndex === monthIndex);
    const tarifa = resolveTariff(perfil, rates)?.tarifa ?? 0;
    if (existing) {
      existing.horas += record.horasEstimadas;
      if (!existing.tarifa) existing.tarifa = tarifa;
    } else {
      const groupId = estimate.items.find((item) => item.perfil === perfil)?.groupId ?? createId("profile_group");
      estimate.items.push({
        id: createId("estimate_item"),
        groupId,
        perfil,
        monthIndex,
        horas: record.horasEstimadas,
        tarifa
      });
    }

    estimate.version = "Estimacion";
    projects.set(key, estimate);
  });

  return Array.from(projects.values()).filter((estimate) => estimate.items.some((item) => item.horas > 0));
}

export function filterRecords(records: NormalizedRecord[], filters: FilterState) {
  return records.filter((row) => {
    if (filters.fechaInicio && row.fechaFin && row.fechaFin < filters.fechaInicio) return false;
    if (filters.fechaFin && row.fechaInicio && row.fechaInicio > filters.fechaFin) return false;
    if (filters.pais && row.pais !== filters.pais) return false;
    if (filters.cliente && row.cliente !== filters.cliente) return false;
    if (filters.proyecto && row.proyecto !== filters.proyecto) return false;
    return true;
  });
}

export function getFilterOptions(records: NormalizedRecord[], filters: FilterState) {
  const byPais = filters.pais ? records.filter((row) => row.pais === filters.pais) : records;
  const byCliente = filters.cliente ? byPais.filter((row) => row.cliente === filters.cliente) : byPais;
  return {
    paises: unique(records.map((row) => row.pais)),
    clientes: unique(byPais.map((row) => row.cliente)),
    proyectos: unique(byCliente.map((row) => row.proyecto))
  };
}

export function buildComputedRows(records: NormalizedRecord[], tariffs: TariffRate[], estimates: ProjectEstimate[]): ComputedRecord[] {
  const safeTariffs = sanitizeTariffs(tariffs).filter((rate) => rate.status === "Activo");
  const estimateByProject = selectActiveEstimates(estimates);
  const estimatedProfiles = buildEstimatedProfileIndex(estimates, safeTariffs);

  return records.map((row) => {
    const activeEstimate = estimateByProject.get(projectKey(row.pais, row.cliente, row.proyecto));
    const estimatedProfile = estimatedProfiles.get(projectProfileKey(row.pais, row.cliente, row.proyecto, row.perfil, activeEstimate?.id ?? ""));
    const horasEstimadas = row.horasEstimadas || estimatedProfile?.horas || 0;
    const tarifa = estimatedProfile?.tarifa ?? resolveTariff(row.perfil, safeTariffs)?.tarifa ?? 0;
    const moneda = resolveTariff(row.perfil, safeTariffs)?.moneda ?? "USD";
    const costoPorHora70 = tarifa * 0.7;
    const ingresoEstimado = horasEstimadas * tarifa;
    const ingresoReal = row.horasRegistradas * tarifa;
    const costoEstimado70 = horasEstimadas * costoPorHora70;
    const costoEjecutado70 = row.horasRegistradas * costoPorHora70;
    const progreso = row.progreso || safeDivide(row.horasRegistradas, horasEstimadas);
    const proyeccionCosto = progreso > 0 ? costoEjecutado70 / progreso : 0;
    const rentabilidadEstimada = safeDivide(ingresoEstimado - costoEstimado70, ingresoEstimado);
    const rentabilidadProyectada = safeDivide(ingresoEstimado - proyeccionCosto, ingresoEstimado);
    const margenGenerado = ingresoReal - costoEjecutado70;

    return {
      ...row,
      horasEstimadas: roundNumber(horasEstimadas, 2),
      tarifa: roundNumber(tarifa, 2),
      moneda,
      costoPorHora70: roundNumber(costoPorHora70, 2),
      ingresoEstimado: roundNumber(ingresoEstimado, 2),
      ingresoReal: roundNumber(ingresoReal, 2),
      costoEstimado70: roundNumber(costoEstimado70, 2),
      costoEjecutado70: roundNumber(costoEjecutado70, 2),
      progreso: roundNumber(progreso, 4),
      saldoDisponible70: roundNumber(costoEstimado70 - costoEjecutado70, 2),
      proyeccionCosto: roundNumber(proyeccionCosto, 2),
      rentabilidadEstimada: roundNumber(rentabilidadEstimada, 4),
      rentabilidadProyectada: roundNumber(rentabilidadProyectada, 4),
      desviacionPp: roundNumber(rentabilidadProyectada - rentabilidadEstimada, 4),
      margenGenerado: roundNumber(margenGenerado, 2),
      tieneTarifa: tarifa > 0,
      estimacionId: activeEstimate?.id ?? "",
      estimacionVersion: activeEstimate?.version ?? "Sin estimacion"
    };
  });
}

export function buildServiceProjectSummary(rows: ComputedRecord[]): ServiceProjectSummary[] {
  const groups = new Map<string, ServiceProjectSummary & { progressTotal: number; progressCount: number }>();
  rows.forEach((row) => {
    const key = [row.pais, row.cliente, row.proyecto].join("__");
    const current = groups.get(key) ?? {
      id: key,
      pais: row.pais,
      cliente: row.cliente,
      proyecto: row.proyecto,
      estimacionVersion: row.estimacionVersion,
      moneda: row.moneda,
      horasEstimadas: 0,
      horasRegistradas: 0,
      progreso: 0,
      costoEstimado70: 0,
      costoEjecutado70: 0,
      saldoDisponible70: 0,
      progressTotal: 0,
      progressCount: 0
    };
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.costoEstimado70 += row.costoEstimado70;
    current.costoEjecutado70 += row.costoEjecutado70;
    current.progressTotal += row.progreso;
    current.progressCount += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => ({
    ...roundServiceProject(row),
    progreso: roundNumber(row.progressCount ? row.progressTotal / row.progressCount : safeDivide(row.horasRegistradas, row.horasEstimadas), 4),
    saldoDisponible70: roundNumber(row.costoEstimado70 - row.costoEjecutado70, 2)
  }));
}

export function buildServiceConsultantSummary(rows: ComputedRecord[]): ServiceConsultantSummary[] {
  const groups = new Map<string, ServiceConsultantSummary & { tarifaTotal: number; tarifaCount: number }>();
  rows.forEach((row) => {
    const key = [row.consultor, row.pais, row.cliente, row.proyecto, row.perfil].join("__");
    const current = groups.get(key) ?? {
      id: key,
      consultor: row.consultor,
      pais: row.pais,
      cliente: row.cliente,
      proyecto: row.proyecto,
      perfil: row.perfil,
      estimacionVersion: row.estimacionVersion,
      moneda: row.moneda,
      horasEstimadas: 0,
      horasRegistradas: 0,
      tarifa: 0,
      costoPorHora70: 0,
      costoEjecutado70: 0,
      progreso: 0,
      tarifaTotal: 0,
      tarifaCount: 0
    };
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.costoEjecutado70 += row.costoEjecutado70;
    current.tarifaTotal += row.tarifa;
    current.tarifaCount += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => {
    const tarifa = row.tarifaCount ? row.tarifaTotal / row.tarifaCount : 0;
    return {
      ...row,
      horasEstimadas: roundNumber(row.horasEstimadas, 2),
      horasRegistradas: roundNumber(row.horasRegistradas, 2),
      tarifa: roundNumber(tarifa, 2),
      costoPorHora70: roundNumber(tarifa * 0.7, 2),
      costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
      progreso: roundNumber(safeDivide(row.horasRegistradas, row.horasEstimadas), 4)
    };
  });
}

export function buildGeneralProjectSummary(rows: ComputedRecord[]): GeneralProjectSummary[] {
  const groups = new Map<string, GeneralProjectSummary & { progressTotal: number; progressCount: number }>();
  rows.forEach((row) => {
    const key = [row.pais, row.cliente, row.proyecto].join("__");
    const current = groups.get(key) ?? {
      id: key,
      pais: row.pais,
      cliente: row.cliente,
      proyecto: row.proyecto,
      estimacionVersion: row.estimacionVersion,
      moneda: row.moneda,
      progreso: 0,
      ingresoEstimado: 0,
      ingresoReal: 0,
      costoEstimado70: 0,
      costoEjecutado70: 0,
      proyeccionCosto: 0,
      rentabilidadEstimada: 0,
      rentabilidadProyectada: 0,
      desviacionPp: 0,
      progressTotal: 0,
      progressCount: 0
    };
    current.ingresoEstimado += row.ingresoEstimado;
    current.ingresoReal += row.ingresoReal;
    current.costoEstimado70 += row.costoEstimado70;
    current.costoEjecutado70 += row.costoEjecutado70;
    current.progressTotal += row.progreso;
    current.progressCount += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => {
    const progreso = row.progressCount ? row.progressTotal / row.progressCount : safeDivide(row.costoEjecutado70, row.costoEstimado70);
    const proyeccionCosto = progreso > 0 ? row.costoEjecutado70 / progreso : 0;
    const rentabilidadEstimada = safeDivide(row.ingresoEstimado - row.costoEstimado70, row.ingresoEstimado);
    const rentabilidadProyectada = safeDivide(row.ingresoEstimado - proyeccionCosto, row.ingresoEstimado);
    return {
      ...row,
      progreso: roundNumber(progreso, 4),
      ingresoEstimado: roundNumber(row.ingresoEstimado, 2),
      ingresoReal: roundNumber(row.ingresoReal, 2),
      costoEstimado70: roundNumber(row.costoEstimado70, 2),
      costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
      proyeccionCosto: roundNumber(proyeccionCosto, 2),
      rentabilidadEstimada: roundNumber(rentabilidadEstimada, 4),
      rentabilidadProyectada: roundNumber(rentabilidadProyectada, 4),
      desviacionPp: roundNumber(rentabilidadProyectada - rentabilidadEstimada, 4)
    };
  });
}

export function buildGeneralConsultantSummary(rows: ComputedRecord[]): GeneralConsultantSummary[] {
  const marginTotal = rows.reduce((sum, row) => sum + row.margenGenerado, 0);
  const groups = new Map<string, GeneralConsultantSummary & { tarifaTotal: number; tarifaCount: number }>();

  rows.forEach((row) => {
    const key = [row.consultor, row.proyecto, row.perfil].join("__");
    const current = groups.get(key) ?? {
      id: key,
      consultor: row.consultor,
      proyecto: row.proyecto,
      perfil: row.perfil,
      moneda: row.moneda,
      horasRegistradas: 0,
      tarifa: 0,
      ingresoGenerado: 0,
      costoEjecutado70: 0,
      margenGenerado: 0,
      participacionMargen: 0,
      tarifaTotal: 0,
      tarifaCount: 0
    };
    current.horasRegistradas += row.horasRegistradas;
    current.ingresoGenerado += row.ingresoReal;
    current.costoEjecutado70 += row.costoEjecutado70;
    current.margenGenerado += row.margenGenerado;
    current.tarifaTotal += row.tarifa;
    current.tarifaCount += 1;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => {
    const tarifa = row.tarifaCount ? row.tarifaTotal / row.tarifaCount : 0;
    return {
      ...row,
      horasRegistradas: roundNumber(row.horasRegistradas, 2),
      tarifa: roundNumber(tarifa, 2),
      ingresoGenerado: roundNumber(row.ingresoGenerado, 2),
      costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
      margenGenerado: roundNumber(row.margenGenerado, 2),
      participacionMargen: roundNumber(safeDivide(row.margenGenerado, marginTotal), 4)
    };
  });
}

export function buildSeniorityProfitability(rows: ComputedRecord[]): SeniorityProfitabilitySummary[] {
  const groups = new Map<string, SeniorityProfitabilitySummary>();
  rows.forEach((row) => {
    const key = row.perfil;
    const current = groups.get(key) ?? {
      id: key,
      perfil: row.perfil,
      moneda: row.moneda,
      horasEstimadas: 0,
      horasRegistradas: 0,
      ingresoEstimado: 0,
      ingresoReal: 0,
      costoEstimado70: 0,
      costoEjecutado70: 0,
      margenEstimado: 0,
      margenReal: 0,
      desviacionMargen: 0
    };
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.ingresoEstimado += row.ingresoEstimado;
    current.ingresoReal += row.ingresoReal;
    current.costoEstimado70 += row.costoEstimado70;
    current.costoEjecutado70 += row.costoEjecutado70;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => {
    const margenEstimado = row.ingresoEstimado - row.costoEstimado70;
    const margenReal = row.ingresoReal - row.costoEjecutado70;
    return {
      ...row,
      horasEstimadas: roundNumber(row.horasEstimadas, 2),
      horasRegistradas: roundNumber(row.horasRegistradas, 2),
      ingresoEstimado: roundNumber(row.ingresoEstimado, 2),
      ingresoReal: roundNumber(row.ingresoReal, 2),
      costoEstimado70: roundNumber(row.costoEstimado70, 2),
      costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
      margenEstimado: roundNumber(margenEstimado, 2),
      margenReal: roundNumber(margenReal, 2),
      desviacionMargen: roundNumber(margenReal - margenEstimado, 2)
    };
  });
}

export function serviceTotals(rows: ComputedRecord[]) {
  const horasEstimadas = sum(rows, "horasEstimadas");
  const horasRegistradas = sum(rows, "horasRegistradas");
  const costoEstimado70 = sum(rows, "costoEstimado70");
  const costoEjecutado70 = sum(rows, "costoEjecutado70");
  return {
    horasEstimadas,
    horasRegistradas,
    progreso: roundNumber(rows.length ? rows.reduce((sum, row) => sum + row.progreso, 0) / rows.length : safeDivide(horasRegistradas, horasEstimadas), 4),
    costoEstimado70,
    costoEjecutado70,
    saldoDisponible70: roundNumber(costoEstimado70 - costoEjecutado70, 2),
    moneda: rows[0]?.moneda ?? "USD"
  };
}

export function generalTotals(rows: ComputedRecord[]) {
  const ingresoEstimado = sum(rows, "ingresoEstimado");
  const ingresoReal = sum(rows, "ingresoReal");
  const costoEstimado70 = sum(rows, "costoEstimado70");
  const costoEjecutado70 = sum(rows, "costoEjecutado70");
  const horasEstimadas = sum(rows, "horasEstimadas");
  const horasRegistradas = sum(rows, "horasRegistradas");
  const progreso = rows.length ? rows.reduce((sum, row) => sum + row.progreso, 0) / rows.length : safeDivide(horasRegistradas, horasEstimadas);
  const proyeccionCosto = progreso > 0 ? costoEjecutado70 / progreso : 0;
  const rentabilidadEstimada = safeDivide(ingresoEstimado - costoEstimado70, ingresoEstimado);
  const rentabilidadProyectada = safeDivide(ingresoEstimado - proyeccionCosto, ingresoEstimado);
  return {
    ingresoEstimado,
    ingresoReal,
    costoEstimado70,
    costoEjecutado70,
    rentabilidadEstimada: roundNumber(rentabilidadEstimada, 4),
    progreso: roundNumber(progreso, 4),
    proyeccionCosto: roundNumber(proyeccionCosto, 2),
    rentabilidadProyectada: roundNumber(rentabilidadProyectada, 4),
    desviacionPp: roundNumber(rentabilidadProyectada - rentabilidadEstimada, 4),
    moneda: rows[0]?.moneda ?? "USD"
  };
}

export function estimateTotals(estimate: ProjectEstimate, tariffs: TariffRate[]) {
  const rates = sanitizeTariffs(tariffs);
  const totalHoras = estimate.items.reduce((sum, item) => sum + item.horas, 0);
  const ingresoEstimado = estimate.items.reduce((sum, item) => sum + item.horas * estimateItemTariff(item.tarifa, item.perfil, rates), 0);
  const costoEstimado70 = ingresoEstimado * 0.7;
  return {
    totalHoras: roundNumber(totalHoras, 2),
    ingresoEstimado: roundNumber(ingresoEstimado, 2),
    costoEstimado70: roundNumber(costoEstimado70, 2),
    rentabilidadEstimada: roundNumber(safeDivide(ingresoEstimado - costoEstimado70, ingresoEstimado), 4),
    moneda: rates[0]?.moneda ?? "USD"
  };
}

export function estimateProfiles(estimate: ProjectEstimate, tariffs: TariffRate[]) {
  const groups = new Map<string, { perfil: string; horas: number; tarifa: number; moneda: CurrencyCode }>();
  const rates = sanitizeTariffs(tariffs);
  estimate.items.forEach((item) => {
    const rate = resolveTariff(item.perfil, rates);
    const current = groups.get(item.perfil) ?? { perfil: item.perfil, horas: 0, tarifa: estimateItemTariff(item.tarifa, item.perfil, rates), moneda: rate?.moneda ?? "USD" };
    current.horas += item.horas;
    current.tarifa = estimateItemTariff(item.tarifa, item.perfil, rates);
    groups.set(item.perfil, current);
  });
  return Array.from(groups.values()).map((row) => ({
    ...row,
    horas: roundNumber(row.horas, 2),
    ingreso: roundNumber(row.horas * row.tarifa, 2),
    costoHora70: roundNumber(row.tarifa * 0.7, 2),
    costo70: roundNumber(row.horas * row.tarifa * 0.7, 2)
  }));
}

function selectActiveEstimates(estimates: ProjectEstimate[]) {
  const groups = new Map<string, ProjectEstimate>();
  estimates
    .filter((estimate) => estimate.estado !== "Archivada")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((estimate) => {
      groups.set(projectKey(estimate.pais, estimate.cliente, estimate.proyecto), estimate);
    });
  return groups;
}

function buildEstimatedProfileIndex(estimates: ProjectEstimate[], tariffs: TariffRate[]) {
  const active = selectActiveEstimates(estimates);
  const index = new Map<string, { horas: number; tarifa: number }>();
  active.forEach((estimate) => {
    estimate.items.forEach((item) => {
      const key = projectProfileKey(estimate.pais, estimate.cliente, estimate.proyecto, item.perfil, estimate.id);
      const current = index.get(key) ?? { horas: 0, tarifa: estimateItemTariff(item.tarifa, item.perfil, tariffs) };
      current.horas += item.horas;
      current.tarifa = estimateItemTariff(item.tarifa, item.perfil, tariffs);
      index.set(key, current);
    });
  });
  return index;
}

function estimateItemTariff(tarifa: number | undefined, perfil: string, tariffs: TariffRate[]) {
  const value = Number(tarifa);
  if (Number.isFinite(value) && value > 0) return value;
  return resolveTariff(perfil, tariffs)?.tarifa ?? 0;
}

function resolveTariff(perfil: string, tariffs: TariffRate[]) {
  return tariffs.find((rate) => eq(rate.perfil, perfil)) ?? null;
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return roundNumber(
    rows.reduce((acc, row) => {
      const value = Number(row[key] ?? 0);
      return Number.isFinite(value) ? acc + value : acc;
    }, 0),
    2
  );
}

function safeDivide(numerator: number, denominator: number) {
  if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  return numerator / denominator;
}

function roundServiceProject(row: ServiceProjectSummary): ServiceProjectSummary {
  return {
    ...row,
    horasEstimadas: roundNumber(row.horasEstimadas, 2),
    horasRegistradas: roundNumber(row.horasRegistradas, 2),
    costoEstimado70: roundNumber(row.costoEstimado70, 2),
    costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
    saldoDisponible70: roundNumber(row.saldoDisponible70, 2)
  };
}

function projectKey(pais: string, cliente: string, proyecto: string) {
  return [pais, cliente, proyecto].map(normalize).join("__");
}

function projectProfileKey(pais: string, cliente: string, proyecto: string, perfil: string, estimateId: string) {
  return [pais, cliente, proyecto, perfil, estimateId].map(normalize).join("__");
}

function monthIndexFromDate(projectStart: string, rowDate: string) {
  if (!projectStart || !rowDate) return 1;
  const start = new Date(`${projectStart.slice(0, 7)}-01T00:00:00Z`);
  const current = new Date(`${rowDate.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return 1;
  return Math.max(1, (current.getUTCFullYear() - start.getUTCFullYear()) * 12 + current.getUTCMonth() - start.getUTCMonth() + 1);
}

function eq(a: string, b: string) {
  return normalize(a) === normalize(b);
}

function normalizeProfile(value: string) {
  return String(value ?? "").replace(/\s+/g, " ").trim() || "No definido";
}

function normalize(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}
