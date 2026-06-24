import { BarChart3, DollarSign, Gauge, Landmark, Percent, TrendingUp } from "lucide-react";
import { ComputedRecord, FilterState, NormalizedRecord, ProjectEstimate, TariffRate } from "../types";
import { buildComputedRows, filterRecords } from "../utils/calculations";
import { createExportSheet, exportSheetsToExcel } from "../utils/excel";
import { formatHours, formatMoney, formatPercent, formatPp } from "../utils/format";
import { Column, DataTable } from "./DataTable";
import { FilterPanel } from "./FilterPanel";
import { MetricCard } from "./MetricCard";

export function GeneralManagement({
  records,
  filters,
  onFiltersChange,
  tariffs,
  estimates
}: {
  records: NormalizedRecord[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  tariffs: TariffRate[];
  estimates: ProjectEstimate[];
}) {
  const filtered = filterRecords(records, filters);
  const computed = buildComputedRows(filtered, tariffs, estimates);
  const activeEstimates = selectVisibleEstimates(estimates, filters);
  const monthKeys = uniqueSorted([...getEstimateMonthKeys(activeEstimates), ...getMonthKeys(computed, activeEstimates)]);
  const theoretical = buildTheoreticalRows(activeEstimates);
  const executed = buildExecutedRows(computed, activeEstimates);
  const total = buildGeneralTotals(theoretical, computed);
  const profitabilityByMonth = buildProfitabilityByMonth(activeEstimates, computed, monthKeys);

  const theoreticalColumns: Column<FinancialTheoryRow>[] = [
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    ...monthKeys.map((monthKey): Column<FinancialTheoryRow> => ({
      id: `month_${monthKey}`,
      header: monthLabel(monthKey),
      value: (row) => row.months[monthKey] ?? 0,
      render: (row) => formatHours(row.months[monthKey] ?? 0),
      total: true,
      totalRender: (rows) => formatHours(rows.reduce((acc, row) => acc + (row.months[monthKey] ?? 0), 0))
    })),
    { id: "horas", header: "Total horas", value: (row) => row.horas, total: true, totalRender: (rows) => formatHours(sum(rows, "horas")) },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "ingreso", header: "Ingreso proyectado", value: (row) => row.ingreso, render: (row) => formatMoney(row.ingreso, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingreso"), total.moneda) },
    { id: "costoHora", header: "Costo por hora", value: (row) => row.costoHora, render: (row) => formatMoney(row.costoHora, row.moneda) },
    { id: "costo", header: "Costo", value: (row) => row.costo, render: (row) => formatMoney(row.costo, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costo"), total.moneda) }
  ];

  const executedColumns: Column<FinancialExecutedRow>[] = [
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "consultor", header: "Colaborador", value: (row) => row.consultor },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    ...monthKeys.map((monthKey): Column<FinancialExecutedRow> => ({
      id: `month_${monthKey}`,
      header: monthLabel(monthKey),
      value: (row) => row.months[monthKey] ?? 0,
      render: (row) => formatHours(row.months[monthKey] ?? 0),
      total: true,
      totalRender: (rows) => formatHours(rows.reduce((acc, row) => acc + (row.months[monthKey] ?? 0), 0))
    })),
    { id: "horas", header: "Total horas", value: (row) => row.horas, total: true, totalRender: (rows) => formatHours(sum(rows, "horas")) },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "ingreso", header: "Ingreso", value: (row) => row.ingreso, render: (row) => formatMoney(row.ingreso, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingreso"), total.moneda) },
    { id: "costoHora", header: "Costo por hora", value: (row) => row.costoHora, render: (row) => formatMoney(row.costoHora, row.moneda) },
    { id: "costo", header: "Costo", value: (row) => row.costo, render: (row) => formatMoney(row.costo, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costo"), total.moneda) }
  ];

  const profitabilityColumns: Column<ProjectMonthlyProfitabilityRow>[] = [
    { id: "pais", header: "Pais", value: (row) => row.pais },
    { id: "cliente", header: "Cliente", value: (row) => row.cliente },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "mes", header: "Mes", value: (row) => row.mes },
    { id: "ingresoEstimado", header: "Ingreso estimado", value: (row) => row.ingresoEstimado, render: (row) => formatMoney(row.ingresoEstimado, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoEstimado"), total.moneda) },
    { id: "ingresoReal", header: "Ingreso ejecutado", value: (row) => row.ingresoReal, render: (row) => formatMoney(row.ingresoReal, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoReal"), total.moneda) },
    { id: "costoEstimado70", header: "Costo estimado 70%", value: (row) => row.costoEstimado70, render: (row) => formatMoney(row.costoEstimado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEstimado70"), total.moneda) },
    { id: "costoEjecutado70", header: "Costo ejecutado 70%", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEjecutado70"), total.moneda) },
    { id: "progreso", header: "Progreso", value: (row) => row.progreso, render: (row) => formatPercent(row.progreso) },
    { id: "proyeccionCosto", header: "Proyeccion costo", value: (row) => row.proyeccionCosto, render: (row) => formatMoney(row.proyeccionCosto, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "proyeccionCosto"), total.moneda) },
    { id: "rentabilidadEstimada", header: "Rent. estimada", value: (row) => row.rentabilidadEstimada, render: (row) => formatPercent(row.rentabilidadEstimada) },
    { id: "rentabilidadProyectada", header: "Rent. proyectada", value: (row) => row.rentabilidadProyectada, render: (row) => formatPercent(row.rentabilidadProyectada) },
    { id: "desviacionPp", header: "Desviacion", value: (row) => row.desviacionPp, render: (row) => formatPp(row.desviacionPp) }
  ];

  const detailColumns: Column<ComputedRecord>[] = [
    { id: "taskName", header: "Tarea", value: (row) => row.taskName },
    { id: "consultor", header: "Consultor", value: (row) => row.consultor },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "ingresoReal", header: "Ingreso real", value: (row) => row.ingresoReal, render: (row) => formatMoney(row.ingresoReal, row.moneda) },
    { id: "costoEjecutado70", header: "Costo real", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda) },
    { id: "margenGenerado", header: "Margen", value: (row) => row.margenGenerado, render: (row) => formatMoney(row.margenGenerado, row.moneda) }
  ];

  const exportTab = () =>
    exportSheetsToExcel(
      [
        createExportSheet("Estimado teorico", theoretical, theoreticalColumns),
        createExportSheet("Ejecutado", executed, executedColumns),
        createExportSheet("Rentabilidad proyecto mes", profitabilityByMonth, profitabilityColumns),
        createExportSheet("Detalle tareas", computed, detailColumns)
      ],
      "gerencia_general"
    );

  return (
    <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Gerencia General</h2>
          <p className="text-sm font-bold text-slate-500">Rentabilidad estimada, ejecutada y proyectada por proyecto.</p>
        </div>
        <button onClick={exportTab} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">Exportar pestaña completa</button>
      </div>
      <FilterPanel records={records} filters={filters} onChange={onFiltersChange} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label="Ingreso estimado" value={formatMoney(total.ingresoEstimado, total.moneda)} />
        <MetricCard icon={Landmark} label="Ingreso real" value={formatMoney(total.ingresoReal, total.moneda)} />
        <MetricCard icon={DollarSign} label="Costo estimado 70%" value={formatMoney(total.costoEstimado70, total.moneda)} />
        <MetricCard icon={DollarSign} label="Costo real 70%" value={formatMoney(total.costoEjecutado70, total.moneda)} />
        <MetricCard icon={Gauge} label="Progreso" value={formatPercent(total.progreso)} />
        <MetricCard icon={TrendingUp} label="Rentabilidad estimada" value={formatPercent(total.rentabilidadEstimada)} />
        <MetricCard icon={BarChart3} label="Rentabilidad proyectada" value={formatPercent(total.rentabilidadProyectada)} />
        <MetricCard icon={Percent} label="Desviacion" value={formatPp(total.desviacionPp)} />
      </div>
      <DataTable title="Estimado / Teorico" rows={theoretical} columns={theoreticalColumns} fileName="estimado_teorico" />
      <DataTable title="Ejecutado" rows={executed} columns={executedColumns} fileName="ejecutado" />
      <DataTable title="Rentabilidad por proyecto y mes" rows={profitabilityByMonth} columns={profitabilityColumns} fileName="rentabilidad_proyecto_mes" />
      <div className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-600">
        Tarifa unica por perfil = 100% | Costo por hora = tarifa x 0.70 | Margen base = tarifa x 0.30.
      </div>
    </section>
  );
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
}

type FinancialTheoryRow = {
  id: string;
  perfil: string;
  pais: string;
  cliente: string;
  proyecto: string;
  moneda: ComputedRecord["moneda"];
  horas: number;
  tarifa: number;
  ingreso: number;
  costoHora: number;
  costo: number;
  months: Record<string, number>;
};

type FinancialExecutedRow = FinancialTheoryRow & {
  consultor: string;
  months: Record<string, number>;
};

type ProjectMonthlyProfitabilityRow = {
  id: string;
  pais: string;
  cliente: string;
  proyecto: string;
  mes: string;
  moneda: ComputedRecord["moneda"];
  horasEstimadas: number;
  horasRegistradas: number;
  ingresoEstimado: number;
  ingresoReal: number;
  costoEstimado70: number;
  costoEjecutado70: number;
  progreso: number;
  proyeccionCosto: number;
  rentabilidadEstimada: number;
  rentabilidadProyectada: number;
  desviacionPp: number;
};

function buildTheoreticalRows(estimates: ProjectEstimate[]): FinancialTheoryRow[] {
  const groups = new Map<string, FinancialTheoryRow>();
  estimates.forEach((estimate) => {
    estimate.items.forEach((item) => {
      const groupId = item.groupId || `${item.perfil}-${item.id}`;
      const key = [estimate.id, groupId].join("__");
      const tarifa = Number(item.tarifa) || 0;
      const current = groups.get(key) ?? {
        id: key,
        perfil: item.perfil,
        pais: estimate.pais,
        cliente: estimate.cliente,
        proyecto: estimate.proyecto,
        moneda: "USD" as const,
        horas: 0,
        tarifa,
        ingreso: 0,
        costoHora: tarifa * 0.7,
        costo: 0,
        months: {}
      };
      const monthKey = estimateMonthKey(estimate, item.monthIndex);
      const horas = Number(item.horas) || 0;
      current.horas += horas;
      current.months[monthKey] = (current.months[monthKey] ?? 0) + horas;
      current.tarifa = tarifa;
      current.costoHora = tarifa * 0.7;
      current.ingreso += horas * tarifa;
      current.costo += horas * tarifa * 0.7;
      groups.set(key, current);
    });
  });
  return Array.from(groups.values())
    .map(roundFinancialRow)
    .sort((a, b) => [a.pais, a.cliente, a.proyecto, a.perfil, a.id].join("__").localeCompare([b.pais, b.cliente, b.proyecto, b.perfil, b.id].join("__"), "es"));
}

function buildExecutedRows(rows: ComputedRecord[], estimates: ProjectEstimate[]): FinancialExecutedRow[] {
  const groups = new Map<string, FinancialExecutedRow>();
  rows.forEach((row) => {
    const key = [row.perfil, row.consultor, row.proyecto].join("__");
    const current = groups.get(key) ?? {
      id: key,
      perfil: row.perfil,
      pais: row.pais,
      cliente: row.cliente,
      consultor: row.consultor,
      proyecto: row.proyecto,
      moneda: row.moneda,
      horas: 0,
      tarifa: row.tarifa,
      ingreso: 0,
      costoHora: row.costoPorHora70,
      costo: 0,
      months: {}
    };
    splitRowHoursByProjectMonth(row, estimates, row.horasRegistradas).forEach(({ monthKey, horas }) => {
      current.months[monthKey] = (current.months[monthKey] ?? 0) + horas;
      current.horas += horas;
      current.ingreso += horas * row.tarifa;
      current.costo += horas * row.costoPorHora70;
    });
    groups.set(key, current);
  });
  return Array.from(groups.values()).map((row) => roundFinancialRow(row) as FinancialExecutedRow);
}

function roundFinancialRow<T extends FinancialTheoryRow>(row: T): T {
  return {
    ...row,
    horas: Number(row.horas.toFixed(2)),
    tarifa: Number(row.tarifa.toFixed(2)),
    ingreso: Number(row.ingreso.toFixed(2)),
    costoHora: Number(row.costoHora.toFixed(2)),
    costo: Number(row.costo.toFixed(2))
  };
}

function buildProfitabilityByMonth(estimates: ProjectEstimate[], rows: ComputedRecord[], monthKeys: string[]): ProjectMonthlyProfitabilityRow[] {
  const groups = new Map<string, ProjectMonthlyProfitabilityRow & { progressTotal: number; progressCount: number }>();
  estimates.forEach((estimate) => {
    estimate.items.forEach((item) => {
      const monthKey = estimateMonthKey(estimate, item.monthIndex);
      const key = [estimate.pais, estimate.cliente, estimate.proyecto, monthKey].join("__");
      const current = groups.get(key) ?? createProfitabilityRow(key, estimate.pais, estimate.cliente, estimate.proyecto, monthKey, "USD");
      const horas = Number(item.horas) || 0;
      const tarifa = Number(item.tarifa) || 0;
      current.horasEstimadas += horas;
      current.ingresoEstimado += horas * tarifa;
      current.costoEstimado70 += horas * tarifa * 0.7;
      groups.set(key, current);
    });
  });

  rows.forEach((row) => {
    splitRowHoursByProjectMonth(row, estimates, row.horasRegistradas).forEach(({ monthKey, horas }) => {
      const key = [row.pais, row.cliente, row.proyecto, monthKey].join("__");
      const current = groups.get(key) ?? createProfitabilityRow(key, row.pais, row.cliente, row.proyecto, monthKey, row.moneda);
      current.horasRegistradas += horas;
      current.ingresoReal += horas * row.tarifa;
      current.costoEjecutado70 += horas * row.costoPorHora70;
      current.progressTotal += row.progreso;
      current.progressCount += 1;
      groups.set(key, current);
    });
  });

  return Array.from(groups.values())
    .map((row) => {
      const progreso = row.progressCount ? row.progressTotal / row.progressCount : safeDivide(row.horasRegistradas, row.horasEstimadas);
      const proyeccionCosto = progreso > 0 ? row.costoEjecutado70 / progreso : 0;
      const rentabilidadEstimada = safeDivide(row.ingresoEstimado - row.costoEstimado70, row.ingresoEstimado);
      const rentabilidadProyectada = safeDivide(row.ingresoEstimado - proyeccionCosto, row.ingresoEstimado);
      return {
        ...row,
        horasEstimadas: round(row.horasEstimadas),
        horasRegistradas: round(row.horasRegistradas),
        ingresoEstimado: round(row.ingresoEstimado),
        ingresoReal: round(row.ingresoReal),
        costoEstimado70: round(row.costoEstimado70),
        costoEjecutado70: round(row.costoEjecutado70),
        progreso: round(progreso, 4),
        proyeccionCosto: round(proyeccionCosto),
        rentabilidadEstimada: round(rentabilidadEstimada, 4),
        rentabilidadProyectada: round(rentabilidadProyectada, 4),
        desviacionPp: round(rentabilidadProyectada - rentabilidadEstimada, 4)
      };
    })
    .filter((row) => !monthKeys.length || monthKeys.includes(labelToMonthKey(row.mes)))
    .sort((a, b) => [a.pais, a.cliente, a.proyecto, labelToMonthKey(a.mes)].join("__").localeCompare([b.pais, b.cliente, b.proyecto, labelToMonthKey(b.mes)].join("__"), "es"));
}

function createProfitabilityRow(
  id: string,
  pais: string,
  cliente: string,
  proyecto: string,
  monthKey: string,
  moneda: ComputedRecord["moneda"]
): ProjectMonthlyProfitabilityRow & { progressTotal: number; progressCount: number } {
  return {
    id,
    pais,
    cliente,
    proyecto,
    mes: monthLabel(monthKey),
    moneda,
    horasEstimadas: 0,
    horasRegistradas: 0,
    ingresoEstimado: 0,
    ingresoReal: 0,
    costoEstimado70: 0,
    costoEjecutado70: 0,
    progreso: 0,
    proyeccionCosto: 0,
    rentabilidadEstimada: 0,
    rentabilidadProyectada: 0,
    desviacionPp: 0,
    progressTotal: 0,
    progressCount: 0
  };
}

function buildGeneralTotals(theoretical: FinancialTheoryRow[], executed: ComputedRecord[]) {
  const ingresoEstimado = sum(theoretical, "ingreso");
  const ingresoReal = sum(executed, "ingresoReal");
  const costoEstimado70 = sum(theoretical, "costo");
  const costoEjecutado70 = sum(executed, "costoEjecutado70");
  const horasEstimadas = sum(theoretical, "horas");
  const horasRegistradas = sum(executed, "horasRegistradas");
  const progreso = executed.length ? executed.reduce((acc, row) => acc + row.progreso, 0) / executed.length : safeDivide(horasRegistradas, horasEstimadas);
  const proyeccionCosto = progreso > 0 ? costoEjecutado70 / progreso : 0;
  const rentabilidadEstimada = safeDivide(ingresoEstimado - costoEstimado70, ingresoEstimado);
  const rentabilidadProyectada = safeDivide(ingresoEstimado - proyeccionCosto, ingresoEstimado);
  return {
    ingresoEstimado: round(ingresoEstimado),
    ingresoReal: round(ingresoReal),
    costoEstimado70: round(costoEstimado70),
    costoEjecutado70: round(costoEjecutado70),
    rentabilidadEstimada: round(rentabilidadEstimada, 4),
    progreso: round(progreso, 4),
    proyeccionCosto: round(proyeccionCosto),
    rentabilidadProyectada: round(rentabilidadProyectada, 4),
    desviacionPp: round(rentabilidadProyectada - rentabilidadEstimada, 4),
    moneda: (theoretical[0]?.moneda ?? executed[0]?.moneda ?? "USD") as ComputedRecord["moneda"]
  };
}

function selectVisibleEstimates(estimates: ProjectEstimate[], filters: FilterState) {
  const groups = new Map<string, ProjectEstimate>();
  estimates
    .filter((estimate) => estimate.estado !== "Archivada")
    .filter((estimate) => {
      if (filters.fechaInicio && estimate.fechaFin && estimate.fechaFin < filters.fechaInicio) return false;
      if (filters.fechaFin && estimate.fechaInicio && estimate.fechaInicio > filters.fechaFin) return false;
      if (filters.pais && estimate.pais !== filters.pais) return false;
      if (filters.cliente && estimate.cliente !== filters.cliente) return false;
      if (filters.proyecto && estimate.proyecto !== filters.proyecto) return false;
      return true;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((estimate) => {
      groups.set([estimate.pais, estimate.cliente, estimate.proyecto].join("__"), estimate);
    });
  return Array.from(groups.values());
}

function getEstimateMonthKeys(estimates: ProjectEstimate[]) {
  return estimates.flatMap((estimate) => estimate.items.map((item) => estimateMonthKey(estimate, item.monthIndex)));
}

function estimateMonthKey(estimate: ProjectEstimate, monthIndex: number) {
  return `M${Math.max(1, monthIndex || 1)}`;
}

function getMonthKeys(rows: ComputedRecord[], estimates: ProjectEstimate[]) {
  return Array.from(new Set(rows.flatMap((row) => splitRowHoursByProjectMonth(row, estimates, row.horasRegistradas).map((item) => item.monthKey)))).sort(compareMonthKeys);
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort(compareMonthKeys);
}

function rowMonthKey(row: ComputedRecord, estimates: ProjectEstimate[] = []) {
  const date = row.fechaFin || row.fechaInicio || "";
  const projectStart = findProjectStart(row, estimates);
  if (!date || !projectStart) return "Sin fecha";
  return `M${monthIndexFromDate(projectStart, date)}`;
}

function splitRowHoursByProjectMonth(row: ComputedRecord, estimates: ProjectEstimate[], hours: number) {
  const projectStart = findProjectStart(row, estimates);
  const totalHours = Number.isFinite(hours) ? hours : 0;
  if (!projectStart) return [{ monthKey: "Sin fecha", horas: totalHours }];
  const startIndex = monthIndexFromDate(projectStart, row.fechaInicio || row.fechaFin);
  const endIndex = monthIndexFromDate(projectStart, row.fechaFin || row.fechaInicio);
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  const monthCount = Math.max(1, to - from + 1);
  const baseHours = round(totalHours / monthCount);
  let allocated = 0;
  return Array.from({ length: monthCount }, (_, index) => {
    const isLast = index === monthCount - 1;
    const horas = isLast ? round(totalHours - allocated) : baseHours;
    allocated += horas;
    return { monthKey: `M${from + index}`, horas };
  });
}

function monthLabel(monthKey: string) {
  if (monthKey === "Sin fecha") return monthKey;
  if (monthKey.startsWith("M")) return `Mes ${monthKey.slice(1)}`;
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}

function labelToMonthKey(label: string) {
  if (label === "Sin fecha") return label;
  if (label.startsWith("Mes ")) return `M${label.replace("Mes ", "")}`;
  const [month, year] = label.split("/");
  return year && month ? `${year}-${month}` : label;
}

function findProjectStart(row: ComputedRecord, estimates: ProjectEstimate[]) {
  const estimate = estimates.find((item) => item.pais === row.pais && item.cliente === row.cliente && item.proyecto === row.proyecto);
  return estimate?.fechaInicio || row.proyectoFechaInicio || row.fechaInicio || row.fechaFin;
}

function monthIndexFromDate(projectStart: string, rowDate: string) {
  const start = parseIsoDate(projectStart);
  const current = parseIsoDate(rowDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(current.getTime())) return 1;
  let monthIndex = 1;
  while (current.getTime() > addMonths(start, monthIndex).getTime()) monthIndex += 1;
  return monthIndex;
}

function parseIsoDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

function compareMonthKeys(a: string, b: string) {
  const aMonth = a.match(/^M(\d+)$/);
  const bMonth = b.match(/^M(\d+)$/);
  if (aMonth && bMonth) return Number(aMonth[1]) - Number(bMonth[1]);
  if (aMonth) return -1;
  if (bMonth) return 1;
  return a.localeCompare(b, "es");
}

function safeDivide(numerator: number, denominator: number) {
  if (!denominator || !Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  return numerator / denominator;
}

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}
