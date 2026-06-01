import { CurrencyCode } from "../types";

export function roundNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return roundNumber(value, decimals).toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatHours(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, 2)} h`;
}

export function currencySymbol(currency?: CurrencyCode | string | null) {
  if (!currency) return "US$";
  const value = String(currency).toUpperCase();
  if (value === "USD") return "US$";
  if (value === "PEN") return "S/";
  if (value.includes("/")) return value;
  return value;
}

export function formatMoney(value: number | null | undefined, currency: CurrencyCode | string | null = "USD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${currencySymbol(currency)} ${formatNumber(value, 2)}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, 2)}%`;
}

export function dateTimeParts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—" };
  return {
    date: date.toLocaleDateString("es-PE"),
    time: date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
  };
}
