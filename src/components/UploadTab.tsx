import { ChangeEvent, useState } from "react";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { UploadItem } from "../types";
import { readWorkbook } from "../utils/excel";
import { normalizeExcelRows } from "../utils/normalize";

export function UploadTab({
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
  const active = uploads.find((upload) => upload.id === activeUploadId) ?? uploads[0];

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

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <h2 className="text-lg font-black text-slate-950">Carga de Excel</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Carga el Excel exportado de ClickUp. Solo se contabilizan tareas finales con persona asignada.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-10 text-center hover:bg-blue-100">
            <FileSpreadsheet className="text-blue-700" size={34} />
            <span className="text-sm font-black text-blue-900">{loading ? "Procesando..." : "Seleccionar Excel de ClickUp"}</span>
            <span className="text-xs font-semibold text-blue-700">Formatos admitidos: .xlsx, .xls</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={loading} />
          </label>
          {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
          {active && (
            <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
              <p><b>Carga activa:</b> {active.fileName}</p>
              <p><b>Filas contabilizadas:</b> {active.rowCount}</p>
              {active.warnings.slice(0, 3).map((warning) => (
                <p key={warning.id} className="mt-2 text-blue-700">{warning.message} {warning.count ? `(${warning.count})` : ""}</p>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
          <h3 className="text-sm font-black text-slate-900">Historial de cargas</h3>
          <div className="mt-3 grid gap-2">
            {uploads.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">Aún no hay cargas registradas.</p>}
            {uploads.map((upload) => (
              <div key={upload.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs">
                <button onClick={() => onActivateUpload(upload.id)} className={`text-left font-bold ${upload.id === activeUploadId ? "text-blue-700" : "text-slate-700"}`}>
                  {upload.fileName}<br />
                  <span className="font-semibold text-slate-500">{new Date(upload.uploadedAt).toLocaleString()} · {upload.rowCount} filas · {upload.id === activeUploadId ? "Activa" : "Histórica"}</span>
                </button>
                <button onClick={() => onDeleteUpload(upload.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Eliminar carga">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
