'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

export default function GenerateFeesPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateFeesResult | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fees/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(month, 10), year: parseInt(year, 10) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar las cuotas');
      }

      setResult(data as GenerateFeesResult);
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
            Las cuotas se generan con el monto actual de cada categoria y vencimiento el dia 10.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Mes</Label>
                <Select value={month} onValueChange={(value) => setMonth(value ?? '')}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(monthLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Generar cuotas
            </Button>
          </form>

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
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
