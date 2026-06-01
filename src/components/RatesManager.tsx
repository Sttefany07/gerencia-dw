import { Download, Plus, Save } from "lucide-react";
import { useState } from "react";
import { CommercialRate, CurrencyCode, OperationRate } from "../types";
import { createExportSheet, exportRowsToExcel, exportSheetsToExcel } from "../utils/excel";
import { formatMoney } from "../utils/format";
import { createId } from "../utils/ids";
import { Badge } from "./Badge";

const currencyOptions: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "PEN", label: "PEN" }
];

type Props = {
  operationRates: OperationRate[];
  commercialRates: CommercialRate[];
  onOperationRatesChange: (rates: OperationRate[]) => void;
  onCommercialRatesChange: (rates: CommercialRate[]) => void;
};

export function RatesManager({ operationRates, commercialRates, onOperationRatesChange, onCommercialRatesChange }: Props) {
  const [editingOperationIds, setEditingOperationIds] = useState<Set<string>>(new Set());
  const [editingCommercialIds, setEditingCommercialIds] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);

  const addOperationRole = () => {
    onOperationRatesChange([
      ...operationRates,
      { id: createId("op_rate"), role: "Nuevo rol", rate: 0, currency: "USD", updatedAt: today, status: "Activo" }
    ]);
  };

  const addCommercialRole = () => {
    onCommercialRatesChange([
      ...commercialRates,
      {
        id: createId("com_rate"),
        pais: "No definido",
        cliente: "No definido",
        proyecto: "No definido",
        role: "Nuevo rol",
        rate: 0,
        currency: "USD",
        validFrom: today,
        status: "Activo"
      }
    ]);
  };

  const operationColumns = [
    { header: "Rol", value: (row: OperationRate) => row.role },
    { header: "Tarifa operaciones/hora", value: (row: OperationRate) => formatMoney(row.rate, row.currency ?? "USD") },
    { header: "Fecha actualización", value: (row: OperationRate) => row.updatedAt },
    { header: "Estado", value: (row: OperationRate) => row.status }
  ];

  const commercialColumns = [
    { header: "País", value: (row: CommercialRate) => row.pais },
    { header: "Cliente", value: (row: CommercialRate) => row.cliente },
    { header: "Proyecto", value: (row: CommercialRate) => row.proyecto },
    { header: "Rol", value: (row: CommercialRate) => row.role },
    { header: "Tarifa comercial/hora", value: (row: CommercialRate) => formatMoney(row.rate, row.currency ?? "USD") },
    { header: "Fecha vigencia", value: (row: CommercialRate) => row.validFrom },
    { header: "Estado", value: (row: CommercialRate) => row.status }
  ];

  const exportOperation = () => {
    exportRowsToExcel(operationRates, operationColumns, "tarifas_operaciones");
  };

  const exportCommercial = () => {
    exportRowsToExcel(commercialRates, commercialColumns, "tarifas_comerciales");
  };

  const exportTab = () => {
    exportSheetsToExcel(
      [
        createExportSheet("Tarifas operaciones", operationRates, operationColumns),
        createExportSheet("Tarifas comerciales", commercialRates, commercialColumns)
      ],
      "tarifas_pestana_completa"
    );
  };

  const updateOperation = (id: string, patch: Partial<OperationRate>) => {
    onOperationRatesChange(operationRates.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate)));
  };

  const updateCommercial = (id: string, patch: Partial<CommercialRate>) => {
    onCommercialRatesChange(commercialRates.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate)));
  };

  const saveOperation = (id: string) => {
    const currentRate = operationRates.find((rate) => rate.id === id);
    updateOperation(id, { updatedAt: today, rate: toTwoDecimals(currentRate?.rate ?? 0), currency: currentRate?.currency ?? "USD" });
    setEditingOperationIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const saveCommercial = (id: string) => {
    const currentRate = commercialRates.find((rate) => rate.id === id);
    updateCommercial(id, {
      validFrom: currentRate?.validFrom || today,
      rate: toTwoDecimals(currentRate?.rate ?? 0),
      currency: currentRate?.currency ?? "USD"
    });
    setEditingCommercialIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="grid gap-4 sm:gap-6">
      <section className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Tarifas por rol</h2>
          </div>
          <button onClick={exportTab} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto">
            <Download size={16} /> Exportar pestaña completa
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">Tarifas internas de operaciones</h3>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button onClick={addOperationRole} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 sm:w-auto">
              <Plus size={16} /> Agregar rol
            </button>
            <button onClick={exportOperation} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto">
              <Download size={16} /> Descargar Excel
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1050px] text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3 text-left">Rol</th>
                <th className="px-3 py-3 text-left">Tarifa operaciones/hora</th>
                <th className="px-3 py-3 text-left">Fecha actualización</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-center">Editar</th>
                <th className="px-3 py-3 text-center">Guardar</th>
              </tr>
            </thead>
            <tbody>
              {operationRates.map((rate) => {
                const editing = editingOperationIds.has(rate.id);
                return (
                  <tr key={rate.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <input
                        disabled={!editing}
                        value={rate.role}
                        onChange={(event) => updateOperation(rate.id, { role: event.target.value })}
                        className="w-56 rounded-lg border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={rate.currency ?? "USD"}
                            onChange={(event) => updateOperation(rate.id, { currency: event.target.value as CurrencyCode })}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                          >
                            {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formatRateInput(rate.rate)}
                            onChange={(event) => updateOperation(rate.id, { rate: Number(event.target.value) })}
                            onBlur={() => updateOperation(rate.id, { rate: toTwoDecimals(rate.rate) })}
                            className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-right tabular-nums"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">{formatMoney(rate.rate, rate.currency ?? "USD")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{rate.updatedAt}</td>
                    <td className="px-3 py-2">
                      <select
                        disabled={!editing}
                        value={rate.status}
                        onChange={(event) => updateOperation(rate.id, { status: event.target.value as OperationRate["status"] })}
                        className="rounded-lg border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent"
                      >
                        <option>Activo</option>
                        <option>Inactivo</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setEditingOperationIds((current) => new Set(current).add(rate.id))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                        Editar
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => saveOperation(rate.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">
                        <Save size={13} /> Guardar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {operationRates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">Carga un Excel o agrega roles manualmente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">Tarifas comerciales por proyecto y rol</h3>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button onClick={addCommercialRole} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 sm:w-auto">
              <Plus size={16} /> Agregar tarifa
            </button>
            <button onClick={exportCommercial} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto">
              <Download size={16} /> Descargar Excel
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1600px] text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3 text-left">País</th>
                <th className="px-3 py-3 text-left">Cliente</th>
                <th className="px-3 py-3 text-left">Proyecto</th>
                <th className="px-3 py-3 text-left">Rol</th>
                <th className="px-3 py-3 text-left">Tarifa comercial/hora</th>
                <th className="px-3 py-3 text-left">Fecha vigencia</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-center">Editar</th>
                <th className="px-3 py-3 text-center">Guardar</th>
              </tr>
            </thead>
            <tbody>
              {commercialRates.map((rate) => {
                const editing = editingCommercialIds.has(rate.id);
                return (
                  <tr key={rate.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                    {(["pais", "cliente", "proyecto", "role"] as const).map((field) => (
                      <td className="px-3 py-2" key={field}>
                        <input
                          disabled={!editing}
                          value={rate[field]}
                          onChange={(event) => updateCommercial(rate.id, { [field]: event.target.value })}
                          className="w-44 rounded-lg border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {editing ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={rate.currency ?? "USD"}
                            onChange={(event) => updateCommercial(rate.id, { currency: event.target.value as CurrencyCode })}
                            className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                          >
                            {currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formatRateInput(rate.rate)}
                            onChange={(event) => updateCommercial(rate.id, { rate: Number(event.target.value) })}
                            onBlur={() => updateCommercial(rate.id, { rate: toTwoDecimals(rate.rate) })}
                            className="w-40 rounded-lg border border-slate-300 px-2 py-1 text-right tabular-nums"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">{formatMoney(rate.rate, rate.currency ?? "USD")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        disabled={!editing}
                        type="date"
                        value={rate.validFrom}
                        onChange={(event) => updateCommercial(rate.id, { validFrom: event.target.value })}
                        className="rounded-lg border border-slate-300 px-2 py-1 disabled:border-transparent disabled:bg-transparent"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <select
                          value={rate.status}
                          onChange={(event) => updateCommercial(rate.id, { status: event.target.value as CommercialRate["status"] })}
                          className="rounded-lg border border-slate-300 px-2 py-1"
                        >
                          <option>Activo</option>
                          <option>Inactivo</option>
                        </select>
                      ) : (
                        <Badge tone={rate.status === "Activo" ? "green" : "gray"}>{rate.status}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setEditingCommercialIds((current) => new Set(current).add(rate.id))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50">
                        Editar
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => saveCommercial(rate.id)} className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">
                        <Save size={13} /> Guardar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {commercialRates.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-500">Carga un Excel o agrega tarifas comerciales manualmente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function toTwoDecimals(value: number) {
  return Math.round(((Number.isFinite(value) ? value : 0) + Number.EPSILON) * 100) / 100;
}

function formatRateInput(value: number) {
  return toTwoDecimals(value).toFixed(2);
}
