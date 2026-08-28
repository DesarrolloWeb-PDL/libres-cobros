'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, MessageSquare, Percent, Palette } from 'lucide-react';
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
import type { SiteConfigListItem, SiteConfigListResponse, SiteConfigTheme } from '@/types/config';

interface ConfigurationFormProps {
  initialSiteConfigs: SiteConfigListResponse;
  isSuperAdmin?: boolean;
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

const COLOR_PRESETS = [
  { name: 'Violeta', primary: '#7c3aed', secondary: '#a78bfa', accent: '#5b21b6' },
  { name: 'Azul', primary: '#2563eb', secondary: '#60a5fa', accent: '#1d4ed8' },
  { name: 'Verde', primary: '#16a34a', secondary: '#4ade80', accent: '#15803d' },
  { name: 'Rojo', primary: '#dc2626', secondary: '#f87171', accent: '#b91c1c' },
  { name: 'Naranja', primary: '#ea580c', secondary: '#fb923c', accent: '#c2410c' },
  { name: 'Rosa', primary: '#db2777', secondary: '#f472b6', accent: '#be185d' },
  { name: 'Cyan', primary: '#0891b2', secondary: '#22d3ee', accent: '#0e7490' },
  { name: 'Gris', primary: '#4b5563', secondary: '#9ca3af', accent: '#374151' },
];

export function ConfigurationForm({
  initialSiteConfigs,
  isSuperAdmin = false,
}: ConfigurationFormProps) {
  const [siteConfigs, setSiteConfigs] = useState<SiteConfigListItem[]>(initialSiteConfigs.data);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const [theme, setTheme] = useState<SiteConfigTheme>({
    primaryColor: initialSiteConfigs.theme?.primaryColor ?? '#7c3aed',
    secondaryColor: initialSiteConfigs.theme?.secondaryColor ?? '#a78bfa',
    accentColor: initialSiteConfigs.theme?.accentColor ?? '#5b21b6',
  });

  // For super admin, fetch theme from dedicated endpoint
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/admin/theme')
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setTheme(data.data);
          }
        })
        .catch(() => {
          // Use default theme
        });
    }
  }, [isSuperAdmin]);

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

  async function handleSaveTheme() {
    setIsSavingTheme(true);
    try {
      const response = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theme),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Error al guardar el tema');
      }

      toast.add({
        title: 'Tema guardado',
        description: 'Los colores se actualizaron correctamente',
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo guardar el tema',
        type: 'error',
      });
    } finally {
      setIsSavingTheme(false);
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

      {/* Theme Customization - Only for Super Admin */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="size-5" />
              Apariencia del Admin
            </CardTitle>
            <CardDescription>
              Personaliza los colores del panel de administración.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Color Presets */}
            <div className="space-y-3">
              <Label>Presets de colores</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setTheme({
                      primaryColor: preset.primary,
                      secondaryColor: preset.secondary,
                      accentColor: preset.accent,
                    })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      theme.primaryColor === preset.primary
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.secondary }} />
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <span className="text-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Color principal</Label>
                <div className="flex gap-2">
                  <input
                    id="primaryColor"
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={theme.primaryColor}
                    onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                    placeholder="#7c3aed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Color secundario</Label>
                <div className="flex gap-2">
                  <input
                    id="secondaryColor"
                    type="color"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={theme.secondaryColor}
                    onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                    placeholder="#a78bfa"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Color de acento</Label>
                <div className="flex gap-2">
                  <input
                    id="accentColor"
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={theme.accentColor}
                    onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                    placeholder="#5b21b6"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <Label className="text-sm text-muted-foreground">Vista previa</Label>
              <div className="mt-2 flex gap-2">
                <div
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: theme.primaryColor }}
                >
                  Botón principal
                </div>
                <div
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: theme.secondaryColor }}
                >
                  Secundario
                </div>
                <div
                  className="px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: theme.accentColor }}
                >
                  Acento
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              onClick={handleSaveTheme}
              disabled={isSavingTheme}
              className="gap-2"
            >
              <Save className="size-4" />
              {isSavingTheme ? 'Guardando...' : 'Guardar colores'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
