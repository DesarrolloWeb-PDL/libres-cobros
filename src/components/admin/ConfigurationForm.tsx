'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import type { FeeConfigListItem, FeeConfigListResponse } from '@/types/fee';
import type { SiteConfigListItem, SiteConfigListResponse } from '@/types/config';

interface ConfigurationFormProps {
  initialFeeConfigs: FeeConfigListResponse;
  initialSiteConfigs: SiteConfigListResponse;
}

const siteConfigSections = [
  {
    title: 'Comisiones',
    description: 'Tasa aplicada al calcular comisiones por pago confirmado.',
    keys: ['commission_rate'],
  },
  {
    title: 'Datos bancarios',
    description: 'Información que se muestra a los socios para realizar transferencias.',
    keys: ['bank_alias', 'bank_cbu', 'bank_cuit', 'bank_name', 'bank_holder', 'bank_reference'],
  },
  {
    title: 'Twilio SMS',
    description: 'Credenciales de Twilio para envío de recordatorios por SMS.',
    keys: ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number'],
  },
];

const siteConfigLabels: Record<string, string> = {
  commission_rate: 'Tasa de comisión (%)',
  bank_alias: 'Alias',
  bank_cbu: 'CBU',
  bank_cuit: 'CUIT',
  bank_name: 'Banco',
  bank_holder: 'Titular',
  bank_reference: 'Referencia / Concepto',
  twilio_account_sid: 'Account SID',
  twilio_auth_token: 'Auth Token',
  twilio_phone_number: 'Número de teléfono',
};

export function ConfigurationForm({
  initialFeeConfigs,
  initialSiteConfigs,
}: ConfigurationFormProps) {
  const [feeConfigs, setFeeConfigs] = useState<FeeConfigListItem[]>(initialFeeConfigs.data);
  const [siteConfigs, setSiteConfigs] = useState<SiteConfigListItem[]>(initialSiteConfigs.data);
  const [isSavingFees, setIsSavingFees] = useState(false);
  const [isSavingSite, setIsSavingSite] = useState(false);

  function updateFeeAmount(category: string, amount: string) {
    setFeeConfigs((prev) =>
      prev.map((config) =>
        config.category === category ? { ...config, amount: parseFloat(amount) || 0 } : config
      )
    );
  }

  function updateSiteConfig(key: string, value: string) {
    setSiteConfigs((prev) =>
      prev.map((config) => (config.key === key ? { ...config, value } : config))
    );
  }

  async function handleSaveFees(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingFees(true);
    try {
      const response = await fetch('/api/admin/fee-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: feeConfigs.map((config) => ({
            category: config.category,
            amount: config.amount,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Error al guardar los montos');
      }

      toast.add({
        title: 'Guardado',
        description: 'Los montos de cuotas se actualizaron correctamente',
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudieron guardar los montos',
        type: 'error',
      });
    } finally {
      setIsSavingFees(false);
    }
  }

  async function handleSaveSiteConfig(event: React.FormEvent) {
    event.preventDefault();
    setIsSavingSite(true);
    try {
      const response = await fetch('/api/admin/site-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: siteConfigs.map((config) => ({
            key: config.key,
            value: config.value,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Error al guardar la configuración');
      }

      toast.add({
        title: 'Guardado',
        description: 'La configuración se actualizó correctamente',
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: 'Error',
        description:
          err instanceof Error ? err.message : 'No se pudo guardar la configuración',
        type: 'error',
      });
    } finally {
      setIsSavingSite(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveFees}>
        <Card>
          <CardHeader>
            <CardTitle>Montos por categoría</CardTitle>
            <CardDescription>
              Valores que se usan como snapshot al generar las cuotas mensuales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feeConfigs.map((config) => (
              <div key={config.category} className="grid gap-2 sm:grid-cols-2">
                <Label htmlFor={`fee-${config.category}`} className="self-center">
                  {config.category}
                </Label>
                <Input
                  id={`fee-${config.category}`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={config.amount}
                  onChange={(e) => updateFeeAmount(config.category, e.target.value)}
                />
              </div>
            ))}
            <Button type="submit" disabled={isSavingFees} className="gap-2">
              <Save className="size-4" />
              {isSavingFees ? 'Guardando...' : 'Guardar montos'}
            </Button>
          </CardContent>
        </Card>
      </form>

      <form onSubmit={handleSaveSiteConfig}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración general</CardTitle>
            <CardDescription>
              Parámetros del sistema que afectan pagos, comisiones y comunicaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {siteConfigSections.map((section, index) => (
              <div key={section.title}>
                {index > 0 && <Separator className="mb-6" />}
                <div className="mb-4">
                  <h3 className="text-sm font-medium">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.keys.map((key) => {
                    const config = siteConfigs.find((c) => c.key === key);
                    if (!config) return null;

                    return (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={`site-${key}`}>{siteConfigLabels[key] ?? key}</Label>
                        <Input
                          id={`site-${key}`}
                          type={key === 'commission_rate' ? 'number' : 'text'}
                          min={key === 'commission_rate' ? 0 : undefined}
                          max={key === 'commission_rate' ? 100 : undefined}
                          step={key === 'commission_rate' ? 0.01 : undefined}
                          value={config.value}
                          onChange={(e) => updateSiteConfig(key, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <Button type="submit" disabled={isSavingSite} className="gap-2">
              <Save className="size-4" />
              {isSavingSite ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
