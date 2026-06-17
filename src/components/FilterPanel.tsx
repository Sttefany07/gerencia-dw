import { FilterState, NormalizedRecord } from "../types";
import { emptyFilters, getFilterOptions } from "../utils/calculations";

export function FilterPanel({ records, filters, onChange }: { records: NormalizedRecord[]; filters: FilterState; onChange: (filters: FilterState) => void }) {
  const options = getFilterOptions(records, filters);
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <DateInput label="Fecha inicio" value={filters.fechaInicio} onChange={(value) => update({ fechaInicio: value })} />
        <DateInput label="Fecha fin" value={filters.fechaFin} onChange={(value) => update({ fechaFin: value })} />
        <Select label="País" value={filters.pais} options={options.paises} onChange={(value) => update({ pais: value, cliente: "", proyecto: "" })} />
        <Select label="Cliente" value={filters.cliente} options={options.clientes} onChange={(value) => update({ cliente: value, proyecto: "" })} />
        <Select label="Proyecto" value={filters.proyecto} options={options.proyectos} onChange={(value) => update({ proyecto: value })} />
        <Select label="Hito facturable" value={filters.hitoFacturable} options={options.hitos} onChange={(value) => update({ hitoFacturable: value })} />
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={() => onChange(emptyFilters)} className="rounded-xl border border-blue-200 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black text-slate-700">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-black text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500">
        <option value="">Todos</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
