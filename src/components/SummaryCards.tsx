import { formatHours, formatPercent } from "../utils/format";

type Props = {
  horasEstimadas: number;
  horasRegistradas: number;
  horasFacturables: number;
  cumplimiento: number | null;
};

export function SummaryCards({ horasEstimadas, horasRegistradas, horasFacturables, cumplimiento }: Props) {
  const progress = cumplimiento === null ? 0 : Math.min(Math.max(cumplimiento, 0), 100);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      <Card label="Horas estimadas" value={formatHours(horasEstimadas)} />
      <Card label="Horas registradas" value={formatHours(horasRegistradas)} />
      <Card label="Horas facturables" value={formatHours(horasFacturables)} />
      <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cumplimiento en horas</p>
        <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{formatPercent(cumplimiento)}</p>
        <div className="mt-3 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-blue-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Horas registradas / Horas estimadas</p>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{value}</p>
    </div>
  );
}
