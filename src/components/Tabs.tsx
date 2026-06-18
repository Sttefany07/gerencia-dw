import { BarChart3, Calculator, FileSpreadsheet, Users } from "lucide-react";
import { ViewKey } from "../types";

const tabs: Array<{ key: ViewKey; label: string; icon: typeof Users }> = [
  { key: "upload", label: "CARGA DE EXCEL", icon: FileSpreadsheet },
  { key: "estimates", label: "ESTIMACIONES", icon: Calculator },
  { key: "services", label: "GERENCIA DE SERVICIOS", icon: Users },
  { key: "general", label: "GERENCIA GENERAL", icon: BarChart3 }
];

export function Tabs({ active, onChange }: { active: ViewKey; onChange: (tab: ViewKey) => void }) {
  return (
    <nav className="flex w-full gap-2 overflow-x-auto border-b border-slate-200 bg-transparent">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`inline-flex min-w-[190px] items-center justify-center gap-3 rounded-t-xl border px-5 py-4 text-sm font-black transition ${
              selected ? "border-blue-200 border-b-white bg-white text-blue-700 shadow-soft" : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-white"
            }`}
          >
            <Icon size={20} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
