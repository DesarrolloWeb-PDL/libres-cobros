'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { ClubListItem } from '@/types/club';

interface InstitutionFormProps {
  club: ClubListItem;
}

export function InstitutionForm({ club }: InstitutionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [name, setName] = useState(club.name);
  const [siglas, setSiglas] = useState(club.siglas || '');
  const [slug, setSlug] = useState(club.slug);
  const [commissionType, setCommissionType] = useState<'PERCENTAGE' | 'FIXED'>(
    club.commissionType as 'PERCENTAGE' | 'FIXED'
  );
  const [commissionValue, setCommissionValue] = useState<number>(club.commissionValue);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    club.status as 'ACTIVE' | 'INACTIVE'
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          siglas: siglas || null,
          slug,
          commissionType,
          commissionValue: Number(commissionValue),
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar la institución');
      }

      toast.add({
        title: 'Institución actualizada',
        description: `La institución "${name}" fue actualizada correctamente`,
        type: 'success',
      });

      router.push('/admin/instituciones');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar la institución',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm('¿Desactivar esta institución? Los datos no se eliminarán.')) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al desactivar la institución');
      }

      toast.add({
        title: 'Institución desactivada',
        description: `La institución "${name}" fue desactivada`,
        type: 'success',
      });

      router.push('/admin/instituciones');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo desactivar la institución',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!confirm('¿Blanquear la clave del administrador de esta institución? Se generará una contraseña temporal que deberá cambiar en el próximo login.')) return;

    setIsResettingPassword(true);

    try {
      const response = await fetch(`/api/admin/clubs/${club.id}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al blanquear la clave');
      }

      toast.add({
        title: 'Clave blanqueada',
        description: `Nueva contraseña temporal: ${data.tempPassword}. Compartila con el administrador de la institución.`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo blanquear la clave',
        type: 'error',
      });
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/instituciones" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-2">
        <ArrowLeft className="size-4" />
        Volver
      </Link>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siglas" className="text-sm font-medium">Siglas (opcional)</Label>
          <Input
            id="siglas"
            value={siglas}
            onChange={(e) => setSiglas(e.target.value)}
            placeholder="Ej: LDC"
            maxLength={10}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Acrónimo que se muestra en el selector de instituciones
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-sm font-medium">Identificador URL</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="h-10"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de comisión</Label>
            <Select
              value={commissionType}
              onValueChange={(v) => setCommissionType(v as 'PERCENTAGE' | 'FIXED')}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Porcentual (%)</SelectItem>
                <SelectItem value="FIXED">Fijo ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commissionValue" className="text-sm font-medium">
              Valor de comisión {commissionType === 'PERCENTAGE' ? '(%)' : '($)'}
            </Label>
            <Input
              id="commissionValue"
              type="number"
              step="0.01"
              min="0"
              max={commissionType === 'PERCENTAGE' ? 100 : undefined}
              value={commissionValue}
              onChange={(e) => setCommissionValue(Number(e.target.value))}
              required
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Estado</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as 'ACTIVE' | 'INACTIVE')}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="INACTIVE">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {club.status === 'ACTIVE' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isSubmitting}
            >
              Desactivar institución
            </Button>
          )}
        </div>
      </form>

      {/* Password Reset Section */}
      <div className="border-t pt-6">
        <h3 className="text-base font-semibold mb-2">Seguridad</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Blanquear la clave del administrador de esta institución. Se generará una contraseña temporal que deberá cambiar en el próximo login.
        </p>
        <Button
          variant="outline"
          onClick={handleResetPassword}
          disabled={isResettingPassword}
          className="gap-2"
        >
          {isResettingPassword ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Key className="size-4" />
          )}
          {isResettingPassword ? 'Procesando...' : 'Blanquear clave'}
        </Button>
      </div>
    </div>
  );
}
