import { Plus, Trash2 } from "lucide-react";
import { NormalizedRecord, TariffRate } from "../types";
import { createId } from "../utils/ids";
import { formatMoney } from "../utils/format";

export function TariffsTab({ records, tariffs, onTariffsChange }: { records: NormalizedRecord[]; tariffs: TariffRate[]; onTariffsChange: (rates: TariffRate[]) => void }) {
  const options = getTariffOptions(records);
  const update = (id: string, patch: Partial<TariffRate>) => onTariffsChange(tariffs.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate)));
  const add = () => {
    onTariffsChange([
      {
        id: createId("tariff"),
        pais: options.paises[0] ?? "No definido",
        cliente: options.clientes[0] ?? "No definido",
        proyecto: options.proyectos[0] ?? "No definido",
        perfil: options.perfiles[0] ?? "No definido",
        tarifa: 0,
        moneda: "USD",
        status: "Activo"
      },
      ...tariffs
    ]);
  };
  const remove = (id: string) => onTariffsChange(tariffs.filter((rate) => rate.id !== id));

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Tarifas</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">País, cliente, proyecto y perfil se toman del Excel de ClickUp. No se usan filas genéricas “Todos”.</p>
          </div>
          <button onClick={add} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800"><Plus size={16} /> Agregar tarifa</button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
              <tr>
                {['País','Cliente','Proyecto','Perfil','Tarifa 100%','Moneda','Costo 70%','Estado',''].map((header) => <th key={header} className="px-3 py-3 font-black">{header}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tariffs.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-2 py-2"><Select value={rate.pais} options={options.paises} onChange={(value) => update(rate.id, { pais: value })} /></td>
                  <td className="px-2 py-2"><Select value={rate.cliente} options={options.clientes} onChange={(value) => update(rate.id, { cliente: value })} /></td>
                  <td className="px-2 py-2"><Select value={rate.proyecto} options={options.proyectos} onChange={(value) => update(rate.id, { proyecto: value })} /></td>
                  <td className="px-2 py-2"><Select value={rate.perfil} options={options.perfiles} onChange={(value) => update(rate.id, { perfil: value })} /></td>
                  <td className="px-2 py-2"><input type="number" step="0.01" value={rate.tarifa} onChange={(event) => update(rate.id, { tarifa: Number(event.target.value) })} className="w-28 rounded-lg border border-slate-200 px-2 py-2 font-semibold" /></td>
                  <td className="px-2 py-2"><select value={rate.moneda} onChange={(event) => update(rate.id, { moneda: event.target.value as TariffRate['moneda'] })} className="rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option value="USD">USD</option><option value="PEN">PEN</option></select></td>
                  <td className="px-2 py-2 font-black text-slate-700">{formatMoney(rate.tarifa * 0.7, rate.moneda)}</td>
                  <td className="px-2 py-2"><select value={rate.status} onChange={(event) => update(rate.id, { status: event.target.value as TariffRate['status'] })} className="rounded-lg border border-slate-200 px-2 py-2 font-semibold"><option>Activo</option><option>Inactivo</option></select></td>
                  <td className="px-2 py-2"><button onClick={() => remove(rate.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {tariffs.map((rate) => (
            <article key={rate.id} className="grid gap-2 rounded-2xl border border-slate-200 p-3">
              <Select label="País" value={rate.pais} options={options.paises} onChange={(value) => update(rate.id, { pais: value })} />
              <Select label="Cliente" value={rate.cliente} options={options.clientes} onChange={(value) => update(rate.id, { cliente: value })} />
              <Select label="Proyecto" value={rate.proyecto} options={options.proyectos} onChange={(value) => update(rate.id, { proyecto: value })} />
              <Select label="Perfil" value={rate.perfil} options={options.perfiles} onChange={(value) => update(rate.id, { perfil: value })} />
              <label className="grid gap-1 text-xs font-black text-slate-700">Tarifa 100%<input type="number" step="0.01" value={rate.tarifa} onChange={(event) => update(rate.id, { tarifa: Number(event.target.value) })} className="rounded-lg border border-slate-200 px-2 py-2 font-semibold" /></label>
              <p className="text-xs font-black text-slate-700">Costo 70%: {formatMoney(rate.tarifa * 0.7, rate.moneda)}</p>
              <button onClick={() => remove(rate.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600">Eliminar</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function Select({ label, value, options, onChange }: { label?: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const select = (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500">
      {options.length === 0 && <option value={value}>{value || "No definido"}</option>}
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
  if (!label) return select;
  return <label className="grid gap-1 text-xs font-black text-slate-700">{label}{select}</label>;
}

function getTariffOptions(records: NormalizedRecord[]) {
  return {
    paises: unique(records.map((record) => record.pais)),
    clientes: unique(records.map((record) => record.cliente)),
    proyectos: unique(records.map((record) => record.proyecto)),
    perfiles: unique(records.map((record) => record.perfil))
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}
