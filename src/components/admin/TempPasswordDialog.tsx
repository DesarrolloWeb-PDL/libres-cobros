'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TempPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tempPassword: string;
  userEmail?: string;
}

export function TempPasswordDialog({
  open,
  onOpenChange,
  tempPassword,
  userEmail,
}: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard permission
      const input = document.createElement('input');
      input.value = tempPassword;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-accent" />
            Clave temporal generada
          </DialogTitle>
          <DialogDescription>
            {userEmail
              ? `Compartí esta contraseña con ${userEmail}.`
              : 'Compartí esta contraseña con el usuario.'}{' '}
            Deberá cambiarla en el próximo login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Contraseña temporal
            </p>
            <p className="font-mono text-2xl font-bold tracking-widest text-foreground break-all select-all">
              {tempPassword}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Esta contraseña se muestra una sola vez. Copiala ahora.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="size-4" />
                Copiada
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar contraseña
              </>
            )}
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
