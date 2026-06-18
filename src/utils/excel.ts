import * as XLSX from "xlsx";
import { roundNumber } from "./format";

const HEADER_TOKENS = [
  "task id",
  "task name",
  "parent id",
  "assignee",
  "persona",
  "time estimate",
  "time logged",
  "pais",
  "país",
  "cliente",
  "proyecto",
  "rol",
  "due date"
];

export async function readWorkbook(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false
  });

  const headerRowIndex = detectHeaderRow(matrix);
  if (headerRowIndex < 0) return [];

  const headers = buildUniqueHeaders(matrix[headerRowIndex] ?? []);
  return matrix
    .slice(headerRowIndex + 1)
    .filter((row) => meaningfulCellCount(row ?? []) > 1)
    .filter((row) => !isRepeatedHeader(row ?? [], headers))
    .map((row) => rowToObject(headers, row ?? []))
    .filter((row) => Object.values(row).some((value) => value !== "" && value !== null && value !== undefined));
}

function detectHeaderRow(matrix: unknown[][]) {
  let bestIndex = -1;
  let bestScore = 0;
  matrix.slice(0, 35).forEach((row, index) => {
    const cells = row.map((cell) => normalizeHeader(String(cell ?? ""))).filter(Boolean);
    if (cells.length < 3) return;
    const score = cells.reduce((acc, cell) => {
      return acc + (HEADER_TOKENS.some((token) => cell === normalizeHeader(token) || cell.includes(normalizeHeader(token))) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestScore >= 3 ? bestIndex : -1;
}

function isRepeatedHeader(row: unknown[], headers: string[]) {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const cells = row.map((cell) => normalizeHeader(String(cell ?? ""))).filter(Boolean);
  if (cells.length < 3) return false;
  return cells.filter((cell) => normalizedHeaders.has(cell)).length >= 3;
}

function meaningfulCellCount(row: unknown[]) {
  return row.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "").length;
}

function buildUniqueHeaders(row: unknown[]) {
  const used = new Map<string, number>();
  return row.map((cell, index) => {
    const base = String(cell ?? "").trim() || `Columna ${index + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function rowToObject(headers: string[], row: unknown[]) {
  const out: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    out[header] = row[index] ?? "";
  });
  return out;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export function exportRowsToExcel<T>(rows: T[], columns: ExportColumn<T>[], fileName: string) {
  exportSheetsToExcel([{ sheetName: "Datos", rows: createExportData(rows, columns) }], fileName);
}

export function createExportSheet<T>(sheetName: string, rows: T[], columns: ExportColumn<T>[]) {
  return { sheetName, rows: createExportData(rows, columns) };
}

export function exportSheetsToExcel(sheets: Array<{ sheetName: string; rows: Record<string, string | number>[] }>, fileName: string) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet, index) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.sheetName || `Hoja ${index + 1}`));
  });
  XLSX.writeFile(workbook, `${sanitizeFileName(fileName)}.xlsx`);
}

function createExportData<T>(rows: T[], columns: ExportColumn<T>[]) {
  return rows.map((row) => {
    const item: Record<string, string | number> = {};
    columns.forEach((column) => {
      const value = column.value(row);
      item[column.header] = value === null || value === undefined ? "" : typeof value === "number" ? roundNumber(value, 2) : value;
    });
    return item;
  });
}

function sanitizeSheetName(sheetName: string) {
  return sheetName.replace(/[\/?*\[\]:]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Datos";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}
