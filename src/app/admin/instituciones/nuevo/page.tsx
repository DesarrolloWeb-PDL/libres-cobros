'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StyledSelect } from '@/components/ui/styled-select';
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

export default function NewInstitucionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [plans, setPlans] = useState<
    { id: string; name: string; minMembers: number; maxMembers: number; priceArs: number }[]
  >([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/saas/plans?active=true')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d: { data?: { id: string; name: string; minMembers: number; maxMembers: number; priceArs: number }[] }) => {
        if (!cancelled && Array.isArray(d.data)) setPlans(d.data);
      })
      .catch(() => {
        /* sin planes: el selector queda solo con la opción gratuita */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          status: 'ACTIVE',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear la institución');
      }

      const created = await response.json();

      if (selectedPlanId) {
        const subResponse = await fetch(
          `/api/admin/saas/institutions/${created.id}/subscription`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saasPlanId: selectedPlanId }),
          }
        );
        const subText = await subResponse.text();

        if (!subResponse.ok) {
          let subData: { error?: string } = {};
          try {
            subData = JSON.parse(subText);
          } catch {
            /* respuesta no JSON */
          }
          toast.add({
            title: 'Institución creada, pero el plan no se asignó',
            description: `${subData.error || 'Error al asignar el plan'} — podés asignarlo desde "Mi suscripción".`,
            type: 'error',
          });
          router.push('/admin/instituciones');
          return;
        }
      }

      toast.add({
        title: 'Institución creada',
        description: selectedPlanId
          ? `La institución "${name}" fue creada con su plan SaaS asignado`
          : `La institución "${name}" fue creada correctamente`,
        type: 'success',
      });

      router.push('/admin/instituciones');
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo crear la institución',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href="/admin/instituciones" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 -ml-2">
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Nueva institución</h1>
        <p className="text-muted-foreground">
          Completá los datos para crear una nueva institución.
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
            placeholder="Nombre de la institución"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Identificador URL</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            placeholder="nombre-de-la-institucion"
          />
          <p className="text-xs text-muted-foreground">
            Parte de la URL para el portal de socios. Ejemplo: libres-cobros.vercel.app/pagos/<strong>zum-zum</strong>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="saasPlan">Plan SaaS</Label>
          <StyledSelect
            id="saasPlan"
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            options={[
              { value: '', label: 'Sin plan — nivel gratuito' },
              ...plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ${p.minMembers}-${p.maxMembers} socios — $${p.priceArs.toLocaleString('es-AR')}/mes`,
              })),
            ]}
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Se asigna al crear la institución. Si lo dejás en gratuito, la institución
            puede solicitar un plan después desde <strong>Mi suscripción</strong>.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear institución'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/admin/instituciones')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
