'use client';

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

export interface ExportFilters {
  type: 'debts' | 'payments' | 'commissions';
  month?: string;
  year?: string;
  category?: string;
  memberId?: string;
  method?: string;
  from?: string;
  to?: string;
  periodId?: string;
}

interface ExportButtonProps {
  filters: ExportFilters;
  filename?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
}

export function ExportButton({
  filters,
  filename,
  label = 'Exportar Excel',
  variant = 'outline',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('type', filters.type);
      if (filters.month) queryParams.set('month', filters.month);
      if (filters.year) queryParams.set('year', filters.year);
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.memberId) queryParams.set('memberId', filters.memberId);
      if (filters.method) queryParams.set('method', filters.method);
      if (filters.from) queryParams.set('from', filters.from);
      if (filters.to) queryParams.set('to', filters.to);
      if (filters.periodId) queryParams.set('periodId', filters.periodId);

      const response = await fetch(`/api/admin/reports/export?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Error al generar la exportación');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename ?? getDefaultFilename(filters);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.add({
        title: 'Exportación lista',
        description: 'El archivo se descargó correctamente',
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo exportar el reporte',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleExport}
      disabled={isExporting}
      className="gap-2"
    >
      <FileSpreadsheet className="size-4" />
      {isExporting ? 'Exportando...' : label}
    </Button>
  );
}

function getDefaultFilename(filters: ExportFilters): string {
  const date = new Date().toISOString().slice(0, 10);
  const names: Record<string, string> = {
    debts: 'deudas',
    payments: 'pagos',
    commissions: 'comisiones',
  };
  return `${names[filters.type]}-${date}.xlsx`;
}
