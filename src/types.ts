export type CurrencyCode = "USD" | "PEN";
export type ViewKey = "upload" | "rates" | "services" | "general";

export type ValidationWarning = {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
  count?: number;
};

export type NormalizedRecord = {
  id: string;
  taskId: string;
  taskName: string;
  parentId: string;
  pais: string;
  cliente: string;
  proyecto: string;
  hitoFacturable: string;
  horasEstimadas: number;
  horasRegistradas: number;
  horasFacturables: number;
  fechaInicio: string;
  fechaFin: string;
  raw?: Record<string, unknown>;
};

export type UploadItem = {
  id: string;
  fileName: string;
  uploadedAt: string;
  rowCount: number;
  status: "Activa" | "Histórica";
  records: NormalizedRecord[];
  warnings: ValidationWarning[];
};

export type TariffRate = {
  id: string;
  pais: string;
  cliente: string;
  proyecto: string;
  perfil: string;
  tarifa: number;
  moneda: CurrencyCode;
  status: "Activo" | "Inactivo";
};

export type FilterState = {
  fechaInicio: string;
  fechaFin: string;
  pais: string;
  cliente: string;
  proyecto: string;
  hitoFacturable: string;
};

export type ComputedRecord = NormalizedRecord & {
  tarifa: number;
  moneda: CurrencyCode;
  costoPorHora70: number;
  ingresoEstimado: number;
  ingresoReal: number;
  costoEstimado70: number;
  costoEjecutado70: number;
  horasNoFacturables: number;
  progreso: number;
  saldoDisponible70: number;
  proyeccionCosto: number;
  rentabilidadEstimada: number;
  rentabilidadProyectada: number;
  desviacionPp: number;
  margenGenerado: number;
  tieneTarifa: boolean;
};

export type ServiceProjectSummary = {
  id: string;
  pais: string;
  cliente: string;
  proyecto: string;
  moneda: CurrencyCode;
  horasEstimadas: number;
  horasRegistradas: number;
  horasFacturables: number;
  horasNoFacturables: number;
  progreso: number;
  costoEstimado70: number;
  costoEjecutado70: number;
  saldoDisponible70: number;
};

export type ServiceConsultantSummary = {
  id: string;
  consultor: string;
  pais: string;
  cliente: string;
  proyecto: string;
  perfil: string;
  moneda: CurrencyCode;
  horasEstimadas: number;
  horasRegistradas: number;
  horasFacturables: number;
  tarifa: number;
  costoPorHora70: number;
  costoEjecutado70: number;
  progreso: number;
};

export type GeneralProjectSummary = {
  id: string;
  pais: string;
  cliente: string;
  proyecto: string;
  moneda: CurrencyCode;
  ingresoEstimado: number;
  ingresoReal: number;
  costoEstimado70: number;
  costoEjecutado70: number;
  proyeccionCosto: number;
  rentabilidadEstimada: number;
  rentabilidadProyectada: number;
  desviacionPp: number;
};

export type GeneralConsultantSummary = {
  id: string;
  consultor: string;
  proyecto: string;
  perfil: string;
  moneda: CurrencyCode;
  horasRegistradas: number;
  tarifa: number;
  ingresoGenerado: number;
  costoEjecutado70: number;
  margenGenerado: number;
  participacionMargen: number;
};

export type CloudAppState = {
  uploads: UploadItem[];
  activeUploadId: string;
  tariffs: TariffRate[];
};
