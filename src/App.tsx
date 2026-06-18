import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { GeneralManagement } from "./components/GeneralManagement";
import { UploadTab } from "./components/UploadTab";
import { ServicesManagement } from "./components/ServicesManagement";
import { Tabs } from "./components/Tabs";
import { EstimatesTab } from "./components/EstimatesTab";
import { CloudAppState, FilterState, ProjectEstimate, TariffRate, UploadItem, ViewKey } from "./types";
import { buildEstimatesFromRecords, defaultTariffs, emptyFilters, ensureTariffsForRecords, sanitizeTariffs } from "./utils/calculations";
import { isCloudStorageConfigured, loadCloudState, saveCloudState } from "./utils/cloudStorage";
import { createId } from "./utils/ids";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "./utils/storage";

export default function App() {
  const [activeView, setActiveView] = useState<ViewKey>("general");
  const [uploads, setUploads] = useState<UploadItem[]>(() => loadFromStorage(STORAGE_KEYS.uploads, []));
  const [activeUploadId, setActiveUploadId] = useState<string>(() => loadFromStorage(STORAGE_KEYS.activeUploadId, ""));
  const [tariffs, setTariffs] = useState<TariffRate[]>(() => sanitizeTariffs(loadFromStorage(STORAGE_KEYS.tariffs, defaultTariffs)));
  const [estimates, setEstimates] = useState<ProjectEstimate[]>(() => loadFromStorage(STORAGE_KEYS.estimates, []));
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [cloudReady, setCloudReady] = useState(!isCloudStorageConfigured());
  const [cloudStatus, setCloudStatus] = useState(isCloudStorageConfigured() ? "Sincronizando nube..." : "Guardado local");
  const hasLoadedCloud = useRef(false);

  useEffect(() => saveToStorage(STORAGE_KEYS.uploads, uploads), [uploads]);
  useEffect(() => saveToStorage(STORAGE_KEYS.activeUploadId, activeUploadId), [activeUploadId]);
  useEffect(() => saveToStorage(STORAGE_KEYS.tariffs, tariffs), [tariffs]);
  useEffect(() => saveToStorage(STORAGE_KEYS.estimates, estimates), [estimates]);

  useEffect(() => {
    if (!isCloudStorageConfigured()) {
      hasLoadedCloud.current = true;
      setCloudReady(true);
      setCloudStatus("Guardado local");
      return;
    }

    let cancelled = false;
    async function hydrate() {
      try {
        const cloudState = await loadCloudState();
        if (cancelled) return;
        if (cloudState) {
          setUploads(cloudState.uploads ?? []);
          setActiveUploadId(cloudState.activeUploadId ?? "");
          setTariffs(sanitizeTariffs(cloudState.tariffs ?? defaultTariffs));
          setEstimates(cloudState.estimates ?? []);
          setCloudStatus("Guardado en nube");
        } else {
          setCloudStatus("Nube lista");
        }
      } catch (error) {
        console.error(error);
        setCloudStatus("No se pudo sincronizar con nube; usando local");
      } finally {
        hasLoadedCloud.current = true;
        setCloudReady(true);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isCloudStorageConfigured() || !cloudReady || !hasLoadedCloud.current) return;
    const state: CloudAppState = { uploads, activeUploadId, tariffs, estimates };
    const timeout = window.setTimeout(async () => {
      try {
        await saveCloudState(state);
        setCloudStatus("Guardado en nube");
      } catch (error) {
        console.error(error);
        setCloudStatus("Error al guardar en nube");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [uploads, activeUploadId, tariffs, estimates, cloudReady]);

  const activeUpload = useMemo(() => uploads.find((upload) => upload.id === activeUploadId) ?? uploads[0] ?? null, [uploads, activeUploadId]);
  const records = activeUpload?.records ?? [];

  const createUpload = (payload: Omit<UploadItem, "id" | "uploadedAt" | "status">) => {
    const id = createId("upload");
    const upload: UploadItem = { ...payload, id, uploadedAt: new Date().toISOString(), status: "Activa" };
    const nextTariffs = ensureTariffsForRecords(payload.records, tariffs, estimates);
    const importedEstimates = buildEstimatesFromRecords(payload.records, nextTariffs, payload.fileName);
    setUploads((current) => [upload, ...current.map((item) => ({ ...item, status: "Histórica" as const }))]);
    setActiveUploadId(id);
    setTariffs(nextTariffs);
    if (importedEstimates.length > 0) setEstimates(importedEstimates);
    setFilters(emptyFilters);
    setActiveView(importedEstimates.length > 0 ? "estimates" : "services");
  };

  const activateUpload = (id: string) => {
    const selected = uploads.find((upload) => upload.id === id);
    setUploads((current) => current.map((upload) => ({ ...upload, status: upload.id === id ? "Activa" : "Histórica" })));
    setActiveUploadId(id);
    setFilters(emptyFilters);
    if (selected) setTariffs((current) => ensureTariffsForRecords(selected.records, current, estimates));
  };

  const deleteUpload = (id: string) => {
    setUploads((current) => {
      const remaining = current.filter((upload) => upload.id !== id);
      if (id === activeUploadId) setActiveUploadId(remaining[0]?.id ?? "");
      return remaining.map((upload, index) => ({ ...upload, status: index === 0 ? "Activa" : "Histórica" }));
    });
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid w-full max-w-[1800px] gap-4 px-3 py-4 sm:px-5 lg:px-8">
        <header className="rounded-2xl bg-gradient-to-r from-slate-950 to-blue-950 p-5 text-white shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">Sistema ejecutivo DW Consulware</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Gestion de proyectos, horas y rentabilidad</h1>
              <p className="mt-2 max-w-4xl text-sm font-semibold text-blue-100">Trazabilidad desde estimacion por proyecto hasta ejecucion ClickUp y rentabilidad proyectada.</p>
            </div>
            <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-black text-blue-100 ring-1 ring-white/20">{cloudStatus}</span>
          </div>
        </header>

        <Tabs active={activeView} onChange={setActiveView} />

        {activeView === "upload" && (
          <UploadTab
            uploads={uploads}
            activeUploadId={activeUploadId}
            onCreateUpload={createUpload}
            onActivateUpload={activateUpload}
            onDeleteUpload={deleteUpload}
          />
        )}

        {activeView === "estimates" && (
          <EstimatesTab
            estimates={estimates}
            tariffs={tariffs}
            onEstimatesChange={(next) => {
              setEstimates(next);
              setTariffs((current) => ensureTariffsForRecords(records, current, next));
            }}
          />
        )}

        {!records.length && activeView !== "upload" && activeView !== "estimates" && (
          <section className="rounded-2xl bg-amber-50 p-5 text-amber-900 shadow-soft ring-1 ring-amber-200">
            <div className="flex gap-3">
              <AlertTriangle className="shrink-0" />
              <div>
                <h2 className="font-black">Carga un Excel para habilitar las vistas.</h2>
                <p className="mt-1 text-sm font-semibold">Entra a la pestaña “Carga de Excel” y selecciona el Excel exportado desde ClickUp.</p>
              </div>
            </div>
          </section>
        )}

        {records.length > 0 && activeView === "services" && <ServicesManagement records={records} filters={filters} onFiltersChange={setFilters} tariffs={tariffs} estimates={estimates} />}
        {records.length > 0 && activeView === "general" && <GeneralManagement records={records} filters={filters} onFiltersChange={setFilters} tariffs={tariffs} estimates={estimates} />}

        <footer className="mt-4 rounded-2xl bg-white px-6 py-8 text-center shadow-soft ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-600">Equipo de operaciones</p>
          <p className="mt-1 text-lg font-black text-slate-950">DW Consulware</p>
        </footer>
      </div>
    </main>
  );
}
