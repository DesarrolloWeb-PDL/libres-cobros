'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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

interface ClubFormProps {
  club: ClubListItem;
}

export function ClubForm({ club }: ClubFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(club.name);
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
          slug,
          commissionType,
          commissionValue,
          status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el club');
      }

      toast.add({
        title: 'Club actualizado',
        description: `El club "${name}" fue actualizado correctamente`,
        type: 'success',
      });

      router.push('/admin/clubes');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo actualizar el club',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm('¿Desactivar este club? Los datos no se eliminarán.')) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al desactivar el club');
      }

      toast.add({
        title: 'Club desactivado',
        description: `El club "${name}" fue desactivado`,
        type: 'success',
      });

      router.push('/admin/clubes');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo desactivar el club',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button render={<Link href="/admin/clubes" />} variant="ghost" size="sm" className="-ml-2 gap-2">
        <ArrowLeft className="size-4" />
        Volver
      </Button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Tipo de comisión</Label>
          <Select
            value={commissionType}
            onValueChange={(v) => setCommissionType(v as 'PERCENTAGE' | 'FIXED')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Porcentual (%)</SelectItem>
              <SelectItem value="FIXED">Fijo ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="commissionValue">
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
          />
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as 'ACTIVE' | 'INACTIVE')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Activo</SelectItem>
              <SelectItem value="INACTIVE">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
          </Button>
          {club.status === 'ACTIVE' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isSubmitting}
            >
              Desactivar club
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
