export const STORAGE_KEYS = {
  uploads: "dw_uploads_v16",
  activeUploadId: "dw_active_upload_v16",
  tariffs: "dw_tariffs_v16"
};

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage puede fallar en modo privado; la app sigue funcionando en memoria.
  }
}
