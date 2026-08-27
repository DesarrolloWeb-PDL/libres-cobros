'use client';

import { useState } from 'react';
import { Save, Building2, MessageSquare, Percent } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import type { SiteConfigListItem, SiteConfigListResponse } from '@/types/config';

interface ConfigurationFormProps {
  initialSiteConfigs: SiteConfigListResponse;
}

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

  function getConfig(key: string) {
    return siteConfigs.find((c) => c.key === key);
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
          <CardContent>
            <Tabs defaultValue="bank">
              <TabsList variant="line">
                <TabsTrigger value="bank">
                  <Building2 className="size-4 mr-2" />
                  Datos bancarios
                </TabsTrigger>
                <TabsTrigger value="messaging">
                  <MessageSquare className="size-4 mr-2" />
                  Mensajería
                </TabsTrigger>
                <TabsTrigger value="commission">
                  <Percent className="size-4 mr-2" />
                  Comisiones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="mt-4">
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium">Datos bancarios</h3>
                    <p className="text-sm text-muted-foreground">
                      Información que se muestra a los socios para realizar transferencias.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {['bank_alias', 'bank_cbu', 'bank_cuit', 'bank_name', 'bank_holder', 'bank_reference'].map((key) => {
                      const config = getConfig(key);
                      if (!config) return null;
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`site-${key}`}>{siteConfigLabels[key] ?? key}</Label>
                          <Input
                            id={`site-${key}`}
                            type="text"
                            placeholder={siteConfigPlaceholders[key] ?? ''}
                            value={config.value}
                            onChange={(e) => updateSiteConfig(key, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messaging" className="mt-4">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">WhatsApp (Recomendado)</h3>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          GRATIS
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Configuración de WhatsApp Cloud API para envío de recordatorios. GRATIS hasta 1,000 conversaciones/mes.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {['whatsapp_phone_number_id', 'whatsapp_access_token'].map((key) => {
                        const config = getConfig(key);
                        if (!config) return null;
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`site-${key}`}>{siteConfigLabels[key] ?? key}</Label>
                            <Input
                              id={`site-${key}`}
                              type="text"
                              placeholder={siteConfigPlaceholders[key] ?? ''}
                              value={config.value}
                              onChange={(e) => updateSiteConfig(key, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">Twilio SMS (Alternativa)</h3>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          PAGO
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Credenciales de Twilio para envío de recordatorios por SMS. Requiere credenciales de pago.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {['twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number'].map((key) => {
                        const config = getConfig(key);
                        if (!config) return null;
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`site-${key}`}>{siteConfigLabels[key] ?? key}</Label>
                            <Input
                              id={`site-${key}`}
                              type="text"
                              placeholder={siteConfigPlaceholders[key] ?? ''}
                              value={config.value}
                              onChange={(e) => updateSiteConfig(key, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="commission" className="mt-4">
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium">Comisiones</h3>
                    <p className="text-sm text-muted-foreground">
                      Tasa aplicada al calcular comisiones por pago confirmado.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {['commission_rate'].map((key) => {
                      const config = getConfig(key);
                      if (!config) return null;
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`site-${key}`}>{siteConfigLabels[key] ?? key}</Label>
                          <Input
                            id={`site-${key}`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            placeholder={siteConfigPlaceholders[key] ?? ''}
                            value={config.value}
                            onChange={(e) => updateSiteConfig(key, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
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
