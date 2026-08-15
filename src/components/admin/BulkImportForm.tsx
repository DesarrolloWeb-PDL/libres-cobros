'use client';

import { useState, useCallback } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import type { MemberImportResult } from '@/types/member';

interface BulkImportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkImportForm({ open, onOpenChange, onSuccess }: BulkImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MemberImportResult | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
    setIsDragging(false);
  }

  function handleClose(openValue: boolean) {
    if (!openValue) {
      reset();
    }
    onOpenChange(openValue);
  }

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  function validateAndSetFile(selectedFile: File) {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.add({
        title: 'Archivo no válido',
        description: 'Solo se permiten archivos Excel (.xlsx o .xls)',
        type: 'error',
      });
      return;
    }
    setFile(selectedFile);
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/members/import', {
        method: 'POST',
        body: formData,
      });

      const data: MemberImportResult = await response.json();

      if (!response.ok) {
        throw new Error('Error al importar socios');
      }

      setResult(data);

      if (data.imported > 0) {
        toast.add({
          title: 'Importación completada',
          description: `Se importaron ${data.imported} socios`,
          type: 'success',
        });
        onSuccess?.();
      }

      if (data.errors.length > 0) {
        toast.add({
          title: 'Errores de importación',
          description: `${data.errors.length} filas no pudieron importarse`,
          type: 'warning',
        });
      }
    } catch (error) {
      toast.add({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo importar el archivo',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar socios</DialogTitle>
          <DialogDescription>
            Arrastrá un archivo Excel o seleccionalo desde tu dispositivo. El archivo debe tener
            columnas con encabezados como DNI, Nombre, Apellido, Email, Teléfono, Categoría, Estado y
            Notas.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              <div className="rounded-full bg-muted p-3">
                <Upload className="size-6 text-muted-foreground" />
              </div>
              <div className="text-center text-sm">
                <p className="font-medium">Arrastrá tu archivo aquí</p>
                <p className="text-muted-foreground">o hacé clic para seleccionar</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    validateAndSetFile(selectedFile);
                  }
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>

            {file && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="size-8 text-green-600" />
                  <div className="text-sm">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Quitar archivo">
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Resumen de importación</p>
              <p className="text-2xl font-bold text-green-600">{result.imported}</p>
              <p className="text-sm text-muted-foreground">socios importados</p>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Errores ({result.errors.length})
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border p-2">
                  {result.errors.map((error, index) => (
                    <p key={index} className="text-sm">
                      {error.row > 0 ? `Fila ${error.row}:` : ''} {error.message}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={!file || isLoading}>
                {isLoading ? 'Importando...' : 'Importar'}
              </Button>
            </>
          ) : (
            <Button onClick={() => handleClose(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
