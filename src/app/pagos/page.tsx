'use client';

import { useState } from 'react';
import { Search, UserRound, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentPortal } from '@/components/member/PaymentPortal';
import { toast } from '@/components/ui/toast';
import type { MemberFeesResponse } from '@/types/fee';

export default function MemberPortalPage() {
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberFeesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    const cleanDni = dni.trim();
    if (!cleanDni) {
      setError('Ingresá tu DNI');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/member/fees?dni=${encodeURIComponent(cleanDni)}`, {
        cache: 'no-store',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las cuotas');
      }

      setResult(data as MemberFeesResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al buscar el socio';
      setError(message);
      toast.add({
        title: 'Error',
        description: message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UserRound className="size-5" />
            </div>
            <span className="font-semibold">Portal de Socios</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Consultá tus cuotas</h1>
            <p className="mt-2 text-muted-foreground">
              Ingresá tu DNI para ver tus cuotas pendientes y realizar pagos.
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Ingresá tu DNI"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="h-11 pl-10 text-base"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="h-11" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Search className="mr-2 size-4" />
                  )}
                  Buscar
                </Button>
              </form>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {result && <PaymentPortal member={result.member} fees={result.fees} />}
        </div>
      </main>

      <footer className="border-t bg-muted/30 py-4 text-center text-xs text-muted-foreground">
        <div className="container mx-auto px-4">
          Club Libres — Sistema de cobros. Ante cualquier duda, contactate con administración.
        </div>
      </footer>
    </div>
  );
}
