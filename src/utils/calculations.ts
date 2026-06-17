import {
  ComputedRecord,
  CurrencyCode,
  FilterState,
  GeneralConsultantSummary,
  GeneralProjectSummary,
  NormalizedRecord,
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
  proyecto: "",
  hitoFacturable: ""
};

export const defaultTariffs: TariffRate[] = [];

function createTariff(pais: string, cliente: string, proyecto: string, perfil: string, tarifa: number, moneda: CurrencyCode): TariffRate {
  return { id: createId("tariff"), pais, cliente, proyecto, perfil, tarifa, moneda, status: "Activo" };
}

export function sanitizeTariffs(rates: TariffRate[]) {
  if (!Array.isArray(rates)) return defaultTariffs;
  return rates.map((rate) => ({
    ...rate,
    id: rate.id || createId("tariff"),
    pais: rate.pais || "No definido",
    cliente: rate.cliente || "No definido",
    proyecto: rate.proyecto || "No definido",
    perfil: rate.perfil || "No definido",
    tarifa: Number.isFinite(Number(rate.tarifa)) ? Number(rate.tarifa) : 0,
    moneda: rate.moneda === "PEN" ? "PEN" : "USD",
    status: rate.status === "Inactivo" ? "Inactivo" : "Activo"
  }));
}

export function ensureTariffsForRecords(records: NormalizedRecord[], tariffs: TariffRate[]) {
  const current = sanitizeTariffs(tariffs);
  const existing = new Set(current.map((rate) => tariffKey(rate.pais, rate.cliente, rate.proyecto, rate.perfil)));
  const additions: TariffRate[] = [];

  unique(records.map((record) => JSON.stringify([record.pais, record.cliente, record.proyecto, record.perfil]))).forEach((encoded) => {
    const [pais, cliente, proyecto, perfil] = JSON.parse(encoded) as string[];
    const exact = tariffKey(pais, cliente, proyecto, perfil);
    if (!existing.has(exact)) {
      additions.push(createTariff(pais, cliente, proyecto, perfil, 0, "USD"));
      existing.add(exact);
    }
  });

  return [...current, ...additions];
}

