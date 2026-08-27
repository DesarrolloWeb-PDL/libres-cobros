'use client';

import { useState, useRef } from 'react';
import { Upload, Palette, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';

interface ClubCustomizationProps {
  club: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

const colorPresets = [
  { name: 'Violeta', primary: '#7c3aed', secondary: '#a78bfa', accent: '#5b21b6' },
  { name: 'Azul', primary: '#2563eb', secondary: '#60a5fa', accent: '#1d4ed8' },
  { name: 'Verde', primary: '#16a34a', secondary: '#4ade80', accent: '#15803d' },
  { name: 'Rojo', primary: '#dc2626', secondary: '#f87171', accent: '#b91c1c' },
  { name: 'Naranja', primary: '#ea580c', secondary: '#fb923c', accent: '#c2410c' },
  { name: 'Rosa', primary: '#db2777', secondary: '#f472b6', accent: '#be185d' },
];

export function ClubCustomization({ club }: ClubCustomizationProps) {
  const [logo, setLogo] = useState<string | null>(club.logoUrl || null);
  const [primaryColor, setPrimaryColor] = useState(club.primaryColor || '#7c3aed');
  const [secondaryColor, setSecondaryColor] = useState(club.secondaryColor || '#a78bfa');
  const [accentColor, setAccentColor] = useState(club.accentColor || '#5b21b6');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.add({ title: 'Error', description: 'Por favor subí una imagen', type: 'error' });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clubId', club.id);

      const response = await fetch('/api/admin/clubs/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir el logo');

      const data = await response.json();
      setLogo(data.url);
      toast.add({ title: 'Logo actualizado', description: 'El logo del club se actualizó correctamente', type: 'success' });
    } catch (error) {
      toast.add({ title: 'Error', description: 'No se pudo subir el logo', type: 'error' });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/clubs/${club.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl: logo,
          primaryColor,
          secondaryColor,
          accentColor,
        }),
      });

      if (!response.ok) throw new Error('Error al guardar');

      toast.add({ title: 'Guardado', description: 'La personalización del club se guardó correctamente', type: 'success' });
    } catch (error) {
      toast.add({ title: 'Error', description: 'No se pudo guardar la personalización', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  function applyPreset(preset: typeof colorPresets[0]) {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
  }

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-5" />
            Logo / Escudo
          </CardTitle>
          <CardDescription>
            Subí el logo o escudo de tu club. Se mostrará en el portal de socios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Preview */}
            <div className="flex size-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30">
              {logo ? (
                <img src={logo} alt="Logo del club" className="size-full object-contain p-2" />
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-1 text-xs text-muted-foreground">Sin logo</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 size-4" />
                )}
                {logo ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Formatos: JPG, PNG, SVG. Tamaño recomendado: 200x200px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            Colores del Club
          </CardTitle>
          <CardDescription>
            Personalizá los colores que identifican a tu club.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Presets */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Presets rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <div className="flex gap-1">
                    <div className="size-4 rounded-full" style={{ backgroundColor: preset.primary }} />
                    <div className="size-4 rounded-full" style={{ backgroundColor: preset.secondary }} />
                    <div className="size-4 rounded-full" style={{ backgroundColor: preset.accent }} />
                  </div>
                  {preset.name}
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
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-10 rounded cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color secundario</Label>
              <div className="flex gap-2">
                <input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="size-10 rounded cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Color de acento</Label>
              <div className="flex gap-2">
                <input
                  id="accentColor"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="size-10 rounded cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border p-4">
            <Label className="text-sm font-medium mb-3 block">Vista previa</Label>
            <div className="flex gap-4">
              <div 
                className="flex size-12 items-center justify-center rounded-lg text-white font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                A
              </div>
              <div 
                className="flex size-12 items-center justify-center rounded-lg text-white font-bold"
                style={{ backgroundColor: secondaryColor }}
              >
                B
              </div>
              <div 
                className="flex size-12 items-center justify-center rounded-lg text-white font-bold"
                style={{ backgroundColor: accentColor }}
              >
                C
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={isSaving} className="bg-accent hover:bg-accent-hover">
            {isSaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Guardar personalización
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
