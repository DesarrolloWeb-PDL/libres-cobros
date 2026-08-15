import * as XLSX from 'xlsx';

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
}

export function generateExcel(
  columns: ExcelColumn[],
  rows: Record<string, string | number | null | undefined>[],
  sheetName = 'Reporte'
): { buffer: Buffer; contentType: string; filename: string } {
  const headers = columns.map((col) => col.header);
  const data = rows.map((row) =>
    columns.map((col) => {
      const value = row[col.key];
      return value === null || value === undefined ? '' : value;
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  const columnWidths = columns.map((col) => ({
    wch: col.width ?? Math.max(col.header.length + 2, 12),
  }));
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  return {
    buffer: Buffer.from(buffer),
    contentType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `${sheetName.toLowerCase().replace(/\s+/g, '-')}.xlsx`,
  };
}
