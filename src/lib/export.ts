/**
 * CSV generation and browser download helpers for data exports.
 */

export type ExportFormat = 'csv' | 'json';

export type ExportTable =
  | 'socios'
  | 'cuotas'
  | 'pagos'
  | 'comisiones'
  | 'planes'
  | 'configuracion';

export const EXPORT_TABLES: ExportTable[] = [
  'socios',
  'cuotas',
  'pagos',
  'comisiones',
  'planes',
  'configuracion',
];

export const TABLE_LABELS: Record<ExportTable, string> = {
  socios: 'Socios',
  cuotas: 'Cuotas',
  pagos: 'Pagos',
  comisiones: 'Comisiones',
  planes: 'Planes',
  configuracion: 'Configuración',
};

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function escapeCSVCell(value: string): string {
  const needsQuotes =
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');

  if (!needsQuotes) return value;

  // RFC 4180: double quotes are escaped by doubling them.
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Converts an array of plain objects to a CSV string.
 * Headers are derived from the keys of the first object.
 */
export function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const lines = [
    headers.map(escapeCSVCell).join(','),
    ...data.map((row) =>
      headers.map((header) => escapeCSVCell(serializeValue(row[header]))).join(',')
    ),
  ];

  return lines.join('\n');
}

/**
 * Triggers a browser download for the given content.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
