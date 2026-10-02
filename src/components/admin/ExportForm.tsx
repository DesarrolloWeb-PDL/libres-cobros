'use client';

import { useState } from 'react';
import { Download, Loader2, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  EXPORT_TABLES,
  TABLE_LABELS,
  type ExportTable,
  type ExportFormat,
  downloadFile,
} from '@/lib/export';

interface ExportFormProps {
  institutionId?: string | null;
}

export function ExportForm({ institutionId }: ExportFormProps) {
  const [selectedTables, setSelectedTables] = useState<ExportTable[]>(['socios']);
  const [format, setFormat] = useState<ExportFormat>('json');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  function toggleTable(table: ExportTable) {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  }

  function selectAll() {
    setSelectedTables([...EXPORT_TABLES]);
  }

  function clearAll() {
    setSelectedTables([]);
  }

  async function handleExport() {
    if (selectedTables.length === 0) {
      toast.add({
        title: 'Selección vacía',
        description: 'Seleccioná al menos una tabla para exportar',
        type: 'error',
      });
      return;
    }

    if (format === 'csv' && selectedTables.length > 1) {
      toast.add({
        title: 'CSV requiere una tabla',
        description: 'Seleccioná una sola tabla para exportar en formato CSV',
        type: 'error',
      });
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.set('tables', selectedTables.join(','));
      params.set('format', format);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (institutionId) params.set('institutionId', institutionId);

      const response = await fetch(`/api/admin/export?${params.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Error al generar la exportación');
      }

      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] ?? 'exportacion';
      const content = await response.text();

      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
      downloadFile(content, filename, mimeType);

      toast.add({
        title: 'Exportación lista',
        description: `Descargaste ${selectedTables.length} tabla(s) en formato ${format.toUpperCase()}`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo exportar',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm">
      {/* Tables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Tablas a exportar</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              Seleccionar todas
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {EXPORT_TABLES.map((table) => (
            <label
              key={table}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                selectedTables.includes(table)
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-background/50 hover:bg-muted/50'
              )}
            >
              <input
                type="checkbox"
                checked={selectedTables.includes(table)}
                onChange={() => toggleTable(table)}
                className="size-4 shrink-0 accent-primary"
              />
              <span className="text-sm font-medium">{TABLE_LABELS[table]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-3">
        <Label>Formato</Label>
        <div className="flex flex-wrap gap-3">
          <label
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors',
              format === 'json'
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-background/50 hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              className="size-4 shrink-0 accent-primary"
            />
            <FileJson className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">JSON</span>
          </label>

          <label
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors',
              format === 'csv'
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-background/50 hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="size-4 shrink-0 accent-primary"
            />
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">CSV</span>
          </label>
        </div>
        {format === 'csv' && (
          <p className="text-xs text-muted-foreground">
            CSV permite exportar una sola tabla por archivo.
          </p>
        )}
      </div>

      {/* Date range */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="export-from">Desde</Label>
          <Input
            id="export-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="export-to">Hasta</Label>
          <Input
            id="export-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={handleExport} disabled={isExporting} className="gap-2">
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {isExporting ? 'Exportando...' : 'Exportar datos'}
        </Button>
      </div>
    </div>
  );
}
