'use client';

import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { LandingContent } from '@/lib/landing';
import { LandingWireframe, type WireZone } from '@/components/admin/LandingWireframe';

const COVER_MAX_BYTES = 2 * 1024 * 1024;
const FLYER_MAX_BYTES = 1024 * 1024;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function SectionCard({
  title,
  description,
  zone,
  saving,
  onSave,
  children,
}: {
  title: string;
  description: string;
  zone: WireZone;
  saving: boolean;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <LandingWireframe zone={zone} className="hidden w-[184px] shrink-0 sm:block" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      <div className="flex justify-end border-t px-5 py-3">
        <Button onClick={onSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar
        </Button>
      </div>
    </Card>
  );
}

function ImageField({
  label,
  value,
  maxBytes,
  onChange,
}: {
  label: string;
  value: string | null;
  maxBytes: number;
  onChange: (dataUrl: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-start gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL previews can't use next/image
          <img src={value} alt={label} className="size-20 rounded-lg border object-cover" />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <ImageIcon className="size-5" />
          </div>
        )}
        <div className="flex flex-col items-start gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > maxBytes) {
                toast.add({
                  title: 'Imagen demasiado grande',
                  description: `Máximo ${Math.round(maxBytes / 1024 / 1024)} MB. Achicala antes de subirla.`,
                  type: 'error',
                });
                e.target.value = '';
                return;
              }
              const reader = new FileReader();
              reader.onload = () => onChange(String(reader.result));
              reader.onerror = () =>
                toast.add({ title: 'Error', description: 'No se pudo leer la imagen', type: 'error' });
              reader.readAsDataURL(file);
            }}
          />
          {value && (
            <Button variant="outline" size="sm" onClick={() => onChange(null)}>
              Quitar imagen
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, WebP o GIF · máximo {Math.round(maxBytes / 1024 / 1024)} MB
      </p>
    </div>
  );
}

