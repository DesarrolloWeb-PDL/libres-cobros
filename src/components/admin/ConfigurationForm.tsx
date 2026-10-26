'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  CreditCard,
  Loader2,
  MessageSquare,
  ReceiptText,
  Save,
} from 'lucide-react';
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
  clubSlug?: string;
}

const siteConfigLabels: Record<string, string> = {
  bank_alias: 'Alias',
  bank_cbu: 'CBU',
  bank_cuit: 'CUIT',
  bank_name: 'Banco',
  bank_holder: 'Titular',
  mercadopago_access_token: 'Access Token',
  mercadopago_client_secret: 'Client Secret',
  stripe_secret_key: 'Secret Key',
  stripe_webhook_secret: 'Webhook signing secret',
  whatsapp_phone_number_id: 'Phone Number ID',
  whatsapp_access_token: 'Access Token',
  resend_api_key: 'API Key',
  resend_from_email: 'Email remitente',
  arca_enabled: 'Emitir comprobantes electrónicos (ARCA)',
  arca_cuit: 'CUIT de la institución',
  arca_punto_vta: 'Punto de venta',
  stripe_enabled: 'Ofrecer Stripe a los socios',
  mercadopago_enabled: 'Ofrecer Mercado Pago a los socios',
  bank_transfer_enabled: 'Ofrecer transferencia bancaria a los socios',
};

const siteConfigPlaceholders: Record<string, string> = {
  mercadopago_access_token: 'Ej: APP_USR-...',
  mercadopago_client_secret: 'Ej: abc123...',
  stripe_secret_key: 'Ej: sk_live_...',
  stripe_webhook_secret: 'Ej: whsec_...',
  whatsapp_phone_number_id: 'Ej: 1234567890',
  whatsapp_access_token: 'Ej: EAAG...',
  resend_api_key: 'Ej: re_xxxxxxxx',
  resend_from_email: 'Ej: Cuotas <cuotas@tudominio.com>',
  arca_cuit: 'Ej: 30712345678',
  arca_punto_vta: 'Ej: 1',
};

