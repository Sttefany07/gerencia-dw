import { BarChart3, Building2, FileSpreadsheet, Table2 } from "lucide-react";
import { TabKey } from "../types";

type Tab = {
  key: TabKey;
  label: string;
  icon: typeof FileSpreadsheet;
};

const tabs: Tab[] = [
  { key: "upload", label: "Carga e historial", icon: FileSpreadsheet },
  { key: "rates", label: "Tarifas por rol", icon: Table2 },
  { key: "general", label: "Gerencia General", icon: BarChart3 },
  { key: "services", label: "Gerencia de Servicios", icon: Building2 }
];

export function Tabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="w-full overflow-x-auto rounded-2xl bg-white p-2 shadow-soft ring-1 ring-slate-200">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                selected ? "bg-blue-700 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