export function LandingEditor() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/landing');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar la landing');
      }
      setContent(data.data ?? data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la landing');
    }
  }, []);

  useEffect(() => {
    // Defer to avoid synchronous setState inside the effect (React19 lint rule).
    const handle = window.setTimeout(() => {
      load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function saveSection(section: string, patch: Partial<LandingContent>) {
    setSaving(section);
    try {
      const response = await fetch('/api/admin/landing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar');
      }
      setContent(data.data ?? data);
      toast.add({ title: 'Guardado', description: 'La landing se actualizó correctamente', type: 'success' });
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar',
        type: 'error',
      });
    } finally {
      setSaving(null);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
        {loadError}
        {loadError.includes('institution') || loadError.includes('institución') ? (
          <p className="mt-1 text-xs">Seleccioná una institución desde el selector del panel.</p>
        ) : null}
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Cargando landing…
      </div>
    );
  }

  const patch = (partial: Partial<LandingContent>) => setContent({ ...content, ...partial });

  return (
    <div className="space-y-6">
      {/* URL de la landing (spec S4) */}
      <SectionCard
        title="URL del sitio web"
        zone="site"
        description="Enlace a la landing externa de la institución. Se muestra como tarjeta en /institucion/<slug>."
        saving={saving === 'url'}
        onSave={() => saveSection('url', { url: content.url || null })}
      >
        <Input
          type="url"
          placeholder="https://ejemplo.com"
          value={content.url ?? ''}
          onChange={(e) => patch({ url: e.target.value || null })}
        />
        <p className="text-xs text-muted-foreground">
          Dejala vacía para ocultar la tarjeta. La landing se sirve desde donde la hayas
          hospedado (proyecto aparte) y consume el contenido que cargás acá.
        </p>
      </SectionCard>

      {/* Portada publicitaria (spec S3) */}
      <SectionCard
        title="Portada principal"
        zone="hero"
        description="Publicidad de eventos: imagen de fondo, titular, bajada y botón."
        saving={saving === 'cover'}
        onSave={() => saveSection('cover', { cover: content.cover })}
      >
        <ImageField
          label="Imagen de portada"
          value={content.cover?.image ?? null}
          maxBytes={COVER_MAX_BYTES}
          onChange={(image) =>
            patch({
              cover: {
                image,
                title: content.cover?.title ?? '',
                subtitle: content.cover?.subtitle ?? '',
                ctaLabel: content.cover?.ctaLabel ?? '',
                ctaHref: content.cover?.ctaHref ?? '',
              },
            })
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Titular</Label>
            <Input
              placeholder="Ej: ¡Gran noche de fiesta este sábado!"
              value={content.cover?.title ?? ''}
              onChange={(e) =>
                patch({
                  cover: {
                    image: content.cover?.image ?? null,
                    title: e.target.value,
                    subtitle: content.cover?.subtitle ?? '',
                    ctaLabel: content.cover?.ctaLabel ?? '',
                    ctaHref: content.cover?.ctaHref ?? '',
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bajada</Label>
            <Input
              placeholder="Ej: Con entrada libre desde las21 hs"
              value={content.cover?.subtitle ?? ''}
              onChange={(e) =>
                patch({
                  cover: {
                    image: content.cover?.image ?? null,
                    title: content.cover?.title ?? '',
                    subtitle: e.target.value,
                    ctaLabel: content.cover?.ctaLabel ?? '',
                    ctaHref: content.cover?.ctaHref ?? '',
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Texto del botón</Label>
            <Input
              placeholder="Ej: Ver detalles"
              value={content.cover?.ctaLabel ?? ''}
              onChange={(e) =>
                patch({
                  cover: {
                    image: content.cover?.image ?? null,
                    title: content.cover?.title ?? '',
                    subtitle: content.cover?.subtitle ?? '',
                    ctaLabel: e.target.value,
                    ctaHref: content.cover?.ctaHref ?? '',
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Link del botón</Label>
            <Input
              placeholder="https://… o /pagos/tu-club"
              value={content.cover?.ctaHref ?? ''}
              onChange={(e) =>
                patch({
                  cover: {
                    image: content.cover?.image ?? null,
                    title: content.cover?.title ?? '',
                    subtitle: content.cover?.subtitle ?? '',
                    ctaLabel: content.cover?.ctaLabel ?? '',
                    ctaHref: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Eventos / flyers (spec S1, S3) */}
      <SectionCard
        title="Eventos (carteles)"
        zone="events"
        description="Flyers que se muestran como carteles de publicidad en la grilla de la landing. Máximo 8."
        saving={saving === 'events'}
        onSave={() => saveSection('events', { events: content.events })}
      >
        {content.events.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay eventos cargados.</p>
        )}
        {content.events.map((event, index) => (
          <div key={event.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Evento {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Eliminar evento ${index + 1}`}
                onClick={() => patch({ events: content.events.filter((_, i) => i !== index) })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <ImageField
              label="Flyer"
              value={event.image}
              maxBytes={FLYER_MAX_BYTES}
              onChange={(image) =>
                patch({
                  events: content.events.map((item, i) => (i === index ? { ...item, image } : item)),
                })
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Título del evento"
                value={event.title}
                onChange={(e) =>
                  patch({
                    events: content.events.map((item, i) =>
                      i === index ? { ...item, title: e.target.value } : item
                    ),
                  })
                }
              />
              <Input
                placeholder="Fecha (ej:24 nov,20 hs)"
                value={event.date}
                onChange={(e) =>
                  patch({
                    events: content.events.map((item, i) =>
                      i === index ? { ...item, date: e.target.value } : item
                    ),
                  })
                }
              />
            </div>
            <Input
              placeholder="Link (opcional): entradas, WhatsApp, nota…"
              value={event.link}
              onChange={(e) =>
                patch({
                  events: content.events.map((item, i) =>
                    i === index ? { ...item, link: e.target.value } : item
                  ),
                })
              }
            />
          </div>
        ))}
        <Button
          variant="outline"
          className="gap-2"
          disabled={content.events.length >= 8}
          onClick={() =>
            patch({
              events: [
                ...content.events,
                { id: newId('ev'), title: '', image: null, date: '', link: '' },
              ],
            })
          }
        >
          <Plus className="size-4" />
          Agregar evento
        </Button>
      </SectionCard>

      {/* Autoridades (spec S1) */}
      <SectionCard
        title="Autoridades"
        zone="authorities"
        description="Presidente, vice, comisiones… tal como se muestran en la landing. Máximo12."
        saving={saving === 'authorities'}
        onSave={() => saveSection('authorities', { authorities: content.authorities })}
      >
        {content.authorities.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay autoridades cargadas.</p>
        )}
        {content.authorities.map((authority, index) => (
          <div key={authority.id} className="flex items-end gap-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Nombre y apellido"
                value={authority.name}
                onChange={(e) =>
                  patch({
                    authorities: content.authorities.map((item, i) =>
                      i === index ? { ...item, name: e.target.value } : item
                    ),
                  })
                }
              />
              <Input
                placeholder="Cargo (Ej: Presidente)"
                value={authority.role}
                onChange={(e) =>
                  patch({
                    authorities: content.authorities.map((item, i) =>
                      i === index ? { ...item, role: e.target.value } : item
                    ),
                  })
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label={`Eliminar autoridad ${index + 1}`}
              onClick={() =>
                patch({ authorities: content.authorities.filter((_, i) => i !== index) })
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="gap-2"
          disabled={content.authorities.length >= 12}
          onClick={() =>
            patch({
              authorities: [
                ...content.authorities,
                { id: newId('au'), name: '', role: '' },
              ],
            })
          }
        >
          <Plus className="size-4" />
          Agregar autoridad
        </Button>
      </SectionCard>

      {/* Contactos por área (spec S1) */}
      <SectionCard
        title="Contactos por área"
        zone="contacts"
        description="Sedes, teléfonos y emails por área (Ej: Secretaría, Club, Eventos). Máximo10."
        saving={saving === 'contacts'}
        onSave={() => saveSection('contacts', { contacts: content.contacts })}
      >
        {content.contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay contactos cargados.</p>
        )}
        {content.contacts.map((contact, index) => (
          <div key={contact.id} className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Contacto {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Eliminar contacto ${index + 1}`}
                onClick={() => patch({ contacts: content.contacts.filter((_, i) => i !== index) })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Área (Ej: Secretaría)"
                value={contact.area}
                onChange={(e) =>
                  patch({
                    contacts: content.contacts.map((item, i) =>
                      i === index ? { ...item, area: e.target.value } : item
                    ),
                  })
                }
              />
              <Input
                placeholder="Teléfono (con WhatsApp si aplica)"
                value={contact.phone}
                onChange={(e) =>
                  patch({
                    contacts: content.contacts.map((item, i) =>
                      i === index ? { ...item, phone: e.target.value } : item
                    ),
                  })
                }
              />
              <Input
                type="email"
                placeholder="Email (opcional)"
                value={contact.email}
                onChange={(e) =>
                  patch({
                    contacts: content.contacts.map((item, i) =>
                      i === index ? { ...item, email: e.target.value } : item
                    ),
                  })
                }
              />
              <Input
                placeholder="Nota (Ej: Atención de21 a23 hs)"
                value={contact.note}
                onChange={(e) =>
                  patch({
                    contacts: content.contacts.map((item, i) =>
                      i === index ? { ...item, note: e.target.value } : item
                    ),
                  })
                }
              />
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          className="gap-2"
          disabled={content.contacts.length >= 10}
          onClick={() =>
            patch({
              contacts: [
                ...content.contacts,
                { id: newId('ct'), area: '', phone: '', email: '', note: '' },
              ],
            })
          }
        >
          <Plus className="size-4" />
          Agregar contacto
        </Button>
      </SectionCard>

      {/* Historia (spec S1) */}
      <SectionCard
        title="Historia de la institución"
        zone="history"
        description="Texto que se muestra en la sección Historia de la landing."
        saving={saving === 'history'}
        onSave={() => saveSection('history', { history: content.history })}
      >
        <Textarea
          className="min-h-[180px]"
          placeholder="Contá la historia del club: fundación, logros, tradiciones…"
          value={content.history}
          onChange={(e) => patch({ history: e.target.value })}
        />
      </SectionCard>

      {/* Apariencia (spec S2) */}
      <SectionCard
        title="Apariencia"
        zone="appearance"
        description="Cómo se ve la landing: tema, secciones visibles y estilo de la portada."
        saving={saving === 'appearance'}
        onSave={() => saveSection('appearance', { appearance: content.appearance })}
      >
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-gray-300"
              checked={content.appearance.dark}
              onChange={(e) =>
                patch({
                  appearance: { ...content.appearance, dark: e.target.checked },
                })
              }
            />
            Tema oscuro
          </label>

          <div className="rounded-xl border p-3">
            <p className="mb-2 text-sm font-medium">Secciones visibles</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['events', 'Eventos'],
                  ['authorities', 'Autoridades'],
                  ['contacts', 'Contactos'],
                  ['history', 'Historia'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300"
                    checked={content.appearance.sections[key]}
                    onChange={(e) =>
                      patch({
                        appearance: {
                          ...content.appearance,
                          sections: {
                            ...content.appearance.sections,
                            [key]: e.target.checked,
                          },
                        },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-2 text-sm font-medium">Estilo de la portada</p>
            <div className="flex gap-4">
              {(
                [
                  ['overlay', 'Foto con overlay'],
                  ['brand', 'Color de marca'],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="heroStyle"
                    className="size-4"
                    checked={content.appearance.heroStyle === value}
                    onChange={() =>
                      patch({ appearance: { ...content.appearance, heroStyle: value } })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
