import { AlertCircle, Info, TriangleAlert } from "lucide-react";
import { ValidationWarning } from "../types";

export function AlertsPanel({ warnings }: { warnings: ValidationWarning[] }) {
  if (!warnings.length) return null;

  const severityClass = {
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-orange-200 bg-orange-50 text-orange-800",
    info: "border-blue-200 bg-blue-50 text-blue-800"
  } as const;

  const icon = {
    error: AlertCircle,
    warning: TriangleAlert,
    info: Info
  } as const;

  return (
    <div className="grid gap-2">
      {warnings.map((warning) => {
        const Icon = icon[warning.severity];
        return (
          <div key={warning.id} className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-xs leading-5 sm:px-4 sm:text-sm ${severityClass[warning.severity]}`}>
            <Icon size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{warning.message}</p>
              {typeof warning.count === "number" && <p className="text-xs opacity-80">Registros afectados: {warning.count}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
