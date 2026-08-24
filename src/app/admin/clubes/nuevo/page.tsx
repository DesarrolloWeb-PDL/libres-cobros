'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function NewClubPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [commissionType, setCommissionType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [commissionValue, setCommissionValue] = useState<number>(0);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          commissionType,
          commissionValue,
          status: 'ACTIVE',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear el club');
      }

      toast.add({
        title: 'Club creado',
        description: `El club "${name}" fue creado correctamente`,
        type: 'success',
      });

      router.push('/admin/clubes');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear el club',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href="/admin/clubes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo club</h1>
        <p className="text-muted-foreground">
          Completá los datos para crear un nuevo club.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="Nombre del club"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Identificador URL</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            placeholder="nombre-del-club"
          />
          <p className="text-xs text-muted-foreground">
            Parte de la URL para el portal de socios. Ejemplo: libres-cobros.vercel.app/pagos/<strong>zum-zum</strong>
          </p>
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

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear club'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/clubes')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
