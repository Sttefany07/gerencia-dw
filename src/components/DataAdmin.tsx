import { ChangeEvent, useState } from "react";
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { TariffRate, UploadItem, ValidationWarning } from "../types";
import { readWorkbook } from "../utils/excel";
import { normalizeExcelRows } from "../utils/normalize";
import { createId } from "../utils/ids";
import { formatMoney } from "../utils/format";

export function DataAdmin({
  uploads,
  activeUploadId,
  tariffs,
  onCreateUpload,
  onActivateUpload,
  onDeleteUpload,
  onTariffsChange
}: {
  uploads: UploadItem[];
  activeUploadId: string;
  tariffs: TariffRate[];
  onCreateUpload: (upload: Omit<UploadItem, "id" | "uploadedAt" | "status">) => void;
  onActivateUpload: (id: string) => void;
  onDeleteUpload: (id: string) => void;
  onTariffsChange: (rates: TariffRate[]) => void;
}) {
  return (
    <details className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-slate-900">
        Administración de datos: cargar Excel, historial y tarifas
      </summary>
      <div className="grid gap-5 border-t border-slate-200 p-4 lg:grid-cols-[1fr_1.4fr]">
        <UploadBox uploads={uploads} activeUploadId={activeUploadId} onCreateUpload={onCreateUpload} onActivateUpload={onActivateUpload} onDeleteUpload={onDeleteUpload} />
        <TariffEditor tariffs={tariffs} onChange={onTariffsChange} />
      </div>
    </details>
  );
}

function UploadBox({
  uploads,
  activeUploadId,
  onCreateUpload,
  onActivateUpload,
  onDeleteUpload
}: {
  uploads: UploadItem[];
  activeUploadId: string;
  onCreateUpload: (upload: Omit<UploadItem, "id" | "uploadedAt" | "status">) => void;
  onActivateUpload: (id: string) => void;
  onDeleteUpload: (id: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const rawRows = await readWorkbook(file);
      const normalized = normalizeExcelRows(rawRows);
      if (!normalized.records.length) {
        setError("No se encontraron tareas finales con persona asignada para contabilizar.");
        return;
      }
      onCreateUpload({
        fileName: file.name,
        rowCount: normalized.records.length,
        records: normalized.records,
        warnings: normalized.warnings
      });
    } catch (err) {
      console.error(err);
      setError("No se pudo leer el Excel. Revisa que sea .xlsx y tenga columnas de ClickUp.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const active = uploads.find((upload) => upload.id === activeUploadId) ?? uploads[0];

  return (
    <section className="grid gap-3">
      <h3 className="text-sm font-black text-slate-900">Carga del Excel</h3>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-8 text-center hover:bg-blue-100">
        <FileSpreadsheet className="text-blue-700" />
        <span className="text-sm font-black text-blue-900">{loading ? "Procesando..." : "Seleccionar Excel de ClickUp"}</span>
        <span className="text-xs font-semibold text-blue-700">Solo se suman tareas finales con Assignee</span>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={loading} />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
      {active && (
        <div className="rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
          <p><b>Activa:</b> {active.fileName}</p>
          <p><b>Filas contabilizadas:</b> {active.rowCount}</p>
          {active.warnings.slice(0, 2).map((warning) => (
            <p key={warning.id} className="mt-2 text-blue-700">{warning.message} {warning.count ? `(${warning.count})` : ""}</p>
          ))}
        </div>
      )}
      <div className="grid gap-2">
        {uploads.map((upload) => (
          <div key={upload.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-2 text-xs">
            <button onClick={() => onActivateUpload(upload.id)} className={`text-left font-bold ${upload.id === activeUploadId ? "text-blue-700" : "text-slate-700"}`}>
              {upload.fileName}<br />
              <span className="font-semibold text-slate-500">{new Date(upload.uploadedAt).toLocaleString()}</span>
            </button>
            <button onClick={() => onDeleteUpload(upload.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Eliminar carga">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TariffEditor({ tariffs, onChange }: { tariffs: TariffRate[]; onChange: (rates: TariffRate[]) => void }) {
  const update = (id: string, patch: Partial<TariffRate>) => onChange(tariffs.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate)));
  const add = () => onChange([{ id: createId("tariff"), pais: "Todos", cliente: "Todos", proyecto: "Todos", perfil: "Nuevo perfil", tarifa: 0, moneda: "USD", status: "Activo" }, ...tariffs]);
  const remove = (id: string) => onChange(tariffs.filter((rate) => rate.id !== id));

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">Tarifas</h3>
          <p className="text-xs font-semibold text-slate-500">Tarifa = 100%. Costo = tarifa × 0.70.</p>
        </div>
        <button onClick={add} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"><Plus size={14} /> Agregar</button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-xs">
          <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
            <tr>
              {['País','Cliente','Proyecto','Perfil','Tarifa','Moneda','Costo 70%',''].map((header) => <th key={header} className="px-3 py-2 font-black">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tariffs.map((rate) => (
              <tr key={rate.id}>
                <td className="px-2 py-2"><Input value={rate.pais} onChange={(value) => update(rate.id, { pais: value })} /></td>
                <td className="px-2 py-2"><Input value={rate.cliente} onChange={(value) => update(rate.id, { cliente: value })} /></td>
                <td className="px-2 py-2"><Input value={rate.proyecto} onChange={(value) => update(rate.id, { proyecto: value })} /></td>
                <td className="px-2 py-2"><Input value={rate.perfil} onChange={(value) => update(rate.id, { perfil: value })} /></td>
                <td className="px-2 py-2"><input type="number" value={rate.tarifa} onChange={(event) => update(rate.id, { tarifa: Number(event.target.value) })} className="w-24 rounded-lg border border-slate-200 px-2 py-2 font-semibold" /></td>
                <td className="px-2 py-2"><select value={rate.moneda} onChange={(event) => update(rate.id, { moneda: event.target.value as TariffRate['moneda'] })} className="rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option value="USD">USD</option><option value="PEN">PEN</option></select></td>
                <td className="px-2 py-2 font-black text-slate-700">{formatMoney(rate.tarifa * 0.7, rate.moneda)}</td>
                <td className="px-2 py-2"><button onClick={() => remove(rate.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {tariffs.map((rate) => (
          <article key={rate.id} className="grid gap-2 rounded-2xl border border-slate-200 p-3">
            <Input label="País" value={rate.pais} onChange={(value) => update(rate.id, { pais: value })} />
            <Input label="Cliente" value={rate.cliente} onChange={(value) => update(rate.id, { cliente: value })} />
            <Input label="Proyecto" value={rate.proyecto} onChange={(value) => update(rate.id, { proyecto: value })} />
            <Input label="Perfil" value={rate.perfil} onChange={(value) => update(rate.id, { perfil: value })} />
            <label className="grid gap-1 text-xs font-black text-slate-700">Tarifa<input type="number" value={rate.tarifa} onChange={(event) => update(rate.id, { tarifa: Number(event.target.value) })} className="rounded-lg border border-slate-200 px-2 py-2 font-semibold" /></label>
            <button onClick={() => remove(rate.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600">Eliminar</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label?: string; value: string; onChange: (value: string) => void }) {
  const input = <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500" />;
  if (!label) return input;
  return <label className="grid gap-1 text-xs font-black text-slate-700">{label}{input}</label>;
}
