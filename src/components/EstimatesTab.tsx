import { Copy, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ProjectEstimate, TariffRate } from "../types";
import { estimateProfiles, estimateTotals } from "../utils/calculations";
import { formatHours, formatMoney, formatPercent } from "../utils/format";
import { createId } from "../utils/ids";
import { MetricCard } from "./MetricCard";

export function EstimatesTab({
  estimates,
  tariffs,
  onEstimatesChange
}: {
  estimates: ProjectEstimate[];
  tariffs: TariffRate[];
  onEstimatesChange: (estimates: ProjectEstimate[]) => void;
}) {
  const [selectedId, setSelectedId] = useState(estimates[0]?.id ?? "");
  const selected = estimates.find((estimate) => estimate.id === selectedId) ?? estimates[0] ?? null;
  const totals = selected ? estimateTotals(selected, tariffs) : null;
  const profiles = selected ? estimateProfiles(selected, tariffs) : [];
  const maxMonth = Math.max(1, ...(selected?.items.map((item) => item.monthIndex) ?? [1]));
  const profileRows = selected ? unique(selected.items.map((item) => item.perfil)) : [];
  const profileOptions = unique([...DEFAULT_PROFILE_OPTIONS, ...tariffs.map((rate) => normalizeProfileName(rate.perfil)), ...profileRows.map(normalizeProfileName)]);
  const [profileToAdd, setProfileToAdd] = useState(profileOptions[0] ?? "Semi senior");
  const [saveStatus, setSaveStatus] = useState("");

  const upsert = (id: string, patch: Partial<ProjectEstimate>) => {
    onEstimatesChange(estimates.map((estimate) => (estimate.id === id ? { ...estimate, ...patch } : estimate)));
    setSaveStatus("");
  };

  const createEstimate = () => {
    const id = createId("estimate");
    const next: ProjectEstimate = {
      id,
      version: `V${estimates.length + 1} borrador`,
      pais: "Peru",
      cliente: "Nuevo cliente",
      proyecto: "Nuevo proyecto",
      fechaInicio: new Date().toISOString().slice(0, 10),
      fechaFin: new Date().toISOString().slice(0, 10),
      estado: "Borrador",
      createdAt: new Date().toISOString(),
      items: [
        { id: createId("estimate_item"), perfil: "Semi senior", monthIndex: 1, horas: 0, tarifa: getDefaultTariff("Semi senior") },
        { id: createId("estimate_item"), perfil: "Senior", monthIndex: 1, horas: 0, tarifa: getDefaultTariff("Senior") }
      ]
    };
    onEstimatesChange([next, ...estimates]);
    setSelectedId(id);
  };

  const duplicate = () => {
    if (!selected) return;
    const id = createId("estimate");
    const copy: ProjectEstimate = {
      ...selected,
      id,
      version: `${selected.version} copia`,
      estado: "Borrador",
      createdAt: new Date().toISOString(),
      items: selected.items.map((item) => ({ ...item, id: createId("estimate_item") }))
    };
    onEstimatesChange([copy, ...estimates]);
    setSelectedId(id);
  };

  const remove = () => {
    if (!selected) return;
    const next = estimates.filter((estimate) => estimate.id !== selected.id);
    onEstimatesChange(next);
    setSelectedId(next[0]?.id ?? "");
  };

  const setHours = (perfil: string, monthIndex: number, horas: number) => {
    if (!selected) return;
    const current = selected.items.find((item) => item.perfil === perfil && item.monthIndex === monthIndex);
    const tarifa = getProfileTariff(perfil);
    const items = current
      ? selected.items.map((item) => (item.id === current.id ? { ...item, horas } : item))
      : [...selected.items, { id: createId("estimate_item"), perfil, monthIndex, horas, tarifa }];
    upsert(selected.id, { items });
  };

  const setTariff = (perfil: string, tarifa: number) => {
    if (!selected) return;
    const items = selected.items.map((item) => (item.perfil === perfil ? { ...item, tarifa } : item));
    upsert(selected.id, { items });
  };

  const addProfile = () => {
    if (!selected) return;
    const perfil = normalizeProfileName(profileToAdd);
    if (profileRows.map(normalizeProfileName).includes(perfil)) return;
    upsert(selected.id, { items: [...selected.items, { id: createId("estimate_item"), perfil, monthIndex: 1, horas: 0, tarifa: getDefaultTariff(perfil) }] });
  };

  const removeProfile = (perfil: string) => {
    if (!selected) return;
    upsert(selected.id, { items: selected.items.filter((item) => normalizeProfileName(item.perfil) !== normalizeProfileName(perfil)) });
  };

  const addMonth = () => {
    if (!selected) return;
    const nextMonth = maxMonth + 1;
    upsert(selected.id, {
      items: [...selected.items, ...profileRows.map((perfil) => ({ id: createId("estimate_item"), perfil, monthIndex: nextMonth, horas: 0, tarifa: getProfileTariff(perfil) }))]
    });
  };

  const removeMonth = () => {
    if (!selected || maxMonth <= 1) return;
    upsert(selected.id, { items: selected.items.filter((item) => item.monthIndex !== maxMonth) });
  };

  const saveEstimate = () => {
    if (!selected) return;
    onEstimatesChange(estimates.map((estimate) => (estimate.id === selected.id ? selected : estimate)));
    setSaveStatus("Guardado");
    window.setTimeout(() => setSaveStatus(""), 1800);
  };

  const getDefaultTariff = (perfil: string) => {
    const normalized = normalizeProfileName(perfil);
    return tariffs.find((rate) => normalizeProfileName(rate.perfil) === normalized)?.tarifa ?? DEFAULT_TARIFF_BY_PROFILE[normalized] ?? 0;
  };
  const getProfileTariff = (perfil: string) => selected?.items.find((item) => normalizeProfileName(item.perfil) === normalizeProfileName(perfil))?.tarifa ?? getDefaultTariff(perfil);

  const projects = useMemo(() => estimates.map((estimate) => `${estimate.pais} / ${estimate.cliente} / ${estimate.proyecto}`), [estimates]);

  return (
    <section className="grid gap-4">
      <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Estimacion y costeo de proyectos</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Gestiona una cartera con varios proyectos y multiples versiones de estimacion.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveEstimate} disabled={!selected} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-40">
              <Save size={16} /> Guardar
            </button>
            <button onClick={createEstimate} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800">
              <Plus size={16} /> Nueva
            </button>
            <button onClick={duplicate} disabled={!selected} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40">
              <Copy size={16} /> Duplicar
            </button>
            <button onClick={remove} disabled={!selected} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-600 hover:bg-red-50 disabled:opacity-40">
              <Trash2 size={16} /> Eliminar
            </button>
            {saveStatus && <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{saveStatus}</span>}
          </div>
        </div>
      </div>

      {!selected && <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 shadow-soft ring-1 ring-slate-200">Crea la primera estimacion para comenzar.</p>}

      {selected && totals && (
        <>
          <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200 lg:grid-cols-[0.8fr_1.2fr]">
            <label className="grid gap-1 text-xs font-black text-slate-700">
              Estimacion activa
              <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold">
                {estimates.map((estimate, index) => (
                  <option key={estimate.id} value={estimate.id}>{projects[index]}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input label="Pais" value={selected.pais} onChange={(value) => upsert(selected.id, { pais: value })} />
              <Input label="Cliente" value={selected.cliente} onChange={(value) => upsert(selected.id, { cliente: value })} />
              <Input label="Proyecto" value={selected.proyecto} onChange={(value) => upsert(selected.id, { proyecto: value })} />
              <label className="grid gap-1 text-xs font-black text-slate-700">
                Estado
                <select value={selected.estado} onChange={(event) => upsert(selected.id, { estado: event.target.value as ProjectEstimate["estado"] })} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold">
                  <option>Borrador</option>
                  <option>Aprobada</option>
                  <option>Archivada</option>
                </select>
              </label>
              <DateInput label="Fecha inicio" value={selected.fechaInicio} onChange={(value) => upsert(selected.id, { fechaInicio: value })} />
              <DateInput label="Fecha fin" value={selected.fechaFin} onChange={(value) => upsert(selected.id, { fechaFin: value })} />
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard icon={Plus} label="Horas estimadas" value={formatHours(totals.totalHoras)} />
            <MetricCard icon={Plus} label="Ingreso estimado" value={formatMoney(totals.ingresoEstimado, totals.moneda)} />
            <MetricCard icon={Plus} label="Costo estimado 70%" value={formatMoney(totals.costoEstimado70, totals.moneda)} />
            <MetricCard icon={Plus} label="Rentabilidad estimada" value={formatPercent(totals.rentabilidadEstimada)} helper="Regla base 30%" />
          </div>

          <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
              <h3 className="text-sm font-black text-slate-900">Horas por perfil y mes</h3>
              <div className="flex flex-wrap gap-2">
                <select value={profileToAdd} onChange={(event) => setProfileToAdd(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
                  {profileOptions.map((perfil) => (
                    <option key={perfil} value={perfil}>{perfil}</option>
                  ))}
                </select>
                <button onClick={addProfile} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">Agregar perfil</button>
                <button onClick={addMonth} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">Agregar mes</button>
                <button
                  onClick={removeMonth}
                  disabled={maxMonth <= 1}
                  className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Eliminar mes
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-slate-50 text-left text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-black">Perfil</th>
                    <th className="px-3 py-3 font-black">Tarifa proyecto</th>
                    {Array.from({ length: maxMonth }, (_, index) => <th key={index} className="px-3 py-3 font-black">Mes {index + 1}</th>)}
                    <th className="px-3 py-3 font-black">Total horas</th>
                    <th className="px-3 py-3 font-black">Ingreso</th>
                    <th className="px-3 py-3 font-black">Costo 70%</th>
                    <th className="px-3 py-3 font-black">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profileRows.map((perfil) => {
                    const profile = profiles.find((item) => item.perfil === perfil);
                    return (
                      <tr key={perfil}>
                        <td className="px-3 py-2 font-black text-slate-800">{perfil}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={profile?.tarifa ?? getProfileTariff(perfil)}
                            onChange={(event) => setTariff(perfil, Number(event.target.value))}
                            className="w-28 rounded-lg border border-slate-200 px-2 py-2 font-semibold"
                          />
                        </td>
                        {Array.from({ length: maxMonth }, (_, index) => {
                          const monthIndex = index + 1;
                          const value = selected.items.find((item) => item.perfil === perfil && item.monthIndex === monthIndex)?.horas ?? 0;
                          return (
                            <td key={monthIndex} className="px-2 py-2">
                              <input type="number" value={value} onChange={(event) => setHours(perfil, monthIndex, Number(event.target.value))} className="w-24 rounded-lg border border-slate-200 px-2 py-2 font-semibold" />
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 font-black">{formatHours(profile?.horas ?? 0)}</td>
                        <td className="px-3 py-2 font-black">{formatMoney(profile?.ingreso ?? 0, profile?.moneda ?? "USD")}</td>
                        <td className="px-3 py-2 font-black">{formatMoney(profile?.costo70 ?? 0, profile?.moneda ?? "USD")}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeProfile(perfil)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                            title="Eliminar perfil"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs font-black text-slate-700">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold" />
    </label>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

const DEFAULT_PROFILE_OPTIONS = ["Semi senior", "Arquitecto", "Senior", "Gerencia", "Junior", "Lead"];

const DEFAULT_TARIFF_BY_PROFILE: Record<string, number> = {
  "Semi senior": 35,
  Arquitecto: 41,
  Senior: 39,
  Gerencia: 42,
  Junior: 45,
  Lead: 110
};

function normalizeProfileName(value: string) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized === "semi senior" || normalized === "semisenior" || normalized === "semi senior") return "Semi senior";
  if (normalized === "arquitecto") return "Arquitecto";
  if (normalized === "senior") return "Senior";
  if (normalized === "gerencia") return "Gerencia";
  if (normalized === "junior") return "Junior";
  if (normalized === "lead") return "Lead";
  return String(value ?? "").replace(/\s+/g, " ").trim() || "Semi senior";
}
