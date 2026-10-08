'use client';

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { Check, Copy, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RegistrationSchema = z.object({
  name: z.string().min(1, 'El nombre del club es obligatorio'),
  siglas: z.string().max(10, 'Las siglas no pueden superar los 10 caracteres').optional(),
  slug: z
    .string()
    .min(1, 'El slug es obligatorio')
    .regex(/^[a-z0-9-]+$/, 'El slug solo admite minúsculas, números y guiones')
    .max(64, 'El slug no puede superar los 64 caracteres'),
  email: z.string().email('Ingresá un email válido'),
  adminName: z.string().min(1, 'El nombre del administrador es obligatorio'),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe tener formato hexadecimal')
    .optional(),
});

interface RegistrationSuccess {
  tempPassword: string;
  email: string;
  clubName: string;
}

function generateSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function TempPasswordCard({ result }: { result: RegistrationSuccess }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = result.tempPassword;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card className="w-full border-accent/30">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-accent/10">
          <ShieldCheck className="size-6 text-accent" />
        </div>
        <CardTitle>Registro recibido</CardTitle>
        <CardDescription>
          Tu registro está pendiente de aprobación por el equipo de Libres Cobros. Vas a poder
          iniciar sesión apenas sea aprobado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
            Contraseña temporal
          </p>
          <p className="font-mono text-2xl font-bold tracking-widest text-foreground break-all select-all">
            {result.tempPassword}
          </p>
          <Button type="button" variant="outline" onClick={handleCopy} className="mt-3 gap-2">
            {copied ? (
              <>
                <Check className="size-4" />
                Copiada
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar contraseña
              </>
            )}
          </Button>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              Esta contraseña se muestra una sola vez. Copiala ahora.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              Iniciá sesión con <strong className="text-foreground">{result.email}</strong> y esta
              contraseña <strong className="text-foreground">recién después</strong> de la
              aprobación.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>Vas a tener que cambiarla en tu primer ingreso.</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function RegistrationForm() {
  const [name, setName] = useState('');
  const [siglas, setSiglas] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [email, setEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<RegistrationSuccess | null>(null);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!slugManuallyEdited) {
        setSlug(generateSlug(value));
      }
    },
    [slugManuallyEdited]
  );

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 64)
    );
  }, []);

  const slugPreview = useMemo(() => {
    if (!slug) return null;
    return `/pagos/${slug}`;
  }, [slug]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setGlobalError('');

    const payload = {
      name,
      siglas: siglas || undefined,
      slug,
      email,
      adminName,
      primaryColor: primaryColor !== '#7c3aed' ? primaryColor : undefined,
    };

    const parsed = RegistrationSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((err) => {
        const key = err.path[0];
        if (key && !(key in fieldErrors)) {
          fieldErrors[key as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = await response.json();

      if (!response.ok) {
        setGlobalError(data.error || 'No se pudo completar el registro');
        return;
      }

      // Do NOT auto-login: the club is PENDING until a super admin approves it.
      setRegistrationResult({
        tempPassword: data.tempPassword,
        email: parsed.data.email,
        clubName: parsed.data.name,
      });
    } catch {
      setGlobalError('Ocurrió un error inesperado. Intentá de nuevo más tarde.');
    } finally {
      setIsLoading(false);
    }
  }

  if (registrationResult) {
    return <TempPasswordCard result={registrationResult} />;
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Registrá tu club y empezá a gestionar tus cobros</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del club</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="organization"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Club Atlético Libres"
              aria-invalid={!!errors.name}
              disabled={isLoading}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="siglas">Siglas (opcional)</Label>
            <Input
              id="siglas"
              name="siglas"
              type="text"
              value={siglas}
              onChange={(e) => setSiglas(e.target.value)}
              placeholder="Ej: CAL"
              maxLength={10}
              aria-invalid={!!errors.siglas}
              disabled={isLoading}
            />
            {errors.siglas && <p className="text-sm text-destructive">{errors.siglas}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Identificador URL</Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="club-atletico-libres"
              aria-invalid={!!errors.slug}
              disabled={isLoading}
            />
            {slugPreview && (
              <p className="text-xs text-muted-foreground">
                Portal de socios: <span className="font-medium text-foreground">{slugPreview}</span>
              </p>
            )}
            {errors.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryColor">Color principal (opcional)</Label>
            <div className="flex gap-2">
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer"
                disabled={isLoading}
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#7c3aed"
                className="flex-1"
                disabled={isLoading}
              />
            </div>
            {errors.primaryColor && <p className="text-sm text-destructive">{errors.primaryColor}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminName">Nombre del administrador</Label>
            <Input
              id="adminName"
              name="adminName"
              type="text"
              autoComplete="name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Juan Pérez"
              aria-invalid={!!errors.adminName}
              disabled={isLoading}
            />
            {errors.adminName && <p className="text-sm text-destructive">{errors.adminName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email del administrador</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@club.com"
              aria-invalid={!!errors.email}
              disabled={isLoading}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {globalError && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {globalError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Enviando registro...
              </>
            ) : (
              'Registrar club'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
