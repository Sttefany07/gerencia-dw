import { FilterState, NormalizedRecord } from "../types";
import { emptyFilters, getFilterOptions } from "../utils/calculations";

export function FilterPanel({
  records,
  filters,
  onChange
}: {
  records: NormalizedRecord[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}) {
  const options = getFilterOptions(records, filters);

  const update = (field: keyof FilterState, value: string) => {
    const next: FilterState = { ...filters, [field]: value };
    if (field === "pais") {
      next.cliente = "";
      next.proyecto = "";
      next.hitoFacturable = "";
    }
    if (field === "cliente") {
      next.proyecto = "";
      next.hitoFacturable = "";
    }
    if (field === "proyecto") {
      next.hitoFacturable = "";
    }
    onChange(next);
  };

  return (
    <section className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">Filtros encadenados</h3>
        </div>
        <button
          onClick={() => onChange(emptyFilters)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Field label="Fecha inicio" type="date" value={filters.fechaInicio} onChange={(value) => update("fechaInicio", value)} />
        <Field label="Fecha fin" type="date" value={filters.fechaFin} onChange={(value) => update("fechaFin", value)} />
        <Select label="País" value={filters.pais} options={options.paises} onChange={(value) => update("pais", value)} />
        <Select label="Cliente" value={filters.cliente} options={options.clientes} onChange={(value) => update("cliente", value)} />
        <Select label="Proyecto" value={filters.proyecto} options={options.proyectos} onChange={(value) => update("proyecto", value)} />
        <Select label="Hito facturable" value={filters.hitoFacturable} options={options.hitos} onChange={(value) => update("hitoFacturable", value)} />
      </div>
    </section>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({ label, value, type, onChange }: { label: string; value: string; type: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