export function ConfigurationForm({
  initialSiteConfigs,
  clubSlug,
}: ConfigurationFormProps) {
  const [siteConfigs, setSiteConfigs] = useState<SiteConfigListItem[]>(initialSiteConfigs.data);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [origin, setOrigin] = useState('');
  const [webhookCopied, setWebhookCopied] = useState(false);

  // window.location.origin is only available on the client.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const stripeWebhookUrl =
    clubSlug && origin ? `${origin}/api/webhooks/stripe?club_slug=${clubSlug}` : '';

  async function handleCopyWebhookUrl() {
    if (!stripeWebhookUrl) return;
    try {
      await navigator.clipboard.writeText(stripeWebhookUrl);
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch {
      toast.add({
        title: 'Error',
        description: 'No se pudo copiar la URL del webhook',
        type: 'error',
      });
    }
  }

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
                <TabsTrigger value="payments">
                  <CreditCard className="size-4 mr-2" />
                  Medios de pago
                </TabsTrigger>
                <TabsTrigger value="arca">
                  <ReceiptText className="size-4 mr-2" />
                  Facturación ARCA
                </TabsTrigger>
                <TabsTrigger value="messaging">
                  <MessageSquare className="size-4 mr-2" />
                  Mensajería
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank" className="mt-5">
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium">Datos bancarios</h3>
                    <p className="text-sm text-muted-foreground">
                      Información que se muestra a los socios para realizar transferencias.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {['bank_alias', 'bank_cbu', 'bank_cuit', 'bank_name', 'bank_holder'].map((key) => {
                      const config = getConfig(key);
                      if (!config) return null;
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`site-${key}`} className="text-sm font-medium">
                            {siteConfigLabels[key] ?? key}
                          </Label>
                          <Input
                            id={`site-${key}`}
                            type="text"
                            placeholder={siteConfigPlaceholders[key] ?? ''}
                            value={config.value}
                            onChange={(e) => updateSiteConfig(key, e.target.value)}
                            className="h-10"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-5">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium">Mercado Pago</h3>
                      <p className="text-sm text-muted-foreground">
                        Credenciales de tu cuenta Mercado Pago para cobros y débito automático.
                        Se obtienen en{' '}
                        <a
                          href="https://www.mercadopago.com.ar/developers/panel/app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          Tu aplicación → Credenciales
                        </a>
                        . Usá siempre las de producción.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {['mercadopago_access_token', 'mercadopago_client_secret'].map((key) => {
                        const config = getConfig(key);
                        if (!config) return null;
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`site-${key}`} className="text-sm font-medium">
                              {siteConfigLabels[key] ?? key}
                            </Label>
                            <Input
                              id={`site-${key}`}
                              type="password"
                              placeholder={siteConfigPlaceholders[key] ?? ''}
                              value={config.value}
                              onChange={(e) => updateSiteConfig(key, e.target.value)}
                              className="h-10"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Sin el Client Secret, los pagos de Mercado Pago no se van a confirmar
                        automáticamente. Es obligatorio si usás Mercado Pago.
                      </span>
                    </div>
                    {getConfig('mercadopago_access_token')?.value && (
                      <div className="flex items-center gap-2">
                        <input
                          id="site-mercadopago_enabled"
                          type="checkbox"
                          checked={getConfig('mercadopago_enabled')?.value !== 'false'}
                          onChange={(e) =>
                            updateSiteConfig('mercadopago_enabled', e.target.checked ? 'true' : 'false')
                          }
                          className="size-4 rounded border-gray-300"
                        />
                        <Label htmlFor="site-mercadopago_enabled" className="text-sm font-medium">
                          {siteConfigLabels.mercadopago_enabled}
                        </Label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium">Stripe</h3>
                      <p className="text-sm text-muted-foreground">
                        Credenciales de tu cuenta Stripe para cobros y suscripciones. Se obtienen
                        en{' '}
                        <a
                          href="https://dashboard.stripe.com/apikeys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                        >
                          Developers → API keys
                        </a>
                        . El webhook signing secret viene del endpoint de webhooks configurado.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {['stripe_secret_key', 'stripe_webhook_secret'].map((key) => {
                        const config = getConfig(key);
                        if (!config) return null;
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`site-${key}`} className="text-sm font-medium">
                              {siteConfigLabels[key] ?? key}
                            </Label>
                            <Input
                              id={`site-${key}`}
                              type="password"
                              placeholder={siteConfigPlaceholders[key] ?? ''}
                              value={config.value}
                              onChange={(e) => updateSiteConfig(key, e.target.value)}
                              className="h-10"
                            />
                          </div>
                        );
                      })}
                    </div>
                    {stripeWebhookUrl && (
                      <div className="space-y-2">
                        <Label htmlFor="stripe-webhook-url" className="text-sm font-medium">
                          URL de webhook
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="stripe-webhook-url"
                            type="text"
                            readOnly
                            value={stripeWebhookUrl}
                            className="h-10"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="shrink-0 gap-2"
                            onClick={handleCopyWebhookUrl}
                          >
                            {webhookCopied ? (
                              <Check className="size-4 text-green-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                            Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Registrá este endpoint en tu dashboard de Stripe (Developers →
                          Webhooks) para que los pagos se confirmen automáticamente.
                        </p>
                      </div>
                    )}
                    {getConfig('stripe_secret_key')?.value && (
                      <div className="flex items-center gap-2">
                        <input
                          id="site-stripe_enabled"
                          type="checkbox"
                          checked={getConfig('stripe_enabled')?.value !== 'false'}
                          onChange={(e) =>
                            updateSiteConfig('stripe_enabled', e.target.checked ? 'true' : 'false')
                          }
                          className="size-4 rounded border-gray-300"
                        />
                        <Label htmlFor="site-stripe_enabled" className="text-sm font-medium">
                          {siteConfigLabels.stripe_enabled}
                        </Label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium">Transferencia bancaria</h3>
                      <p className="text-sm text-muted-foreground">
                        Habilitá o deshabilitá esta opción para los socios. Los datos de la cuenta
                        se cargan en la pestaña Datos bancarios.
                      </p>
                    </div>
                    {(getConfig('bank_alias')?.value || getConfig('bank_cbu')?.value) && (
                      <div className="flex items-center gap-2">
                        <input
                          id="site-bank_transfer_enabled"
                          type="checkbox"
                          checked={getConfig('bank_transfer_enabled')?.value !== 'false'}
                          onChange={(e) =>
                            updateSiteConfig('bank_transfer_enabled', e.target.checked ? 'true' : 'false')
                          }
                          className="size-4 rounded border-gray-300"
                        />
                        <Label htmlFor="site-bank_transfer_enabled" className="text-sm font-medium">
                          {siteConfigLabels.bank_transfer_enabled}
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="arca" className="mt-5">
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium">Facturación electrónica ARCA</h3>
                    <p className="text-sm text-muted-foreground">
                      Al habilitar esta opción, cada pago confirmado genera automáticamente un
                      Recibo C (comprobante tipo 15 para monotributo) ante ARCA (ex AFIP). La
                      institución debe autorizar previamente a nuestra empresa en ARCA
                      (Mis Representaciones) con su CUIT, y figurar inscripta como monotributista
                      habilitada para comprobantes electrónicos.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="site-arca_enabled"
                      type="checkbox"
                      checked={getConfig('arca_enabled')?.value === 'true'}
                      onChange={(e) => updateSiteConfig('arca_enabled', e.target.checked ? 'true' : 'false')}
                      className="size-4 rounded border-gray-300"
                    />
                    <Label htmlFor="site-arca_enabled" className="text-sm font-medium">
                      {siteConfigLabels.arca_enabled}
                    </Label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {['arca_cuit', 'arca_punto_vta'].map((key) => {
                      const config = getConfig(key);
                      if (!config) return null;
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={`site-${key}`} className="text-sm font-medium">
                            {siteConfigLabels[key] ?? key}
                          </Label>
                          <Input
                            id={`site-${key}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={key === 'arca_cuit' ? 11 : undefined}
                            placeholder={siteConfigPlaceholders[key] ?? ''}
                            value={config.value}
                            onChange={(e) => updateSiteConfig(key, e.target.value)}
                            className="h-10"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La emisión usa el certificado digital de nuestra empresa; la institución solo
                    necesita autorizarnos en ARCA y completar su CUIT y punto de venta acá.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="messaging" className="mt-5">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">WhatsApp (Recomendado)</h3>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
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
                            <Label htmlFor={`site-${key}`} className="text-sm font-medium">
                              {siteConfigLabels[key] ?? key}
                            </Label>
                            <Input
                              id={`site-${key}`}
                              type="text"
                              placeholder={siteConfigPlaceholders[key] ?? ''}
                              value={config.value}
                              onChange={(e) => updateSiteConfig(key, e.target.value)}
                              className="h-10"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">Email (Resend)</h3>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          ALTERNATIVA
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Configuración de Resend para envío de recordatorios por email. 3,000 emails gratis/mes.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {['resend_api_key', 'resend_from_email'].map((key) => {
                        const config = getConfig(key);
                        if (!config) return null;
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`site-${key}`} className="text-sm font-medium">
                              {siteConfigLabels[key] ?? key}
                            </Label>
                            <Input
                              id={`site-${key}`}
                              type="text"
                              placeholder={siteConfigPlaceholders[key] ?? ''}
                              value={config.value}
                              onChange={(e) => updateSiteConfig(key, e.target.value)}
                              className="h-10"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSavingSite} className="gap-2">
              {isSavingSite ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSavingSite ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
