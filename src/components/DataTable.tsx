import { Download } from "lucide-react";
import { ReactNode } from "react";
import { exportRowsToExcel, ExportColumn } from "../utils/excel";
import { roundNumber } from "../utils/format";

export type Column<T> = ExportColumn<T> & {
  id: string;
  className?: string;
  render?: (row: T) => ReactNode;
  total?: boolean;
  totalRender?: (rows: T[]) => ReactNode;
};

export function DataTable<T extends Record<string, unknown>>({
  title,
  rows,
  columns,
  fileName
}: {
  title: string;
  rows: T[];
  columns: Column<T>[];
  fileName: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-black text-slate-950">{title}</h3>
        <button
          onClick={() => exportRowsToExcel(rows, columns, fileName)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
        >
          <Download size={15} /> Exportar
        </button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={`px-4 py-3 font-black ${column.className ?? ""}`}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.id} className={`px-4 py-3 align-top font-semibold text-slate-700 ${column.className ?? ""}`}>
                    {column.render ? column.render(row) : formatCell(column.value(row))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && columns.some((column) => column.total) && (
            <tfoot className="bg-slate-950 text-xs font-black text-white">
              <tr>
                {columns.map((column, index) => (
                  <td key={column.id} className={`px-4 py-3 ${column.className ?? ""}`}>
                    {index === 0
                      ? "TOTAL"
                      : column.total
                        ? column.totalRender
                          ? column.totalRender(rows)
                          : roundNumber(rows.reduce((acc, row) => acc + Number(column.value(row) ?? 0), 0), 2)
                        : ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {rows.map((row, index) => (
          <article key={String(row.id ?? index)} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {columns.map((column) => (
              <div key={column.id} className="grid grid-cols-2 gap-2 border-b border-slate-200 py-2 last:border-0">
                <span className="text-[11px] font-black uppercase text-slate-500">{column.header}</span>
                <span className="text-right text-xs font-bold text-slate-800">{column.render ? column.render(row) : formatCell(column.value(row))}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return roundNumber(value, 2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value;
}
