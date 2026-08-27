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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import type { SiteConfigListItem, SiteConfigListResponse } from '@/types/config';

interface ConfigurationFormProps {
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
    title: 'WhatsApp (Recomendado)',
    description: 'Configuración de WhatsApp Cloud API para envío de recordatorios. GRATIS hasta 1,000 conversaciones/mes.',
    keys: ['whatsapp_phone_number_id', 'whatsapp_access_token'],
    badge: 'GRATIS',
  },
  {
    title: 'Twilio SMS (Alternativa)',
    description: 'Credenciales de Twilio para envío de recordatorios por SMS. Requiere credenciales de pago.',
    keys: ['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number'],
    badge: 'PAGO',
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
  whatsapp_phone_number_id: 'Phone Number ID',
  whatsapp_access_token: 'Access Token',
  twilio_account_sid: 'Account SID',
  twilio_auth_token: 'Auth Token',
  twilio_phone_number: 'Número de teléfono',
};

const siteConfigPlaceholders: Record<string, string> = {
  whatsapp_phone_number_id: 'Ej: 1234567890',
  whatsapp_access_token: 'Ej: EAAG...',
  twilio_account_sid: 'Ej: AC1234567890...',
  twilio_auth_token: 'Ej: tu_auth_token',
  twilio_phone_number: 'Ej: +541112345678',
};

export function ConfigurationForm({
  initialSiteConfigs,
}: ConfigurationFormProps) {
  const [siteConfigs, setSiteConfigs] = useState<SiteConfigListItem[]>(initialSiteConfigs.data);
  const [isSavingSite, setIsSavingSite] = useState(false);

  function updateSiteConfig(key: string, value: string) {
    setSiteConfigs((prev) =>
      prev.map((config) => (config.key === key ? { ...config, value } : config))
    );
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{section.title}</h3>
                    {section.badge && (
                      <span className={section.badge === 'GRATIS'
                        ? 'inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'
                        : 'inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                      }>
                        {section.badge}
                      </span>
                    )}
                  </div>
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
                          placeholder={siteConfigPlaceholders[key] ?? ''}
                          value={config.value}
                          onChange={(e) => updateSiteConfig(key, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingSite} className="gap-2">
              <Save className="size-4" />
              {isSavingSite ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
