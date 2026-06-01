export type Severity = "info" | "warning" | "error";

export type CurrencyCode = "PEN" | "USD";

export type ValidationWarning = {
  id: string;
  severity: Severity;
  type:
    | "missing-column"
    | "numeric"
    | "default"
    | "tariff"
    | "empty"
    | "zero"
    | "date";
  message: string;
  count?: number;
};

export type NormalizedRecord = {
  id: string;
  pais: string;
  cliente: string;
  proyecto: string;
  hitoFacturable: string;
  rolEstimado: string;
  rolAsignado: string;
  persona: string;
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
  description: string;
  uploadedAt: string;
  rowCount: number;
  status: "Activa" | "Histórica";
  records: NormalizedRecord[];
  warnings: ValidationWarning[];
};

export type OperationRate = {
  id: string;
  role: string;
  rate: number;
  currency?: CurrencyCode;
  updatedAt: string;
  status: "Activo" | "Inactivo";
};

export type CommercialRate = {
  id: string;
  pais: string;
  cliente: string;
  proyecto: string;
  role: string;
  rate: number;
  currency?: CurrencyCode;
  validFrom: string;
  status: "Activo" | "Inactivo";
};

export type FilterState = {
  pais: string;
  cliente: string;
  proyecto: string;
  hitoFacturable: string;
  fechaInicio: string;
  fechaFin: string;
};

export type ComputedRow = NormalizedRecord & {
  tarifaOperacionesHora: number | null;
  tarifaComercialHora: number | null;
  monedaOperaciones: CurrencyCode;
  monedaComercial: CurrencyCode | null;
  facturacionEstimadaComercial: number;
  facturacionRegistradaComercial: number;
  facturacionRealComercial: number;
  costoEstimadoOperaciones: number;
  costoEjecutadoOperaciones: number;
  costoRealOperaciones: number;
  resultadoOperativo: number | null;
  tieneTarifaOperaciones: boolean;
  tieneTarifaComercial: boolean;
};

export type SummaryRow = {
  id: string;
  pais: string;
  proyecto: string;
  monedaOperaciones?: string;
  monedaComercial?: string;
  horasEstimadas: number;
  horasRegistradas: number;
  horasFacturables: number;
  facturacionEstimadaComercial?: number;
  facturacionRegistradaComercial?: number;
  facturacionRealComercial?: number;
  costoEstimadoOperaciones?: number;
  costoEjecutadoOperaciones?: number;
  costoRealOperaciones: number;
  resultadoOperativo?: number;
};

export type ConsultantSummaryRow = {
  id: string;
  persona: string;
  paises: string;
  clientes: string;
  proyectos: string;
  roles: string;
  monedaOperaciones: string;
  monedaComercial: string;
  horasEstimadas: number;
  horasRegistradas: number;
  horasFacturables: number;
  facturacionEstimadaComercial: number;
  facturacionRegistradaComercial: number;
  facturacionRealComercial: number;
  costoEstimadoOperaciones: number;
  costoEjecutadoOperaciones: number;
  costoRealOperaciones: number;
  resultadoOperativo: number | null;
};

export type TabKey = "upload" | "rates" | "general" | "services";
