'use client';

import { useState, useEffect } from 'react';
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
import type { PlanListItem } from '@/types/fee';

interface PlanFormProps {
  plan?: PlanListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  amount: string;
  description: string;
  isActive: boolean;
}

export function PlanForm({ plan, open, onOpenChange, onSuccess }: PlanFormProps) {
  const isEditing = !!plan;
  const [formData, setFormData] = useState<FormData>({
    name: '',
    amount: '',
    description: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        name: plan?.name ?? '',
        amount: plan?.amount ? String(plan.amount) : '',
        description: plan?.description ?? '',
        isActive: plan?.isActive ?? true,
      });
      setErrors({});
    }
  }, [open, plan]);

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

    const amount = parseFloat(formData.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      next.amount = 'El monto debe ser mayor a 0';
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
        plans: [
          {
            ...(isEditing && plan ? { id: plan.id } : {}),
            name: formData.name.trim(),
            amount: parseFloat(formData.amount),
            description: formData.description.trim() || undefined,
            isActive: formData.isActive,
          },
        ],
      };

      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
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
          <DialogTitle>{isEditing ? 'Editar plan' : 'Nuevo plan'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modificá los datos del plan de cuota.'
              : 'Creá un nuevo plan para asignar a los socios.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Nombre</Label>
            <Input
              id="plan-name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ej: Adulto"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-amount">Monto</Label>
            <Input
              id="plan-amount"
              type="number"
              min={0}
              step="0.01"
              value={formData.amount}
              onChange={(e) => updateField('amount', e.target.value)}
              placeholder="15000"
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Descripción</Label>
            <Input
              id="plan-description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Descripción opcional"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="plan-isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="plan-isActive" className="font-normal cursor-pointer">
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
