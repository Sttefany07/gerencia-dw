import { BarChart3, DollarSign, Gauge, Landmark, Percent, TrendingUp } from "lucide-react";
import { ComputedRecord, FilterState, GeneralProjectSummary, NormalizedRecord, ProjectEstimate, TariffRate } from "../types";
import { buildComputedRows, buildGeneralProjectSummary, filterRecords, generalTotals } from "../utils/calculations";
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
  const summary = buildGeneralProjectSummary(computed);
  const total = generalTotals(computed);
  const theoretical = buildTheoreticalRows(computed);
  const executed = buildExecutedRows(computed);

  const theoreticalColumns: Column<FinancialTheoryRow>[] = [
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
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
    { id: "horas", header: "Total horas", value: (row) => row.horas, total: true, totalRender: (rows) => formatHours(sum(rows, "horas")) },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "ingreso", header: "Ingreso", value: (row) => row.ingreso, render: (row) => formatMoney(row.ingreso, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingreso"), total.moneda) },
    { id: "costoHora", header: "Costo por hora", value: (row) => row.costoHora, render: (row) => formatMoney(row.costoHora, row.moneda) },
    { id: "costo", header: "Costo", value: (row) => row.costo, render: (row) => formatMoney(row.costo, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costo"), total.moneda) }
  ];

  const summaryColumns: Column<GeneralProjectSummary>[] = [
    { id: "pais", header: "Pais", value: (row) => row.pais },
    { id: "cliente", header: "Cliente", value: (row) => row.cliente },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "estimacionVersion", header: "Estimacion", value: (row) => row.estimacionVersion },
    { id: "ingresoEstimado", header: "Ingreso estimado", value: (row) => row.ingresoEstimado, render: (row) => formatMoney(row.ingresoEstimado, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoEstimado"), total.moneda) },
    { id: "ingresoReal", header: "Ingreso real", value: (row) => row.ingresoReal, render: (row) => formatMoney(row.ingresoReal, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoReal"), total.moneda) },
    { id: "costoEstimado70", header: "Costo estimado 70%", value: (row) => row.costoEstimado70, render: (row) => formatMoney(row.costoEstimado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEstimado70"), total.moneda) },
    { id: "costoEjecutado70", header: "Costo real 70%", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEjecutado70"), total.moneda) },
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
        createExportSheet("Rentabilidad proyecto", summary, summaryColumns),
        createExportSheet("Estimado teorico", theoretical, theoreticalColumns),
        createExportSheet("Ejecutado", executed, executedColumns),
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
      <DataTable title="Rentabilidad por proyecto" rows={summary} columns={summaryColumns} fileName="rentabilidad_proyecto" />
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
  moneda: ComputedRecord["moneda"];
  horas: number;
  tarifa: number;
  ingreso: number;
  costoHora: number;
  costo: number;
};

type FinancialExecutedRow = FinancialTheoryRow & {
  consultor: string;
  proyecto: string;
};

function buildTheoreticalRows(rows: ComputedRecord[]): FinancialTheoryRow[] {
  const groups = new Map<string, FinancialTheoryRow>();
  rows.forEach((row) => {
    const current = groups.get(row.perfil) ?? {
      id: row.perfil,
      perfil: row.perfil,
      moneda: row.moneda,
      horas: 0,
      tarifa: row.tarifa,
      ingreso: 0,
      costoHora: row.costoPorHora70,
      costo: 0
    };
    current.horas += row.horasEstimadas;
    current.ingreso += row.ingresoEstimado;
    current.costo += row.costoEstimado70;
    groups.set(row.perfil, current);
  });
  return Array.from(groups.values()).map(roundFinancialRow);
}

function buildExecutedRows(rows: ComputedRecord[]): FinancialExecutedRow[] {
  const groups = new Map<string, FinancialExecutedRow>();
  rows.forEach((row) => {
    const key = [row.perfil, row.consultor, row.proyecto].join("__");
    const current = groups.get(key) ?? {
      id: key,
      perfil: row.perfil,
      consultor: row.consultor,
      proyecto: row.proyecto,
      moneda: row.moneda,
      horas: 0,
      tarifa: row.tarifa,
      ingreso: 0,
      costoHora: row.costoPorHora70,
      costo: 0
    };
    current.horas += row.horasRegistradas;
    current.ingreso += row.ingresoReal;
    current.costo += row.costoEjecutado70;
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
