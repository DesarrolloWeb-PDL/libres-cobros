'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StyledSelect } from '@/components/ui/styled-select';
import { MemberFormSchema } from '@/types/member';
import type { PlanListItem } from '@/types/fee';

export interface MemberFormData {
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  planId: string;
  notes: string;
}

interface MemberFormProps {
  title: string;
  initialData?: Partial<MemberFormData>;
  onSubmit: (data: MemberFormData) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function MemberForm({
  title,
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Guardar',
}: MemberFormProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    dni: initialData?.dni ?? '',
    firstName: initialData?.firstName ?? '',
    lastName: initialData?.lastName ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    planId: initialData?.planId ?? '',
    notes: initialData?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch('/api/admin/plans', { cache: 'no-store' });
        if (!response.ok) throw new Error('Error al cargar planes');
        const data: { data: PlanListItem[] } = await response.json();
        setPlans(data.data);
      } catch {
        setPlans([]);
      } finally {
        setPlansLoading(false);
      }
    }

    loadPlans();
  }, []);

  function updateField(field: keyof MemberFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const parsed = MemberFormSchema.safeParse(formData);

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (key && typeof key === 'string') {
          fieldErrors[key] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!formData.planId) {
      setErrors((prev) => ({ ...prev, planId: 'Seleccioná un plan' }));
      return;
    }

    await onSubmit(formData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                value={formData.dni}
                onChange={(e) => updateField('dni', e.target.value)}
                placeholder="12345678"
                aria-invalid={!!errors.dni}
              />
              {errors.dni && (
                <p className="text-sm text-destructive">{errors.dni}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="planId">Plan</Label>
              <StyledSelect
                value={formData.planId}
                onChange={(value) => updateField('planId', value)}
                options={plans.map((plan) => ({
                  value: plan.id,
                  label: `${plan.name} — $${plan.amount.toLocaleString('es-AR')}`,
                }))}
                placeholder={plansLoading ? 'Cargando planes...' : 'Seleccionar plan'}
                disabled={plansLoading}
              />
              {errors.planId && (
                <p className="text-sm text-destructive">{errors.planId}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                placeholder="Juan"
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                placeholder="Pérez"
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="juan@example.com"
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+54 9 11 1234-5678"
                aria-invalid={!!errors.phone}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Observaciones opcionales"
              aria-invalid={!!errors.notes}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={isLoading || plansLoading}>
              {isLoading ? 'Guardando...' : submitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
