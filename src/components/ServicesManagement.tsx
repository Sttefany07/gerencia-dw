import { Clock, DollarSign, Gauge, ReceiptText, Timer, WalletCards } from "lucide-react";
import { ComputedRecord, FilterState, NormalizedRecord, ServiceConsultantSummary, ServiceProjectSummary } from "../types";
import { buildComputedRows, buildServiceConsultantSummary, buildServiceProjectSummary, filterRecords, serviceTotals } from "../utils/calculations";
import { createExportSheet, exportSheetsToExcel } from "../utils/excel";
import { formatHours, formatMoney, formatPercent } from "../utils/format";
import { Column, DataTable } from "./DataTable";
import { FilterPanel } from "./FilterPanel";
import { MetricCard } from "./MetricCard";
import { TariffRate } from "../types";

export function ServicesManagement({ records, filters, onFiltersChange, tariffs }: { records: NormalizedRecord[]; filters: FilterState; onFiltersChange: (filters: FilterState) => void; tariffs: TariffRate[] }) {
  const filtered = filterRecords(records, filters);
  const computed = buildComputedRows(filtered, tariffs);
  const summary = buildServiceProjectSummary(computed);
  const consultants = buildServiceConsultantSummary(computed);
  const total = serviceTotals(computed);

  const summaryColumns: Column<ServiceProjectSummary>[] = [
    { id: "pais", header: "País", value: (row) => row.pais },
    { id: "cliente", header: "Cliente", value: (row) => row.cliente },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "horasEstimadas", header: "Horas estimadas", value: (row) => row.horasEstimadas, total: true },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas, total: true },
    { id: "horasFacturables", header: "Horas facturables", value: (row) => row.horasFacturables, total: true },
    { id: "progreso", header: "Progreso", value: (row) => row.progreso, render: (row) => formatPercent(row.progreso) },
    { id: "costoEstimado70", header: "Costo estimado (70%)", value: (row) => row.costoEstimado70, render: (row) => formatMoney(row.costoEstimado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEstimado70"), total.moneda) },
    { id: "costoEjecutado70", header: "Costo ejecutado (70%)", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEjecutado70"), total.moneda) },
    { id: "saldoDisponible70", header: "Saldo disponible (70%)", value: (row) => row.saldoDisponible70, render: (row) => formatMoney(row.saldoDisponible70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "saldoDisponible70"), total.moneda) }
  ];

  const consultantColumns: Column<ServiceConsultantSummary>[] = [
    { id: "consultor", header: "Consultor / Persona", value: (row) => row.consultor },
    { id: "pais", header: "País", value: (row) => row.pais },
    { id: "cliente", header: "Cliente", value: (row) => row.cliente },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "horasEstimadas", header: "Horas estimadas", value: (row) => row.horasEstimadas, total: true },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas, total: true },
    { id: "horasFacturables", header: "Horas facturables", value: (row) => row.horasFacturables, total: true },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "costoPorHora70", header: "Costo por hora (70%)", value: (row) => row.costoPorHora70, render: (row) => formatMoney(row.costoPorHora70, row.moneda) },
    { id: "costoEjecutado70", header: "Costo ejecutado (70%)", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda), total: true, totalRender: (rows) => formatMoney(sum(rows, "costoEjecutado70"), total.moneda) },
    { id: "progreso", header: "Progreso", value: (row) => row.progreso, render: (row) => formatPercent(row.progreso) }
  ];

  const detailColumns: Column<ComputedRecord>[] = [
    { id: "taskName", header: "Tarea", value: (row) => row.taskName },
    { id: "consultor", header: "Consultor", value: (row) => row.consultor },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto },
    { id: "perfil", header: "Perfil", value: (row) => row.perfil },
    { id: "horasEstimadas", header: "Horas estimadas", value: (row) => row.horasEstimadas },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas },
    { id: "horasFacturables", header: "Horas facturables", value: (row) => row.horasFacturables },
    { id: "tarifa", header: "Tarifa", value: (row) => row.tarifa, render: (row) => formatMoney(row.tarifa, row.moneda) },
    { id: "costoEjecutado70", header: "Costo ejecutado", value: (row) => row.costoEjecutado70, render: (row) => formatMoney(row.costoEjecutado70, row.moneda) }
  ];

  const exportTab = () => exportSheetsToExcel([
    createExportSheet("Resumen operativo", summary, summaryColumns),
    createExportSheet("Desglose consultor", consultants, consultantColumns),
    createExportSheet("Detalle tareas", computed, detailColumns)
  ], "gerencia_servicios");

  return (
    <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">GERENCIA DE SERVICIOS</h2>
          <p className="text-sm font-bold text-slate-500">Seguimiento operativo de proyectos</p>
        </div>
        <button onClick={exportTab} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">Exportar pestaña completa</button>
      </div>
      <FilterPanel records={records} filters={filters} onChange={onFiltersChange} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Clock} label="Horas estimadas" value={formatHours(total.horasEstimadas)} />
        <MetricCard icon={Timer} label="Horas registradas" value={formatHours(total.horasRegistradas)} />
        <MetricCard icon={ReceiptText} label="Horas facturables" value={formatHours(total.horasFacturables)} />
        <MetricCard icon={WalletCards} label="Horas no facturables" value={formatHours(total.horasNoFacturables)} />
        <MetricCard icon={Gauge} label="Progreso" value={formatPercent(total.progreso)} helper="Registradas / estimadas" />
        <MetricCard icon={DollarSign} label="Costo estimado (70%)" value={formatMoney(total.costoEstimado70, total.moneda)} />
        <MetricCard icon={DollarSign} label="Costo ejecutado (70%)" value={formatMoney(total.costoEjecutado70, total.moneda)} />
        <MetricCard icon={DollarSign} label="Saldo disponible (70%)" value={formatMoney(total.saldoDisponible70, total.moneda)} />
      </div>
      <DataTable title="Resumen operativo por país, cliente y proyecto" rows={summary} columns={summaryColumns} fileName="resumen_operativo" />
      <DataTable title="Desglose por consultor" rows={consultants} columns={consultantColumns} fileName="desglose_consultor_servicios" />
    </section>
  );
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
}
