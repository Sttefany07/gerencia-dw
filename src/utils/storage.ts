const isBrowser = typeof window !== "undefined";

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const STORAGE_KEYS = {
  uploads: "gt_uploads",
  activeUploadId: "gt_active_upload_id",
  operationRates: "gt_operation_rates",
  commercialRates: "gt_commercial_rates"
};
