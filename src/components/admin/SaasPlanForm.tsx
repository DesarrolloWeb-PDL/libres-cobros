'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import type { SaasPlanListItem } from '@/types/saas';

interface SaasPlanFormProps {
  plan?: SaasPlanListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  minMembers: string;
  maxMembers: string;
  priceArs: string;
  highlight: boolean;
  isActive: boolean;
}

export function SaasPlanForm({ plan, open, onOpenChange, onSuccess }: SaasPlanFormProps) {
  const isEditing = !!plan;
  const [formData, setFormData] = useState<FormData>(() =>
    open && plan
      ? {
          name: plan.name,
          minMembers: String(plan.minMembers),
          maxMembers: String(plan.maxMembers),
          priceArs: String(plan.priceArs),
          highlight: plan.highlight,
          isActive: plan.isActive,
        }
      : {
          name: '',
          minMembers: '',
          maxMembers: '',
          priceArs: '',
          highlight: false,
          isActive: true,
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevPlan, setPrevPlan] = useState(plan);
  if (open !== prevOpen || plan !== prevPlan) {
    setPrevOpen(open);
    setPrevPlan(plan);
    if (open) {
      setFormData({
        name: plan?.name ?? '',
        minMembers: plan?.minMembers !== undefined ? String(plan.minMembers) : '',
        maxMembers: plan?.maxMembers !== undefined ? String(plan.maxMembers) : '',
        priceArs: plan?.priceArs !== undefined ? String(plan.priceArs) : '',
        highlight: plan?.highlight ?? false,
        isActive: plan?.isActive ?? true,
      });
      setErrors({});
    }
  }

  function updateField(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!formData.name.trim()) {
      next.name = 'El nombre es obligatorio';
    }

    const minMembers = parseInt(formData.minMembers, 10);
    if (Number.isNaN(minMembers) || minMembers < 0) {
      next.minMembers = 'El mínimo de socios debe ser 0 o mayor';
    }

    const maxMembers = parseInt(formData.maxMembers, 10);
    if (Number.isNaN(maxMembers) || maxMembers < 1) {
      next.maxMembers = 'El máximo de socios debe ser mayor a 0';
    }

    if (!Number.isNaN(minMembers) && !Number.isNaN(maxMembers) && maxMembers < minMembers) {
      next.maxMembers = 'El máximo debe ser mayor o igual al mínimo';
    }

    const priceArs = parseFloat(formData.priceArs);
    if (Number.isNaN(priceArs) || priceArs < 0) {
      next.priceArs = 'El precio debe ser 0 o mayor';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!validate()) return;

    setIsSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        minMembers: parseInt(formData.minMembers, 10),
        maxMembers: parseInt(formData.maxMembers, 10),
        priceArs: parseFloat(formData.priceArs),
        highlight: formData.highlight,
        isActive: formData.isActive,
      };

      const url = isEditing ? `/api/admin/saas/plans/${plan!.id}` : '/api/admin/saas/plans';
      const method = isEditing ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el plan');
      }

      toast.add({
        title: isEditing ? 'Plan actualizado' : 'Plan creado',
        description: `${formData.name.trim()} fue guardado correctamente`,
        type: 'success',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el plan',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar plan SaaS' : 'Nuevo plan SaaS'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modificá los límites y precio del plan.'
              : 'Creá un plan para la suscripción de instituciones.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="saas-plan-name">Nombre</Label>
            <Input
              id="saas-plan-name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Hasta 200 socios"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="saas-plan-min">Mínimo de socios</Label>
              <Input
                id="saas-plan-min"
                type="number"
                min={0}
                step={1}
                value={formData.minMembers}
                onChange={(e) => updateField('minMembers', e.target.value)}
                placeholder="0"
                aria-invalid={!!errors.minMembers}
              />
              {errors.minMembers && <p className="text-sm text-destructive">{errors.minMembers}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="saas-plan-max">Máximo de socios</Label>
              <Input
                id="saas-plan-max"
                type="number"
                min={1}
                step={1}
                value={formData.maxMembers}
                onChange={(e) => updateField('maxMembers', e.target.value)}
                placeholder="200"
                aria-invalid={!!errors.maxMembers}
              />
              {errors.maxMembers && <p className="text-sm text-destructive">{errors.maxMembers}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saas-plan-price">Precio mensual (ARS)</Label>
            <Input
              id="saas-plan-price"
              type="number"
              min={0}
              step="0.01"
              value={formData.priceArs}
              onChange={(e) => updateField('priceArs', e.target.value)}
              placeholder="35000"
              aria-invalid={!!errors.priceArs}
            />
            {errors.priceArs && <p className="text-sm text-destructive">{errors.priceArs}</p>}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="saas-plan-highlight"
              type="checkbox"
              checked={formData.highlight}
              onChange={(e) => updateField('highlight', e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="saas-plan-highlight" className="font-normal cursor-pointer">
              Destacar en landing
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="saas-plan-active"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="saas-plan-active" className="font-normal cursor-pointer">
              Plan activo
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