export function filterRecords(records: NormalizedRecord[], filters: FilterState) {
  return records.filter((row) => {
    if (filters.fechaInicio && row.fechaFin && row.fechaFin < filters.fechaInicio) return false;
    if (filters.fechaFin && row.fechaInicio && row.fechaInicio > filters.fechaFin) return false;
    if (filters.pais && row.pais !== filters.pais) return false;
    if (filters.cliente && row.cliente !== filters.cliente) return false;
    if (filters.proyecto && row.proyecto !== filters.proyecto) return false;
    if (filters.hitoFacturable && row.hitoFacturable !== filters.hitoFacturable) return false;
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

export function buildComputedRows(records: NormalizedRecord[], tariffs: TariffRate[]): ComputedRecord[] {
  const safeTariffs = sanitizeTariffs(tariffs).filter((rate) => rate.status === "Activo");

  return records.map((row) => {
    const tariff = resolveTariff(row, safeTariffs);
    const tarifa = tariff?.tarifa ?? 0;
    const moneda = tariff?.moneda ?? "USD";
    const costoPorHora70 = tarifa * 0.7;
    const ingresoEstimado = row.horasEstimadas * tarifa;
    const ingresoReal = row.horasRegistradas * tarifa;
    const costoEstimado70 = row.horasEstimadas * costoPorHora70;
    const costoEjecutado70 = row.horasRegistradas * costoPorHora70;
    const progreso = safeDivide(row.horasRegistradas, row.horasEstimadas);
    const proyeccionCosto = progreso > 0 ? costoEjecutado70 / progreso : 0;
    const rentabilidadEstimada = safeDivide(ingresoEstimado - costoEstimado70, ingresoEstimado);
    const rentabilidadProyectada = safeDivide(ingresoEstimado - proyeccionCosto, ingresoEstimado);
    const margenGenerado = ingresoReal - costoEjecutado70;

    return {
      ...row,
      tarifa: roundNumber(tarifa, 2),
      moneda,
      costoPorHora70: roundNumber(costoPorHora70, 2),
      ingresoEstimado: roundNumber(ingresoEstimado, 2),
      ingresoReal: roundNumber(ingresoReal, 2),
      costoEstimado70: roundNumber(costoEstimado70, 2),
      costoEjecutado70: roundNumber(costoEjecutado70, 2),
      horasNoFacturables: roundNumber(row.horasRegistradas - row.horasFacturables, 2),
      progreso: roundNumber(progreso, 4),
      saldoDisponible70: roundNumber(costoEstimado70 - costoEjecutado70, 2),
      proyeccionCosto: roundNumber(proyeccionCosto, 2),
      rentabilidadEstimada: roundNumber(rentabilidadEstimada, 4),
      rentabilidadProyectada: roundNumber(rentabilidadProyectada, 4),
      desviacionPp: roundNumber(rentabilidadProyectada - rentabilidadEstimada, 4),
      margenGenerado: roundNumber(margenGenerado, 2),
      tieneTarifa: tarifa > 0
    };
  });
}

function resolveTariff(row: NormalizedRecord, tariffs: TariffRate[]) {
  return tariffs.find(
    (rate) => eq(rate.pais, row.pais) && eq(rate.cliente, row.cliente) && eq(rate.proyecto, row.proyecto) && eq(rate.perfil, row.perfil)
  ) ?? null;
}

export function buildServiceProjectSummary(rows: ComputedRecord[]): ServiceProjectSummary[] {
  const groups = new Map<string, ServiceProjectSummary>();
  rows.forEach((row) => {
    const key = [row.pais, row.cliente, row.proyecto].join("__");
    const current = groups.get(key) ?? {
      id: key,
      pais: row.pais,
      cliente: row.cliente,
      proyecto: row.proyecto,
      moneda: row.moneda,
      horasEstimadas: 0,
      horasRegistradas: 0,
      horasFacturables: 0,
      horasNoFacturables: 0,
      progreso: 0,
      costoEstimado70: 0,
      costoEjecutado70: 0,
      saldoDisponible70: 0
    };
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.horasFacturables += row.horasFacturables;
    current.horasNoFacturables += row.horasNoFacturables;
    current.costoEstimado70 += row.costoEstimado70;
    current.costoEjecutado70 += row.costoEjecutado70;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => ({
    ...roundServiceProject(row),
    progreso: roundNumber(safeDivide(row.horasRegistradas, row.horasEstimadas), 4),
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
      moneda: row.moneda,
      horasEstimadas: 0,
      horasRegistradas: 0,
      horasFacturables: 0,
      tarifa: 0,
      costoPorHora70: 0,
      costoEjecutado70: 0,
      progreso: 0,
      tarifaTotal: 0,
      tarifaCount: 0
    };
    current.horasEstimadas += row.horasEstimadas;
    current.horasRegistradas += row.horasRegistradas;
    current.horasFacturables += row.horasFacturables;
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
      horasFacturables: roundNumber(row.horasFacturables, 2),
      tarifa: roundNumber(tarifa, 2),
      costoPorHora70: roundNumber(tarifa * 0.7, 2),
      costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
      progreso: roundNumber(safeDivide(row.horasRegistradas, row.horasEstimadas), 4)
    };
  });
}

export function buildGeneralProjectSummary(rows: ComputedRecord[]): GeneralProjectSummary[] {
  const groups = new Map<string, GeneralProjectSummary>();
  rows.forEach((row) => {
    const key = [row.pais, row.cliente, row.proyecto].join("__");
    const current = groups.get(key) ?? {
      id: key,
      pais: row.pais,
      cliente: row.cliente,
      proyecto: row.proyecto,
      moneda: row.moneda,
      ingresoEstimado: 0,
      ingresoReal: 0,
      costoEstimado70: 0,
      costoEjecutado70: 0,
      proyeccionCosto: 0,
      rentabilidadEstimada: 0,
      rentabilidadProyectada: 0,
      desviacionPp: 0
    };
    current.ingresoEstimado += row.ingresoEstimado;
    current.ingresoReal += row.ingresoReal;
    current.costoEstimado70 += row.costoEstimado70;
    current.costoEjecutado70 += row.costoEjecutado70;
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((row) => {
    const progreso = safeDivide(row.costoEjecutado70, row.costoEstimado70);
    const proyeccionCosto = progreso > 0 ? row.costoEjecutado70 / progreso : 0;
    const rentabilidadEstimada = safeDivide(row.ingresoEstimado - row.costoEstimado70, row.ingresoEstimado);
    const rentabilidadProyectada = safeDivide(row.ingresoEstimado - proyeccionCosto, row.ingresoEstimado);
    return {
      ...row,
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

export function serviceTotals(rows: ComputedRecord[]) {
  const horasEstimadas = sum(rows, "horasEstimadas");
  const horasRegistradas = sum(rows, "horasRegistradas");
  const horasFacturables = sum(rows, "horasFacturables");
  const costoEstimado70 = sum(rows, "costoEstimado70");
  const costoEjecutado70 = sum(rows, "costoEjecutado70");
  return {
    horasEstimadas,
    horasRegistradas,
    horasFacturables,
    horasNoFacturables: roundNumber(horasRegistradas - horasFacturables, 2),
    progreso: roundNumber(safeDivide(horasRegistradas, horasEstimadas), 4),
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
  const progreso = safeDivide(horasRegistradas, horasEstimadas);
  const proyeccionCosto = progreso > 0 ? costoEjecutado70 / progreso : 0;
  const rentabilidadEstimada = safeDivide(ingresoEstimado - costoEstimado70, ingresoEstimado);
  const rentabilidadProyectada = safeDivide(ingresoEstimado - proyeccionCosto, ingresoEstimado);
  return {
    ingresoEstimado,
    ingresoReal,
    costoEstimado70,
    costoEjecutado70,
    rentabilidadEstimada: roundNumber(rentabilidadEstimada, 4),
    proyeccionCosto: roundNumber(proyeccionCosto, 2),
    rentabilidadProyectada: roundNumber(rentabilidadProyectada, 4),
    desviacionPp: roundNumber(rentabilidadProyectada - rentabilidadEstimada, 4),
    moneda: rows[0]?.moneda ?? "USD"
  };
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
    horasFacturables: roundNumber(row.horasFacturables, 2),
    horasNoFacturables: roundNumber(row.horasNoFacturables, 2),
    costoEstimado70: roundNumber(row.costoEstimado70, 2),
    costoEjecutado70: roundNumber(row.costoEjecutado70, 2),
    saldoDisponible70: roundNumber(row.saldoDisponible70, 2)
  };
}

function tariffKey(pais: string, cliente: string, proyecto: string, perfil: string) {
  return [pais, cliente, proyecto, perfil].map(normalize).join("__");
}

function eq(a: string, b: string) {
  return normalize(a) === normalize(b);
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
