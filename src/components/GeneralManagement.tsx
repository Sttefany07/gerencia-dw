import { BarChart3, DollarSign, Landmark, Percent, TrendingUp } from "lucide-react";
import { ComputedRecord, FilterState, GeneralConsultantSummary, GeneralProjectSummary, NormalizedRecord, TariffRate } from "../types";
import { buildComputedRows, buildGeneralConsultantSummary, buildGeneralProjectSummary, filterRecords, generalTotals } from "../utils/calculations";
import { createExportSheet, exportSheetsToExcel } from "../utils/excel";
import { formatHours, formatMoney, formatPercent, formatPp } from "../utils/format";
import { Column, DataTable } from "./DataTable";
import { FilterPanel } from "./FilterPanel";
import { MetricCard } from "./MetricCard";

export function GeneralManagement({ records, filters, onFiltersChange, tariffs }: { records: NormalizedRecord[]; filters: FilterState; onFiltersChange: (filters: FilterState) => void; tariffs: TariffRate[] }) {
  const filtered = filterRecords(records, filters);
  const computed = buildComputedRows(filtered, tariffs);
  const summary = buildGeneralProjectSummary(computed);
  const consultants = buildGeneralConsultantSummary(computed);
  const total = generalTotals(computed);

  const summaryColumns: Column<GeneralProjectSummary>[] = [
    { id: "pais", header: "País", value: (row) => row.pais },
    { id: "cliente", header: "Cliente", value: (row) => row.cliente },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "ingresoEstimado", header: "Ingreso estimado", value: (row) => row.ingresoEstimado, render: (row) => formatMoney(row.ingresoEstimado, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoEstimado"), total.moneda) },
    { id: "ingresoReal", header: "Ingreso real", value: (row) => row.ingresoReal, render: (row) => formatMoney(row.ingresoReal, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoReal"), total.moneda) },
    { id: "costoEstimado70", header: "Costo estimado (70%)", value: (row) => row.costoEstimado70, render: (row) => formatMoney(row.costoEstimado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEstimado70"), total.moneda) },
    { id: "costoEjecutado70", header: "Costo ejecutado (70%)", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEjecutado70"), total.moneda) },
    { id: "proyeccionCosto", header: "Proyección de costo", value: (row) => row.proyeccionCosto, render: (row) => formatMoney(row.proyeccionCosto, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "proyeccionCosto"), total.moneda) },
    { id: "rentabilidadEstimada", header: "Rentabilidad estimada", value: (row) => row.rentabilidadEstimada, render: (row) => formatPercent(row.rentabilidadEstimada) },
    { id: "rentabilidadProyectada", header: "Rentabilidad proyectada", value: (row) => row.rentabilidadProyectada, render: (row) => formatPercent(row.rentabilidadProyectada) },
    { id: "desviacionPp", header: "Desviación (pp)", value: (row) => row.desviacionPp, render: (row) => formatPp(row.desviacionPp) }
  ];

  const consultantColumns: Column<GeneralConsultantSummary>[] = [
    { id: "consultor", header: "Consultor / Persona", value: (row) => row.consultor },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas, render: (row) => formatHours(row.horasRegistradas), total: true, totalRender: (rows) => formatHours(sum(rows, "horasRegistradas")) },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "ingresoGenerado", header: "Ingreso generado", value: (row) => row.ingresoGenerado, render: (row) => formatMoney(row.ingresoGenerado, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "ingresoGenerado"), total.moneda) },
    { id: "costoEjecutado70", header: "Costo ejecutado (70%)", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEjecutado70"), total.moneda) },
    { id: "margenGenerado", header: "Margen generado", value: (row) => row.margenGenerado, render: (row) => formatMoney(row.margenGenerado, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "margenGenerado"), total.moneda) },
    { id: "participacionMargen", header: "Participación en margen", value: (row) => row.participacionMargen, render: (row) => formatPercent(row.participacionMargen) }
  ];

  const detailColumns: Column<ComputedRecord>[] = [
    { id: "taskName", header: "Tarea", value: (row) => row.taskName },
    { id: "consultor", header: "Consultor", value: (row) => row.consultor },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "ingresoReal", header: "Ingreso real", value: (row) => row.ingresoReal, render: (row) => formatMoney(row.ingresoReal, row.moneda) },
    { id: "margenGenerado", header: "Margen", value: (row) => row.margenGenerado, render: (row) => formatMoney(row.margenGenerado, row.moneda) }
  ];

  const exportTab = () => exportSheetsToExcel([
    createExportSheet("Rentabilidad proyecto", summary, summaryColumns),
    createExportSheet("Rentabilidad consultor", consultants, consultantColumns),
    createExportSheet("Detalle tareas", computed, detailColumns)
  ], "gerencia_general");

  return (
    <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">GERENCIA GENERAL</h2>
          <p className="text-sm font-bold text-slate-500">Análisis financiero y rentabilidad de proyectos</p>
        </div>
        <button onClick={exportTab} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">Exportar pestaña completa</button>
      </div>
      <FilterPanel records={records} filters={filters} onChange={onFiltersChange} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={DollarSign} label="Ingreso estimado" value={formatMoney(total.ingresoEstimado, total.moneda)} />
        <MetricCard icon={Landmark} label="Ingreso real" value={formatMoney(total.ingresoReal, total.moneda)} />
        <MetricCard icon={DollarSign} label="Costo estimado (70%)" value={formatMoney(total.costoEstimado70, total.moneda)} />
        <MetricCard icon={DollarSign} label="Costo ejecutado (70%)" value={formatMoney(total.costoEjecutado70, total.moneda)} />
        <MetricCard icon={TrendingUp} label="Rentabilidad estimada" value={formatPercent(total.rentabilidadEstimada)} helper="(Ingreso estimado - costo) / ingreso" />
        <MetricCard icon={DollarSign} label="Proyección de costo" value={formatMoney(total.proyeccionCosto, total.moneda)} helper="Costo ejecutado / progreso" />
        <MetricCard icon={BarChart3} label="Rentabilidad proyectada" value={formatPercent(total.rentabilidadProyectada)} />
        <MetricCard icon={Percent} label="Desviación vs estimada" value={formatPp(total.desviacionPp)} helper="Rent. proyectada - estimada" />
      </div>
      <DataTable title="Rentabilidad por país, cliente y proyecto" rows={summary} columns={summaryColumns} fileName="rentabilidad_proyecto" />
      <DataTable title="Rentabilidad por consultor" rows={consultants} columns={consultantColumns} fileName="rentabilidad_consultor" />
      <div className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-600">
        Tarifa única = 100% &nbsp; | &nbsp; Costo por hora = Tarifa × 0.70 &nbsp; | &nbsp; Margen esperado por hora = Tarifa × 0.30
      </div>
    </section>
  );
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
}
