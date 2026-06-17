import { CurrencyCode } from "../types";

export function roundNumber(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatHours(value: number) {
  return `${roundNumber(value, 2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
}

export function formatMoney(value: number, currency: CurrencyCode | string = "USD") {
  const prefix = currency === "PEN" ? "S/" : "US$";
  return `${prefix} ${roundNumber(value, 2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number) {
  return `${roundNumber(value * 100, 2).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatPp(value: number) {
  const pp = roundNumber(value * 100, 2);
  return `${pp >= 0 ? "+" : ""}${pp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pp`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
