import { LucideIcon } from "lucide-react";

export function MetricCard({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: string; helper?: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-[11px] font-semibold text-slate-500">{helper}</p>}
        </div>
      </div>
    </article>
  );
}
