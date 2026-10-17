'use client';

import { useState, useEffect } from 'react';
import { Save, Palette, Loader2 } from 'lucide-react';
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
import { toast } from '@/components/ui/toast';
import type { SiteConfigTheme } from '@/types/config';

const COLOR_PRESETS = [
  { name: 'Violeta', primary: '#7c3aed', secondary: '#a78bfa', accent: '#5b21b6', bg: '#f8fafc' },
  { name: 'Azul', primary: '#2563eb', secondary: '#60a5fa', accent: '#1d4ed8', bg: '#f8fafc' },
  { name: 'Verde', primary: '#16a34a', secondary: '#4ade80', accent: '#15803d', bg: '#f8fafc' },
  { name: 'Rojo', primary: '#dc2626', secondary: '#f87171', accent: '#b91c1c', bg: '#fef2f2' },
  { name: 'Naranja', primary: '#ea580c', secondary: '#fb923c', accent: '#c2410c', bg: '#fff7ed' },
  { name: 'Rosa', primary: '#db2777', secondary: '#f472b6', accent: '#be185d', bg: '#fdf2f8' },
  { name: 'Cyan', primary: '#0891b2', secondary: '#22d3ee', accent: '#0e7490', bg: '#ecfeff' },
  { name: 'Gris', primary: '#4b5563', secondary: '#9ca3af', accent: '#374151', bg: '#f9fafb' },
];

export function AdminThemeCard() {
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [theme, setTheme] = useState<SiteConfigTheme>({
    primaryColor: '#7c3aed',
    secondaryColor: '#a78bfa',
    accentColor: '#5b21b6',
    bgColor: '#f8fafc',
  });

  useEffect(() => {
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
  }, []);

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

  return (
    <div className="space-y-6">
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
            <Label className="text-sm font-medium">Presets de colores</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setTheme({
                    primaryColor: preset.primary,
                    secondaryColor: preset.secondary,
                    accentColor: preset.accent,
                    bgColor: preset.bg,
                  })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-150 ${
                    theme.primaryColor === preset.primary && theme.bgColor === preset.bg
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.primary }} />
                    <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.secondary }} />
                    <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.accent }} />
                    <div className="w-4 h-4 rounded-full ring-1 ring-black/5" style={{ backgroundColor: preset.bg }} />
                  </div>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="text-sm font-medium">Color principal</Label>
              <div className="flex gap-2">
                <input
                  id="primaryColor"
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                  placeholder="#7c3aed"
                  className="h-10 flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor" className="text-sm font-medium">Color secundario</Label>
              <div className="flex gap-2">
                <input
                  id="secondaryColor"
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme.secondaryColor}
                  onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                  placeholder="#a78bfa"
                  className="h-10 flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor" className="text-sm font-medium">Color de acento</Label>
              <div className="flex gap-2">
                <input
                  id="accentColor"
                  type="color"
                  value={theme.accentColor}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme.accentColor}
                  onChange={(e) => setTheme({ ...theme, accentColor: e.target.value })}
                  placeholder="#5b21b6"
                  className="h-10 flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bgColor" className="text-sm font-medium">Color de fondo</Label>
              <div className="flex gap-2">
                <input
                  id="bgColor"
                  type="color"
                  value={theme.bgColor}
                  onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border cursor-pointer"
                />
                <Input
                  type="text"
                  value={theme.bgColor}
                  onChange={(e) => setTheme({ ...theme, bgColor: e.target.value })}
                  placeholder="#f8fafc"
                  className="h-10 flex-1"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vista previa</Label>
            <div className="mt-3 flex gap-2">
              <div
                className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Botón principal
              </div>
              <div
                className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: theme.secondaryColor }}
              >
                Secundario
              </div>
              <div
                className="px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm"
                style={{ backgroundColor: theme.accentColor }}
              >
                Acento
              </div>
              <div
                className="px-4 py-2 rounded-lg text-sm font-medium shadow-sm border"
                style={{ backgroundColor: theme.bgColor }}
              >
                Fondo
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
            {isSavingTheme ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isSavingTheme ? 'Guardando...' : 'Guardar colores'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
