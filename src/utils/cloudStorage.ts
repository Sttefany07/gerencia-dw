import { CommercialRate, OperationRate, UploadItem } from "../types";

export type CloudAppState = {
  uploads: UploadItem[];
  activeUploadId: string;
  operationRates: OperationRate[];
  commercialRates: CommercialRate[];
};

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const STATE_KEY = import.meta.env.VITE_SUPABASE_STATE_KEY || "global";
const TABLE_NAME = "app_state";

export function isCloudStorageConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function loadCloudState(): Promise<CloudAppState | null> {
  if (!isCloudStorageConfigured()) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?state_key=eq.${encodeURIComponent(STATE_KEY)}&select=data&limit=1`,
    {
      headers: supabaseHeaders()
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo leer Supabase: ${response.status} ${response.statusText}`);
  }

  const rows = (await response.json()) as Array<{ data: CloudAppState }>;
  return rows[0]?.data ?? null;
}

export async function saveCloudState(state: CloudAppState) {
  if (!isCloudStorageConfigured()) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}?on_conflict=state_key`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      state_key: STATE_KEY,
      data: state,
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`No se pudo guardar en Supabase: ${response.status} ${response.statusText}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  };
}
