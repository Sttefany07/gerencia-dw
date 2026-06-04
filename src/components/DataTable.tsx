import { ArrowDownUp, Download, Search } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { exportRowsToExcel } from "../utils/excel";
import { formatNumber } from "../utils/format";

export type Column<T> = {
  id: string;
  header: string;
  value: (row: T) => string | number | null | undefined;
  render?: (row: T) => ReactNode;
  numeric?: boolean;
  total?: boolean;
  totalRender?: (rows: T[]) => ReactNode;
  width?: string;
};

type Props<T> = {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  fileName: string;
};

export function DataTable<T>({ title, rows, columns, fileName }: Props<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ id: string; direction: "asc" | "desc" } | null>(null);

  const tableWidthClass = columns.length >= 12 ? "min-w-[1700px]" : columns.length >= 8 ? "min-w-[1180px]" : "min-w-[860px]";

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = q
      ? rows.filter((row) => columns.some((column) => String(column.value(row) ?? "").toLowerCase().includes(q)))
      : [...rows];

    if (sort) {
      const column = columns.find((item) => item.id === sort.id);
      if (column) {
        filtered = [...filtered].sort((a, b) => compareValues(column.value(a), column.value(b), sort.direction));
      }
    }

    return filtered;
  }, [rows, columns, query, sort]);

  const toggleSort = (id: string) => {
    setSort((current) => {
      if (!current || current.id !== id) return { id, direction: "asc" };
      if (current.direction === "asc") return { id, direction: "desc" };
      return null;
    });
  };

  const exportData = () => {
    exportRowsToExcel(
      visibleRows,
      columns.map((column) => ({ header: column.header, value: column.value })),
      fileName
    );
  };

  return (
    <section className="w-full overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-slate-900 sm:text-base">{title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">Registros visibles: {visibleRows.length}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en tabla..."
              className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <button onClick={exportData} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto">
            <Download size={16} />
            Descargar Excel
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-3 md:hidden">
        {visibleRows.map((row, rowIndex) => (
          <article key={rowIndex} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="border-b border-slate-100 pb-2">
              <p className="break-words text-sm font-bold text-slate-900">{String(columns[0]?.value(row) ?? `Registro ${rowIndex + 1}`)}</p>
              {columns[1] && <p className="mt-1 break-words text-xs font-medium text-slate-500">{String(columns[1].value(row) ?? "")}</p>}
            </div>
            <dl className="mt-3 grid gap-2">
              {columns.slice(2).map((column) => {
                const rawValue = column.value(row);
                const displayValue = column.render
                  ? column.render(row)
                  : column.numeric && typeof rawValue === "number"
                    ? formatNumber(rawValue, 2)
                    : String(rawValue ?? "");

                return (
                  <div key={column.id} className="grid grid-cols-[44%_1fr] items-start gap-2 rounded-xl bg-slate-50 px-3 py-2">
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{column.header}</dt>
                    <dd className={`min-w-0 break-words text-right text-xs text-slate-800 ${column.numeric ? "font-semibold tabular-nums" : "font-medium"}`}>{displayValue}</dd>
                  </div>
                );
              })}
            </dl>
          </article>
        ))}
        {visibleRows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-3 py-10 text-center text-sm text-slate-500">
            No hay registros para mostrar.
          </div>
        )}
      </div>

      {columns.some((column) => column.total) && visibleRows.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-900 p-3 text-white md:hidden">
          <p className="text-xs font-black uppercase tracking-wide text-slate-300">Totales</p>
          <div className="mt-2 grid gap-2">
            {columns.filter((column) => column.total).map((column) => {
              const total = visibleRows.reduce((acc, row) => {
                const value = Number(column.value(row) ?? 0);
                return Number.isFinite(value) ? acc + value : acc;
              }, 0);
              const totalDisplay = column.totalRender ? column.totalRender(visibleRows) : formatNumber(total, 2);
              return (
                <div key={column.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-200">{column.header}</span>
                  <span className="text-right text-xs font-bold tabular-nums">{totalDisplay}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="hidden w-full overflow-x-auto overflow-y-auto md:block md:max-h-[70vh]">
        <table className={`${tableWidthClass} border-separate border-spacing-0 text-xs lg:text-sm`}>
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  style={{ minWidth: column.width }}
                  className={`border-b border-slate-200 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600 ${column.numeric ? "text-right" : ""}`}
                >
                  <button className="inline-flex items-center gap-1 whitespace-nowrap" onClick={() => toggleSort(column.id)}>
                    {column.header}
                    <ArrowDownUp size={13} className="text-slate-400" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/50">
                {columns.map((column) => {
                  const rawValue = column.value(row);
                  const displayValue = column.render
                    ? column.render(row)
                    : column.numeric && typeof rawValue === "number"
                      ? formatNumber(rawValue, 2)
                      : String(rawValue ?? "");

                  return (
                    <td key={column.id} className={`border-b border-slate-100 px-3 py-2 align-top text-slate-700 ${column.numeric ? "text-right font-medium tabular-nums" : ""}`}>
                      <div className="max-w-[320px] break-words">{displayValue}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-slate-500">
                  No hay registros para mostrar.
                </td>
              </tr>
            )}
          </tbody>
          {columns.some((column) => column.total) && (
            <tfoot className="sticky bottom-0 bg-slate-900 text-white">
              <tr>
                {columns.map((column, index) => {
                  const total = column.total
                    ? visibleRows.reduce((acc, row) => {
                        const value = Number(column.value(row) ?? 0);
                        return Number.isFinite(value) ? acc + value : acc;
                      }, 0)
                    : null;
                  const totalDisplay = column.totalRender
                    ? column.totalRender(visibleRows)
                    : column.total
                      ? formatNumber(total ?? 0)
                      : "";

                  return (
                    <td key={column.id} className={`px-3 py-3 text-xs font-bold lg:text-sm ${column.numeric ? "text-right tabular-nums" : ""}`}>
                      {index === 0 ? "TOTAL" : totalDisplay}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined, direction: "asc" | "desc") {
  const multiplier = direction === "asc" ? 1 : -1;
  const aValue = a ?? "";
  const bValue = b ?? "";
  if (typeof aValue === "number" && typeof bValue === "number") return (aValue - bValue) * multiplier;
  return String(aValue).localeCompare(String(bValue), "es", { numeric: true }) * multiplier;
}
