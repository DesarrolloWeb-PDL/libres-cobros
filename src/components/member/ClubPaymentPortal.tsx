'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentPortal } from './PaymentPortal';
import { toast } from '@/components/ui/toast';
import type { MemberFeesResponse } from '@/types/fee';

interface ClubPaymentPortalProps {
  clubName: string;
  slug: string;
  prefilledDni?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export function ClubPaymentPortal({ 
  clubName, 
  slug, 
  prefilledDni, 
  primaryColor,
  secondaryColor,
  accentColor 
}: ClubPaymentPortalProps) {
  const [dni, setDni] = useState(prefilledDni ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberFeesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accentStyle = primaryColor ? { color: primaryColor } : undefined;
  const btnStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;

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
      const response = await fetch(
        `/api/member/fees?dni=${encodeURIComponent(cleanDni)}&clubSlug=${encodeURIComponent(slug)}`,
        { cache: 'no-store' },
      );

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
    <>
      {/* Hero Section - estilo freelancer */}
      <div className="mb-8 text-center">
        <p 
          className="font-mono text-xs tracking-[0.2em] uppercase mb-4"
          style={accentStyle || { color: 'hsl(var(--accent))' }}
        >
          Portal de Pagos
        </p>
        <h1 
          className="text-4xl sm:text-4xl font-bold tracking-tight mb-3"
          style={accentStyle || { color: 'hsl(var(--accent))' }}
        >
          {clubName}
        </h1>
        <p className="max-w-md text-muted-foreground leading-relaxed mb-8">
          Ingresá tu DNI para ver tus cuotas pendientes y realizar pagos.
        </p>
      </div>

      {/* Search Section */}
      <section className="relative py-8 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 text-center">
            <p 
              className="font-mono text-xs tracking-[0.2em] uppercase mb-3"
              style={accentStyle || { color: 'hsl(var(--accent))' }}
            >
              Buscar Socio
            </p>
            <h2 className="text-2xl font-bold mb-6">
              Consultá tus Cuotas
            </h2>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row max-w-xl mx-auto">
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
            <Button 
              type="submit" 
              className="h-11 text-white" 
              style={btnStyle || { backgroundColor: 'hsl(var(--accent))' }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Search className="mr-2 size-4" />
              )}
              Buscar
            </Button>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive max-w-xl mx-auto">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {result && (
        <PaymentPortal
          member={result.member}
          fees={result.fees}
          clubSlug={slug}
        />
      )}
    </>
  );
}
