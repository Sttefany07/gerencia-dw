import { Download } from "lucide-react";
import { CommercialRate, ComputedRow, ConsultantSummaryRow, FilterState, NormalizedRecord, OperationRate, SummaryRow } from "../types";
import {
  buildComputedRows,
  buildConsultantSummary,
  buildGeneralSummary,
  filterRecords,
  totals
} from "../utils/calculations";
import { createExportSheet, exportSheetsToExcel } from "../utils/excel";
import { formatMoney } from "../utils/format";
import { Badge } from "./Badge";
import { Column, DataTable } from "./DataTable";
import { FilterPanel } from "./FilterPanel";
import { SummaryCards } from "./SummaryCards";

type Props = {
  records: NormalizedRecord[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  operationRates: OperationRate[];
  commercialRates: CommercialRate[];
};

export function GeneralManagement({ records, filters, onFiltersChange, operationRates, commercialRates }: Props) {
  const filtered = filterRecords(records, filters);
  const computed = buildComputedRows(filtered, operationRates, commercialRates);
  const summary = buildGeneralSummary(computed);
  const consultantSummary = buildConsultantSummary(computed);
  const totalValues = totals(computed);

  const summaryColumns: Column<SummaryRow>[] = [
    { id: "pais", header: "País", value: (row) => row.pais, width: "150px" },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto, width: "220px" },
    { id: "horasEstimadas", header: "Horas estimadas", value: (row) => row.horasEstimadas, numeric: true, total: true },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas, numeric: true, total: true },
    { id: "horasFacturables", header: "Horas facturables", value: (row) => row.horasFacturables, numeric: true, total: true },
    { id: "facturacionEstimadaComercial", header: "Facturación estimada comercial", value: (row) => row.facturacionEstimadaComercial ?? 0, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionEstimadaComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionEstimadaComercial, row.monedaComercial) },
    { id: "facturacionRegistradaComercial", header: "Facturación registrada comercial", value: (row) => row.facturacionRegistradaComercial ?? 0, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionRegistradaComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionRegistradaComercial, row.monedaComercial) },
    { id: "facturacionRealComercial", header: "Facturación real comercial", value: (row) => row.facturacionRealComercial ?? 0, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionRealComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionRealComercial, row.monedaComercial) },
    { id: "costoRealOperaciones", header: "Costo real operaciones", value: (row) => row.costoRealOperaciones, total: true, totalRender: (rows) => formatMoney(sum(rows, "costoRealOperaciones"), resolveCurrency(rows.map((row) => row.monedaOperaciones))), render: (row) => formatMoney(row.costoRealOperaciones, row.monedaOperaciones) },
    { id: "resultadoOperativo", header: "Resultado operativo", value: (row) => row.resultadoOperativo ?? 0, total: true, totalRender: (rows) => resultBadge(sum(rows, "resultadoOperativo"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => resultBadge(row.resultadoOperativo ?? 0, row.monedaComercial) }
  ];

  const consultantColumns: Column<ConsultantSummaryRow>[] = [
    { id: "persona", header: "Consultor / Persona", value: (row) => row.persona, width: "220px" },
    { id: "paises", header: "País principal", value: (row) => row.paises, width: "160px" },
    { id: "clientes", header: "Cliente principal", value: (row) => row.clientes, width: "220px" },
    { id: "proyectos", header: "Proyecto principal", value: (row) => row.proyectos, width: "260px" },
    { id: "roles", header: "Rol principal", value: (row) => row.roles, width: "180px" },
    { id: "horasEstimadas", header: "Horas estimadas", value: (row) => row.horasEstimadas, numeric: true, total: true },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas, numeric: true, total: true },
    { id: "horasFacturables", header: "Horas facturables", value: (row) => row.horasFacturables, numeric: true, total: true },
    { id: "facturacionEstimadaComercial", header: "Facturación estimada comercial", value: (row) => row.facturacionEstimadaComercial, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionEstimadaComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionEstimadaComercial, row.monedaComercial) },
    { id: "facturacionRegistradaComercial", header: "Facturación registrada comercial", value: (row) => row.facturacionRegistradaComercial, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionRegistradaComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionRegistradaComercial, row.monedaComercial) },
    { id: "facturacionRealComercial", header: "Facturación real comercial", value: (row) => row.facturacionRealComercial, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionRealComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionRealComercial, row.monedaComercial) },
    { id: "costoRealOperaciones", header: "Costo real operaciones", value: (row) => row.costoRealOperaciones, total: true, totalRender: (rows) => formatMoney(sum(rows, "costoRealOperaciones"), resolveCurrency(rows.map((row) => row.monedaOperaciones))), render: (row) => formatMoney(row.costoRealOperaciones, row.monedaOperaciones) },
    { id: "resultadoOperativo", header: "Resultado operativo", value: (row) => row.resultadoOperativo ?? 0, total: true, totalRender: (rows) => resultBadge(sum(rows, "resultadoOperativo"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => resultBadge(row.resultadoOperativo ?? 0, row.monedaComercial ?? "USD") }
  ];

  const detailColumns: Column<ComputedRow>[] = [
    { id: "pais", header: "País", value: (row) => row.pais, width: "120px" },
    { id: "cliente", header: "Cliente", value: (row) => row.cliente, width: "160px" },
    { id: "proyecto", header: "Proyecto", value: (row) => row.proyecto, width: "220px" },
    { id: "hitoFacturable", header: "Hito facturable", value: (row) => row.hitoFacturable, width: "160px" },
    { id: "rolEstimado", header: "Rol estimado", value: (row) => row.rolEstimado, width: "150px" },
    { id: "rolAsignado", header: "Rol asignado", value: (row) => row.rolAsignado, width: "150px" },
    { id: "persona", header: "Persona", value: (row) => row.persona, width: "180px" },
    { id: "horasEstimadas", header: "Horas estimadas", value: (row) => row.horasEstimadas, numeric: true, total: true },
    { id: "horasRegistradas", header: "Horas registradas", value: (row) => row.horasRegistradas, numeric: true, total: true },
    { id: "horasFacturables", header: "Horas facturables", value: (row) => row.horasFacturables, numeric: true, total: true },
    { id: "tarifaOperacionesHora", header: "Tarifa operaciones/hora", value: (row) => row.tarifaOperacionesHora ?? 0, render: (row) => row.tarifaOperacionesHora ? formatMoney(row.tarifaOperacionesHora, row.monedaOperaciones) : <Badge tone="orange">Sin tarifa</Badge> },
    { id: "tarifaComercialHora", header: "Tarifa comercial/hora", value: (row) => row.tarifaComercialHora ?? 0, render: (row) => row.tarifaComercialHora ? formatMoney(row.tarifaComercialHora, row.monedaComercial) : <Badge tone="orange">Sin tarifa</Badge> },
    { id: "facturacionEstimadaComercial", header: "Facturación estimada comercial", value: (row) => row.facturacionEstimadaComercial ?? 0, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionEstimadaComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionEstimadaComercial, row.monedaComercial) },
    { id: "facturacionRegistradaComercial", header: "Facturación registrada comercial", value: (row) => row.facturacionRegistradaComercial ?? 0, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionRegistradaComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionRegistradaComercial, row.monedaComercial) },
    { id: "facturacionRealComercial", header: "Facturación real comercial", value: (row) => row.facturacionRealComercial ?? 0, total: true, totalRender: (rows) => formatMoney(sum(rows, "facturacionRealComercial"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => moneyOrNoTariff(row.facturacionRealComercial, row.monedaComercial) },
    { id: "costoRealOperaciones", header: "Costo real operaciones", value: (row) => row.costoRealOperaciones, total: true, totalRender: (rows) => formatMoney(sum(rows, "costoRealOperaciones"), resolveCurrency(rows.map((row) => row.monedaOperaciones))), render: (row) => formatMoney(row.costoRealOperaciones, row.monedaOperaciones) },
    { id: "resultadoOperativo", header: "Resultado operativo", value: (row) => row.resultadoOperativo ?? 0, total: true, totalRender: (rows) => resultBadge(sum(rows, "resultadoOperativo"), resolveCurrency(rows.map((row) => row.monedaComercial))), render: (row) => resultBadge(row.resultadoOperativo ?? 0, row.monedaComercial ?? "USD") }
  ];

  const exportTab = () => {
    exportSheetsToExcel(
      [
        createExportSheet("Resumen proyecto", summary, summaryColumns),
        createExportSheet("Resumen consultor", consultantSummary, consultantColumns),
        createExportSheet("Detalle completo", computed, detailColumns)
      ],
      "gerencia_general_pestana_completa"
    );
  };

  return (
    <div className="grid gap-4 sm:gap-6">
      <section className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">📊 Gerencia General</h2>
          </div>
          <button onClick={exportTab} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto">
            <Download size={16} /> Exportar pestaña completa
          </button>
        </div>
      </section>

      <FilterPanel records={records} filters={filters} onChange={onFiltersChange} />
      <SummaryCards {...totalValues} />

      <DataTable
        title="Resumen por país y proyecto"
        rows={summary}
        columns={summaryColumns}
        fileName="gerencia_general_resumen_filtrado"
      />

      <DataTable
        title="Resumen por consultor / persona"
        rows={consultantSummary}
        columns={consultantColumns}
        fileName="gerencia_general_resumen_consultor_filtrado"
      />
    </div>
  );
}

function moneyOrNoTariff(value: number | null | undefined, currency?: string | null) {
  return currency === "Sin tarifa" ? <Badge tone="orange">Sin tarifa</Badge> : formatMoney(value, currency);
}

function resultBadge(value: number, currency?: string | null) {
  const tone = value >= 0 ? "green" : "red";
  return <Badge tone={tone}>{formatMoney(value, currency)}</Badge>;
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((acc, row) => {
    const value = Number(row[key] ?? 0);
    return Number.isFinite(value) ? acc + value : acc;
  }, 0);
}

function resolveCurrency(values: Array<string | null | undefined>) {
  const uniques = [...new Set(values.filter((value) => value && value !== "Sin tarifa"))] as string[];
  if (uniques.length === 0) return "USD";
  if (uniques.length === 1) return uniques[0];
  return uniques.join("/");
}
