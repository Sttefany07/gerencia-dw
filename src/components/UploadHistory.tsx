import { Download, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { UploadItem, ValidationWarning } from "../types";
import { exportRowsToExcel, readWorkbook } from "../utils/excel";
import { dateTimeParts } from "../utils/format";
import { normalizeExcelRows } from "../utils/normalize";
import { Badge } from "./Badge";
import { AlertsPanel } from "./AlertsPanel";

type Props = {
  uploads: UploadItem[];
  activeUploadId: string;
  onCreateUpload: (payload: Omit<UploadItem, "id" | "status" | "uploadedAt">) => void;
  onActivateUpload: (id: string) => void;
  onDeleteUpload: (id: string) => void;
};

export function UploadHistory({ uploads, activeUploadId, onCreateUpload, onActivateUpload, onDeleteUpload }: Props) {
  const [description, setDescription] = useState("");
  const [localWarnings, setLocalWarnings] = useState<ValidationWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeUpload = uploads.find((upload) => upload.id === activeUploadId);

  const visibleWarnings = [...localWarnings, ...(activeUpload?.warnings ?? [])].filter(
    (warning) => warning.severity !== "info"
  );

  const handleFile = async (file?: File) => {
    if (!file) return;
    setIsLoading(true);
    setLocalWarnings([]);
    try {
      const rows = await readWorkbook(file);
      const { records, warnings } = normalizeExcelRows(rows);
      onCreateUpload({
        fileName: file.name,
        description: description.trim() || "Sin descripción",
        rowCount: records.length,
        records,
        warnings
      });
      setDescription("");
      setLocalWarnings([]);
    } catch (error) {
      setLocalWarnings([
        {
          id: "read_error",
          severity: "error",
          type: "missing-column",
          message: error instanceof Error ? error.message : "No se pudo leer el archivo Excel."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportHistory = () => {
    exportRowsToExcel(
      uploads,
      [
        { header: "Fecha", value: (row) => dateTimeParts(row.uploadedAt).date },
        { header: "Hora", value: (row) => dateTimeParts(row.uploadedAt).time },
        { header: "Archivo", value: (row) => row.fileName },
        { header: "Descripción", value: (row) => row.description },
        { header: "Registros", value: (row) => row.rowCount },
        { header: "Estado", value: (row) => row.status }
      ],
      "historial_de_cargas"
    );
  };

  const exportActiveData = () => {
    if (!activeUpload) return;
    exportRowsToExcel(
      activeUpload.records,
      [
        { header: "País", value: (row) => row.pais },
        { header: "Cliente", value: (row) => row.cliente },
        { header: "Proyecto", value: (row) => row.proyecto },
        { header: "Perfil", value: (row) => row.perfil },
        { header: "Consultor", value: (row) => row.consultor },
        { header: "Horas estimadas", value: (row) => row.horasEstimadas },
        { header: "Horas registradas", value: (row) => row.horasRegistradas },
        { header: "Fecha inicio", value: (row) => row.fechaInicio },
        { header: "Fecha fin", value: (row) => row.fechaFin }
      ],
      "datos_procesados_completos"
    );
  };

  return (
    <div className="grid gap-4 sm:gap-6">
      <section className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Carga de Excel e historial</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              La última carga queda activa automáticamente y se conserva en el navegador aunque refresques la página.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <button onClick={exportHistory} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">
              <Download size={16} /> Historial
            </button>
            <button
              onClick={exportActiveData}
              disabled={!activeUpload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            >
              <Download size={16} /> Datos procesados
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Descripción corta de la carga
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej.: cierre abril, proyección Q2..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-5 py-6 text-center hover:bg-blue-50">
            <UploadCloud className="mb-2 text-blue-700" size={28} />
            <span className="font-bold text-slate-900">Seleccionar Excel</span>
            <span className="text-sm text-slate-500">Formatos compatibles: .xlsx, .xls, .csv</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              disabled={isLoading}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      <AlertsPanel warnings={visibleWarnings} />

      <section className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <h3 className="text-base font-bold text-slate-900">Historial de cargas</h3>
          <p className="text-sm text-slate-500">Puedes reactivar cargas previas o eliminarlas.</p>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {uploads.map((upload) => {
            const parts = dateTimeParts(upload.uploadedAt);
            return (
              <article key={upload.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-slate-900">{upload.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500">{parts.date} · {parts.time}</p>
                  </div>
                  <Badge tone={upload.status === "Activa" ? "green" : "gray"}>{upload.status}</Badge>
                </div>
                <dl className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <dt className="font-semibold text-slate-500">Descripción</dt>
                    <dd className="min-w-0 break-words text-right font-medium text-slate-800">{upload.description}</dd>
                  </div>
                  <div className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <dt className="font-semibold text-slate-500">Registros</dt>
                    <dd className="font-bold tabular-nums text-slate-900">{upload.rowCount}</dd>
                  </div>
                </dl>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onActivateUpload(upload.id)}
                    disabled={upload.status === "Activa"}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Activar
                  </button>
                  <button onClick={() => onDeleteUpload(upload.id)} className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            );
          })}
          {uploads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-10 text-center text-sm text-slate-500">
              Aún no hay cargas registradas.
            </div>
          )}
        </div>
        <div className="hidden w-full overflow-x-auto md:block">
          <table className="min-w-[980px] text-xs sm:text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Hora</th>
                <th className="px-3 py-3 text-left">Archivo</th>
                <th className="px-3 py-3 text-left">Descripción</th>
                <th className="px-3 py-3 text-right">Registros</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-center">Activar</th>
                <th className="px-3 py-3 text-center">Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => {
                const parts = dateTimeParts(upload.uploadedAt);
                return (
                  <tr key={upload.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                    <td className="px-3 py-2">{parts.date}</td>
                    <td className="px-3 py-2">{parts.time}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{upload.fileName}</td>
                    <td className="px-3 py-2">{upload.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{upload.rowCount}</td>
                    <td className="px-3 py-2">
                      <Badge tone={upload.status === "Activa" ? "green" : "gray"}>{upload.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onActivateUpload(upload.id)}
                        disabled={upload.status === "Activa"}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Activar
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onDeleteUpload(upload.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {uploads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-500">
                    Aún no hay cargas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
