'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, Loader2, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StyledSelect } from '@/components/ui/styled-select';
import { toast } from '@/components/ui/toast';
import type { GenerateFeesResult } from '@/types/fee';

const monthLabels: Record<number, string> = {
  1: 'Enero',
  2: 'Febrero',
  3: 'Marzo',
  4: 'Abril',
  5: 'Mayo',
  6: 'Junio',
  7: 'Julio',
  8: 'Agosto',
  9: 'Septiembre',
  10: 'Octubre',
  11: 'Noviembre',
  12: 'Diciembre',
};

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
});

export default function GenerateFeesPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [imputationDate, setImputationDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [result, setResult] = useState<GenerateFeesResult | null>(null);
  const [preview, setPreview] = useState<GenerateFeesResult | null>(null);

  async function callGenerate(dryRun: boolean) {
    const body: Record<string, unknown> = {
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      dryRun,
    };
    if (imputationDate) {
      body.imputationDate = imputationDate;
    }

    const response = await fetch('/api/admin/fees/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al procesar las cuotas');
    }

    return data as GenerateFeesResult;
  }

  async function handlePreview() {
    setIsPreviewing(true);
    setPreview(null);

    try {
      const data = await callGenerate(true);
      setPreview(data);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo obtener la vista previa',
        type: 'error',
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const data = await callGenerate(false);
      setResult(data);
      setPreview(null);
      toast.add({
        title: 'Cuotas generadas',
        description: `Se crearon ${data.created} cuotas y se omitieron ${data.skipped}.`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudieron generar las cuotas',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/cuotas" aria-label="Volver al listado">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generar cuotas</h1>
          <p className="text-muted-foreground">
            Generar cuotas mensuales para todos los socios activos.
          </p>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Seleccionar periodo
          </CardTitle>
          <CardDescription>
            Las cuotas se generan con el monto actual de cada categoria y vencimiento segun la fecha de imputacion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Mes</Label>
                <StyledSelect
                  id="month"
                  value={month}
                  onChange={(value) => setMonth(value)}
                  options={Object.entries(monthLabels).map(([key, label]) => ({
                    value: key,
                    label,
                  }))}
                  placeholder="Seleccionar mes"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Año</Label>
                <Input
                  id="year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imputationDate">Fecha de imputacion (opcional)</Label>
              <Input
                id="imputationDate"
                type="date"
                value={imputationDate}
                onChange={(e) => setImputationDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Si no se indica, el vencimiento sera el dia 10 del mes seleccionado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPreviewing || isLoading}
                onClick={() => handlePreview()}
              >
                {isPreviewing && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Eye className="mr-2 size-4" />
                Vista previa
              </Button>
              <Button type="submit" disabled={isLoading || isPreviewing} className="w-full sm:w-auto">
                {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Generar cuotas
              </Button>
            </div>
          </form>

          {preview && (
            <div className="mt-6 rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-2 font-medium">Vista previa (borrador)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Periodo</span>
                  <p className="font-medium">
                    {monthLabels[preview.month]} {preview.year}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cuotas a generar</span>
                  <p className="font-medium text-blue-600">{preview.toCreate ?? 0}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total a imputar</span>
                  <p className="font-medium">{currencyFormatter.format(preview.totalAmount ?? 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Omitidas (ya existen)</span>
                  <p className="font-medium text-yellow-600">{preview.skipped}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-2 font-medium">Resumen</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Periodo</span>
                  <p className="font-medium">
                    {monthLabels[result.month]} {result.year}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Creadas</span>
                  <p className="font-medium text-green-600">{result.created}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Omitidas</span>
                  <p className="font-medium text-yellow-600">{result.skipped}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total de socios procesados</span>
                  <p className="font-medium">{result.created + result.skipped}</p>
                </div>
                {result.totalAmount !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Total imputado</span>
                    <p className="font-medium">{currencyFormatter.format(result.totalAmount)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}