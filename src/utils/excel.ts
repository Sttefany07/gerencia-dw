import * as XLSX from "xlsx";
import { roundNumber } from "./format";

const HEADER_TOKENS = [
  "pais",
  "país",
  "cliente",
  "proyecto",
  "hito",
  "hitos",
  "rol",
  "assignee",
  "persona",
  "time estimate",
  "time logged",
  "horas",
  "fecha",
  "due date",
  "start date",
  "end date"
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
  const dataRows = matrix.slice(headerRowIndex + 1);

  return dataRows
    .filter((row) => !isRepeatedHeaderRow(row ?? [], headers))
    .filter((row) => meaningfulCellCount(row ?? []) > 1)
    .map((row) => rowToObject(headers, row ?? []))
    .filter((row) => Object.values(row).some((value) => value !== "" && value !== null && value !== undefined));
}

function detectHeaderRow(matrix: unknown[][]) {
  let bestIndex = -1;
  let bestScore = 0;

  matrix.slice(0, 30).forEach((row, index) => {
    const cells = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    if (cells.length < 3) return;

    const normalizedCells = cells.map(normalizeHeaderProbe);
    const score = normalizedCells.reduce((acc, cell) => {
      const matched = HEADER_TOKENS.some((token) => cell === normalizeHeaderProbe(token) || cell.includes(normalizeHeaderProbe(token)));
      return acc + (matched ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 3 ? bestIndex : -1;
}

function isRepeatedHeaderRow(row: unknown[], headers: string[]) {
  const normalizedHeaders = new Set(headers.map(normalizeHeaderProbe));
  const nonEmpty = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
  if (nonEmpty.length < 3) return false;

  const matches = nonEmpty.reduce((acc, cell) => {
    return acc + (normalizedHeaders.has(normalizeHeaderProbe(cell)) ? 1 : 0);
  }, 0);

  return matches >= 3;
}

function meaningfulCellCount(row: unknown[]) {
  return row.filter((cell) => {
    if (cell === null || cell === undefined) return false;
    return String(cell).trim() !== "";
  }).length;
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
  const output: Record<string, unknown> = {};
  headers.forEach((header, index) => {
    output[header] = row[index] ?? "";
  });
  return output;
}

function normalizeHeaderProbe(value: string) {
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

export type ExportSheet = {
  sheetName: string;
  rows: Record<string, string | number>[];
};

export function exportRowsToExcel<T>(rows: T[], columns: ExportColumn<T>[], fileName: string) {
  exportSheetsToExcel([{ sheetName: "Datos", rows: createExportData(rows, columns) }], fileName);
}

export function createExportSheet<T>(sheetName: string, rows: T[], columns: ExportColumn<T>[]): ExportSheet {
  return { sheetName, rows: createExportData(rows, columns) };
}

export function exportSheetsToExcel(sheets: ExportSheet[], fileName: string) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheetConfig, index) => {
    const sheet = XLSX.utils.json_to_sheet(sheetConfig.rows);
    XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(sheetConfig.sheetName || `Hoja ${index + 1}`));
  });

  XLSX.writeFile(workbook, `${sanitizeFileName(fileName)}.xlsx`);
}

export function createExportData<T>(rows: T[], columns: ExportColumn<T>[]) {
  return rows.map((row) => rowToExportObject(row, columns));
}

function rowToExportObject<T>(row: T, columns: ExportColumn<T>[]) {
  const item: Record<string, string | number> = {};
  columns.forEach((column) => {
    const value = column.value(row);
    item[column.header] = value === null || value === undefined ? "" : typeof value === "number" ? roundNumber(value, 2) : value;
  });
  return item;
}

function sanitizeSheetName(sheetName: string) {
  return sheetName
    .replace(/[\/?*\[\]:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Datos";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);
}
