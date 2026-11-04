'use client';

import { useState, useSyncExternalStore } from 'react';
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
  TestTube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  isSuperAdmin?: boolean;
  institutionId?: string | null;
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
  arca_cert: 'Certificado X.509 (PEM)',
  arca_key: 'Clave privada X.509 (PEM)',
  saas_arca_cuit: 'CUIT emisor de la plataforma',
  saas_arca_pto_vta: 'Punto de venta',
  saas_arca_regime: 'Régimen ARCA',
  saas_arca_iva_rate: 'Tasa de IVA (%)',
  saas_arca_cert: 'Certificado X.509 (PEM)',
  saas_arca_key: 'Clave privada X.509 (PEM)',
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
  saas_arca_cuit: 'Ej: 20301112223',
  saas_arca_pto_vta: 'Ej: 1',
  saas_arca_iva_rate: 'Ej: 21',
};

export function ConfigurationForm({
  initialSiteConfigs,
  clubSlug,
  isSuperAdmin = false,
  institutionId,
}: ConfigurationFormProps) {
  const [siteConfigs, setSiteConfigs] = useState<SiteConfigListItem[]>(initialSiteConfigs.data);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ''
  );
  const [webhookCopied, setWebhookCopied] = useState(false);

  const stripeWebhookUrl =
    clubSlug && origin ? `${origin}/api/webhooks/stripe?club_slug=${clubSlug}` : '';

  // True when the form is editing an institution's config (ADMIN or SUPER_ADMIN
  // with an active institution selection). Platform-only keys are hidden otherwise.
  const editingInstitution = !isSuperAdmin || Boolean(institutionId);

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
          configs: siteConfigs
            // Only send keys visible in the current scope.
            .filter((config) => {
              if (!editingInstitution) {
                return !config.key.startsWith('arca_');
              }
              return !config.key.startsWith('saas_arca_');
            })
            .map((config) => ({
              key: config.key,
              value: config.value,
            })),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Error al guardar la configuración');
      }

      const result = (await response.json()) as SiteConfigListResponse;
      if (result.data) {
        // Merge server state (masks keyConfigured/certConfigured) with local edits
        // for fields that are still being edited.
        setSiteConfigs((prev) =>
          prev.map((local) => {
            const server = result.data.find((s) => s.key === local.key);
            if (!server) return local;
            return {
              ...server,
              // Keep the textarea content if the user is still typing a new secret.
              value:
                (local.key === 'arca_key' ||
                  local.key === 'arca_cert' ||
                  local.key === 'saas_arca_key' ||
                  local.key === 'saas_arca_cert') &&
                local.value.trim() !== ''
                  ? local.value
                  : server.value,
            };
          })
        );
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

  async function handleTestCredentials() {
    setIsTestingCredentials(true);
    try {
      const response = await fetch('/api/admin/arca/test-credentials', {
        method: 'POST',
      });
      const result = await response.json().catch(() => ({
        ok: false,
        error: 'Respuesta inesperada del servidor',
      }));

      if (result.ok) {
        toast.add({
          title: 'Credenciales OK',
          description: `Conexión exitosa con ARCA (${result.environment === 'produccion' ? 'producción' : 'homologación'}).`,
          type: 'success',
        });
      } else {
        toast.add({
          title: 'Error de credenciales',
          description: result.error || 'No se pudieron validar las credenciales',
          type: 'error',
        });
      }
    } catch (err) {
      toast.add({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error de red',
        type: 'error',
      });
    } finally {
      setIsTestingCredentials(false);
    }
  }

  function getConfig(key: string) {
    return siteConfigs.find((c) => c.key === key);
  }

  function renderTextField(key: string, options?: { multiline?: boolean; type?: string }) {
    const config = getConfig(key);
    if (!config) return null;

    const inputId = `site-${key}`;
    const isKeyField = key === 'arca_key' || key === 'saas_arca_key';
    const isCertField = key === 'arca_cert' || key === 'saas_arca_cert';
    const isSecret = isKeyField || isCertField;
    const configured = isKeyField ? config.keyConfigured : isCertField ? config.certConfigured : false;

    const InputComponent = options?.multiline ? Textarea : Input;

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={inputId} className="text-sm font-medium">
          {siteConfigLabels[key] ?? key}
        </Label>
        <InputComponent
          id={inputId}
          type={options?.type ?? 'text'}
          placeholder={siteConfigPlaceholders[key] ?? ''}
          value={config.value}
          onChange={(e) => updateSiteConfig(key, e.target.value)}
          className={options?.multiline ? 'min-h-[120px] font-mono text-xs' : 'h-10'}
        />
        {isSecret && configured && (
          <p className="text-xs text-muted-foreground">
            {isKeyField
              ? 'Clave privada configurada. Pegá un nuevo valor para reemplazarla.'
              : 'Certificado configurado. Pegá un nuevo valor para reemplazarlo.'}
          </p>
        )}
      </div>
    );
  }

  function renderSwitch(key: string, label?: string) {
    const config = getConfig(key);
    if (!config) return null;

    return (
      <div key={key} className="flex items-center gap-2">
        <input
          id={`site-${key}`}
          type="checkbox"
          checked={config.value === 'true'}
          onChange={(e) => updateSiteConfig(key, e.target.checked ? 'true' : 'false')}
          className="size-4 rounded border-gray-300"
        />
        <Label htmlFor={`site-${key}`} className="text-sm font-medium">
          {label ?? siteConfigLabels[key] ?? key}
        </Label>
      </div>
    );
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
                    {['bank_alias', 'bank_cbu', 'bank_cuit', 'bank_name', 'bank_holder'].map((key) =>
                      renderTextField(key)
                    )}
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
                      {['mercadopago_access_token', 'mercadopago_client_secret'].map((key) =>
                        renderTextField(key, { type: 'password' })
                      )}
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Sin el Client Secret, los pagos de Mercado Pago no se van a confirmar
                        automáticamente. Es obligatorio si usás Mercado Pago.
                      </span>
                    </div>
                    {getConfig('mercadopago_access_token')?.value && (
                      renderSwitch('mercadopago_enabled')
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
                      {['stripe_secret_key', 'stripe_webhook_secret'].map((key) =>
                        renderTextField(key, { type: 'password' })
                      )}
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
                    {getConfig('stripe_secret_key')?.value && renderSwitch('stripe_enabled')}
                  </div>

                  <div className="space-y-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium">Transferencia bancaria</h3>
                      <p className="text-sm text-muted-foreground">
                        Habilitá o deshabilitá esta opción para los socios. Los datos de la cuenta
                        se cargan en la pestaña Datos bancarios.
                      </p>
                    </div>
                    {(getConfig('bank_alias')?.value || getConfig('bank_cbu')?.value) &&
                      renderSwitch('bank_transfer_enabled')}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="arca" className="mt-5">
                <div className="space-y-8">
                  {isSuperAdmin && !editingInstitution && (
                    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:bg-amber-950/20 dark:border-amber-900">
                      <div className="mb-2">
                        <h3 className="text-sm font-medium">ARCA de la plataforma</h3>
                        <p className="text-sm text-muted-foreground">
                          Estos datos se usan para emitir los comprobantes SaaS que la plataforma
                          le factura a cada institución. Solo visible para SUPER_ADMIN.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderTextField('saas_arca_cuit')}
                        {renderTextField('saas_arca_pto_vta')}
                        {renderTextField('saas_arca_regime')}
                        {renderTextField('saas_arca_iva_rate')}
                      </div>
                      {renderTextField('saas_arca_cert', { multiline: true })}
                      {renderTextField('saas_arca_key', { multiline: true })}
                    </div>
                  )}

                  {editingInstitution && (
                    <div className="space-y-4">
                      <div className="mb-2">
                        <h3 className="text-sm font-medium">ARCA de la institución</h3>
                        <p className="text-sm text-muted-foreground">
                          Al habilitar esta opción, cada pago confirmado genera automáticamente un
                          Recibo C (comprobante tipo 15 para monotributo) ante ARCA (ex AFIP). La
                          institución usa su propio certificado digital y clave privada; si no las
                          carga, se usan las de la plataforma y el CUIT correspondiente.
                        </p>
                      </div>
                      {renderSwitch('arca_enabled')}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {renderTextField('arca_cuit')}
                        {renderTextField('arca_punto_vta')}
                      </div>
                      {renderTextField('arca_cert', { multiline: true })}
                      {renderTextField('arca_key', { multiline: true })}
                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestCredentials}
                          disabled={isTestingCredentials}
                          className="gap-2"
                        >
                          {isTestingCredentials ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <TestTube className="size-4" />
                          )}
                          Probar credenciales
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Solicita un ticket de acceso a ARCA sin emitir ningún comprobante.
                        </p>
                      </div>
                    </div>
                  )}

                  {isSuperAdmin && !editingInstitution && (
                    <p className="text-xs text-muted-foreground">
                      Seleccioná una institución en el sidebar para configurar sus datos ARCA.
                    </p>
                  )}
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
                      {['whatsapp_phone_number_id', 'whatsapp_access_token'].map((key) =>
                        renderTextField(key)
                      )}
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
                      {['resend_api_key', 'resend_from_email'].map((key) =>
                        renderTextField(key)
                      )}
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
