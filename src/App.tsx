import { useEffect, useMemo, useState } from "react";
import { AlertsPanel } from "./components/AlertsPanel";
import { GeneralManagement } from "./components/GeneralManagement";
import { RatesManager } from "./components/RatesManager";
import { ServicesManagement } from "./components/ServicesManagement";
import { Tabs } from "./components/Tabs";
import { UploadHistory } from "./components/UploadHistory";
import { CommercialRate, FilterState, OperationRate, TabKey, UploadItem } from "./types";
import { emptyFilters, ensureRatesForRecords, sanitizeCommercialRates, sanitizeOperationRates } from "./utils/calculations";
import { createId } from "./utils/ids";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "./utils/storage";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("upload");
  const [uploads, setUploads] = useState<UploadItem[]>(() => loadFromStorage(STORAGE_KEYS.uploads, []));
  const [activeUploadId, setActiveUploadId] = useState<string>(() => loadFromStorage(STORAGE_KEYS.activeUploadId, ""));
  const [operationRates, setOperationRates] = useState<OperationRate[]>(() =>
    sanitizeOperationRates(loadFromStorage(STORAGE_KEYS.operationRates, []))
  );
  const [commercialRates, setCommercialRates] = useState<CommercialRate[]>(() =>
    sanitizeCommercialRates(loadFromStorage(STORAGE_KEYS.commercialRates, []))
  );
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  useEffect(() => saveToStorage(STORAGE_KEYS.uploads, uploads), [uploads]);
  useEffect(() => saveToStorage(STORAGE_KEYS.activeUploadId, activeUploadId), [activeUploadId]);
  useEffect(() => saveToStorage(STORAGE_KEYS.operationRates, operationRates), [operationRates]);
  useEffect(() => saveToStorage(STORAGE_KEYS.commercialRates, commercialRates), [commercialRates]);

  const activeUpload = useMemo(
    () => uploads.find((upload) => upload.id === activeUploadId) ?? uploads.find((upload) => upload.status === "Activa") ?? null,
    [activeUploadId, uploads]
  );

  const records = activeUpload?.records ?? [];

  const createUpload = (payload: Omit<UploadItem, "id" | "status" | "uploadedAt">) => {
    const id = createId("upload");
    const newUpload: UploadItem = {
      ...payload,
      id,
      uploadedAt: new Date().toISOString(),
      status: "Activa"
    };

    setUploads((current) => [newUpload, ...current.map((upload) => ({ ...upload, status: "Histórica" as const }))]);
    setActiveUploadId(id);
    setFilters(emptyFilters);

    const ensured = ensureRatesForRecords(payload.records, operationRates, commercialRates);
    setOperationRates(ensured.operationRates);
    setCommercialRates(ensured.commercialRates);
    setActiveTab("rates");
  };

  const activateUpload = (id: string) => {
    const selected = uploads.find((upload) => upload.id === id);
    setUploads((current) => current.map((upload) => ({ ...upload, status: upload.id === id ? "Activa" : "Histórica" })));
    setActiveUploadId(id);
    setFilters(emptyFilters);
    if (selected) {
      const ensured = ensureRatesForRecords(selected.records, operationRates, commercialRates);
      setOperationRates(ensured.operationRates);
      setCommercialRates(ensured.commercialRates);
    }
  };

  const deleteUpload = (id: string) => {
    setUploads((current) => {
      const remaining = current.filter((upload) => upload.id !== id);
      if (id !== activeUploadId) return remaining;
      const nextActive = remaining[0];
      setActiveUploadId(nextActive?.id ?? "");
      return remaining.map((upload, index) => ({ ...upload, status: index === 0 ? "Activa" : "Histórica" }));
    });
  };

  const noDataWarning = !records.length
    ? [
        {
          id: "no_data",
          severity: "info" as const,
          type: "empty" as const,
          message: "Carga un Excel para habilitar las tablas de Gerencia General y Gerencia de Servicios."
        }
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 lg:px-8">
        <header className="rounded-2xl bg-gradient-to-r from-slate-950 to-blue-900 p-4 text-white shadow-soft sm:rounded-3xl sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200 sm:text-sm sm:tracking-[0.2em]">Sistema tabular ejecutivo</p>
          <h1 className="mt-2 text-xl font-black tracking-tight sm:text-2xl lg:text-3xl">Gestión de proyectos, horas, tarifas, costos y facturación</h1>
        </header>

        <Tabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "upload" && (
          <UploadHistory
            uploads={uploads}
            activeUploadId={activeUploadId}
            onCreateUpload={createUpload}
            onActivateUpload={activateUpload}
            onDeleteUpload={deleteUpload}
          />
        )}

        {activeTab === "rates" && (
          <RatesManager
            operationRates={operationRates}
            commercialRates={commercialRates}
            onOperationRatesChange={setOperationRates}
            onCommercialRatesChange={setCommercialRates}
          />
        )}

        {activeTab === "general" && (
          records.length ? (
            <GeneralManagement
              records={records}
              filters={filters}
              onFiltersChange={setFilters}
              operationRates={operationRates}
              commercialRates={commercialRates}
            />
          ) : (
            <AlertsPanel warnings={noDataWarning} />
          )
        )}

        {activeTab === "services" && (
          records.length ? (
            <ServicesManagement
              records={records}
              filters={filters}
              onFiltersChange={setFilters}
              operationRates={operationRates}
              commercialRates={commercialRates}
            />
          ) : (
            <AlertsPanel warnings={noDataWarning} />
          )
        )}

        <footer className="mt-8 rounded-2xl bg-white px-6 py-10 text-center shadow-soft ring-1 ring-slate-200 sm:mt-10 sm:py-12">
          <p className="text-sm font-semibold text-slate-700">Equipo de operaciones</p>
          <p className="mt-2 text-lg font-black text-slate-900">DW Consulware</p>
        </footer>
      </div>
    </main>
  );
}
