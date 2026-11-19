'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2, AlertCircle, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentPortal } from './PaymentPortal';
import { toast } from '@/components/ui/toast';
import type { MemberFeesResponse } from '@/types/fee';

interface InstitutionPaymentPortalProps {
  clubName: string;
  slug: string;
  prefilledDni?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

type Step = 'dni' | 'code';

const RESEND_COOLDOWN_SECONDS = 60;

export function InstitutionPaymentPortal({
  clubName,
  slug,
  prefilledDni,
  primaryColor,
}: InstitutionPaymentPortalProps) {
  const storageKey = `libres-cobros:member-dni:${slug}`;
  const [step, setStep] = useState<Step>('dni');
  const [dni, setDni] = useState(prefilledDni ?? '');
  const [code, setCode] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemberFeesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accentStyle = primaryColor ? { color: primaryColor } : undefined;

  useEffect(() => {
    if (prefilledDni) {
      try {
        window.sessionStorage.setItem(storageKey, prefilledDni);
      } catch {
        // ignore storage failures
      }
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored) {
        const handle = window.setTimeout(() => setDni(stored), 0);
        return () => window.clearTimeout(handle);
      }
    } catch {
      // ignore storage failures
    }
  }, [prefilledDni, storageKey]);

  // Resend countdown tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const handle = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(handle);
  }, [cooldown]);

  function rememberDni(value: string) {
    try {
      window.sessionStorage.setItem(storageKey, value);
    } catch {
      // ignore storage failures
    }
  }

  async function loadFees(cleanDni: string, opts?: { unknownDniHint?: boolean }) {
    const response = await fetch(
      `/api/member/fees?dni=${encodeURIComponent(cleanDni)}&clubSlug=${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    const data = await response.json();

    if (!response.ok) {
      // After a bypass (no OTP) a 401 means the DNI does not resolve to a
      // member with a session — for opted-out clubs that is an unknown DNI.
      if (response.status === 401 && opts?.unknownDniHint) {
        throw new Error('No encontramos un socio con ese DNI en esta institución.');
      }
      throw new Error(data.error || 'No se pudieron cargar las cuotas');
    }

    setResult(data as MemberFeesResponse);
    rememberDni(cleanDni);
  }

  async function requestCode(cleanDni: string) {
    const response = await fetch('/api/member/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dni: cleanDni, clubSlug: slug }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No pudimos procesar tu solicitud');
    }

    if (data.otpRequired) {
      setStep('code');
      setCode('');
      setCodeMessage(data.message ?? '');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }

    // Bypass or already authenticated: the session cookie is set, load data.
    await loadFees(cleanDni, { unknownDniHint: true });
  }

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
      await requestCode(cleanDni);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al buscar el socio';
      setError(message);
      toast.add({ title: 'Error', description: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();

    const cleanDni = dni.trim();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Ingresá el código que recibiste');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/member/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: cleanDni, clubSlug: slug, code: cleanCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'El código es incorrecto.');
      }

      setStep('dni');
      setCode('');
      await loadFees(cleanDni);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo verificar el código';
      setError(message);
      toast.add({ title: 'Error', description: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || loading) return;

    setLoading(true);
    setError(null);

    try {
      await requestCode(dni.trim());
      toast.add({
        title: 'Código reenviado',
        description: 'Revisá tu WhatsApp para el código nuevo.',
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No pudimos reenviar el código';
      setError(message);
      toast.add({ title: 'Error', description: message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/member/auth/logout', { method: 'POST' });
    } catch {
      // Session cookie clearing is best-effort; state reset proceeds anyway.
    }
    setResult(null);
    setError(null);
    setDni('');
    setCode('');
    setStep('dni');
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* Hero Section */}
      <div className="mb-10 text-center">
        <p
          className="font-mono text-xs tracking-[0.2em] uppercase mb-3"
          style={accentStyle || { color: 'hsl(var(--accent))' }}
        >
          Portal de Pagos
        </p>
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight mb-3"
          style={accentStyle || { color: 'hsl(var(--accent))' }}
        >
          {clubName}
        </h1>
        <p className="max-w-sm mx-auto text-muted-foreground leading-relaxed mb-8 text-sm">
          Ingresá tu DNI para ver tus cuotas pendientes y realizar pagos.
        </p>
      </div>

      {/* Search Section */}
      <section className="py-6 px-6">
        <div className="max-w-lg mx-auto">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-5 text-center">
              <p
                className="font-mono text-xs tracking-[0.2em] uppercase mb-2"
                style={accentStyle || { color: 'hsl(var(--accent))' }}
              >
                {step === 'dni' ? 'Buscar Socio' : 'Verificación'}
              </p>
              <h2 className="text-xl font-bold">
                {step === 'dni' ? 'Consultá tus Cuotas' : 'Ingresá el código'}
              </h2>
            </div>

            {step === 'dni' ? (
              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Ingresá tu DNI"
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="h-11 pl-10 text-base rounded-xl"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 px-6 font-medium"
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
            ) : (
              <form onSubmit={handleVerify} className="space-y-3">
                <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    {codeMessage ||
                      'Si el DNI corresponde a un socio, recibirás un código.'}
                  </span>
                </div>
                <Input
                  placeholder="Ingresá el código"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-12 text-center text-xl tracking-[0.5em] font-mono rounded-xl"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  autoFocus
                  disabled={loading}
                />
                <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 size-4" />
                  )}
                  Verificar
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleResend}
                    disabled={loading || cooldown > 0}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setStep('dni');
                      setCode('');
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Volver
                  </Button>
                </div>
              </form>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {loading && step === 'dni' && !result && (
        <section className="py-6 px-6">
          <div className="max-w-lg mx-auto space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </section>
      )}

      {result && (
        <>
          <PaymentPortal
            member={result.member}
            fees={result.fees}
            institutionSlug={slug}
            memberEmail={result.member.email}
          />
          <div className="pb-8 text-center">
            <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
              Cambiar socio
            </Button>
          </div>
        </>
      )}
    </>
  );
}
