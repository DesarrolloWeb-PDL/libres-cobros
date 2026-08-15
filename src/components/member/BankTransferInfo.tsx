'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface BankTransferInfoData {
  alias: string;
  cbu: string;
  cuit: string;
  bankName: string;
  accountHolder: string;
  reference: string;
}

interface BankTransferInfoProps {
  bankTransfer: BankTransferInfoData;
}

function CopyableRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 p-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value || '-'}</p>
      </div>
      {value && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          aria-label={`Copiar ${label}`}
        >
          {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
        </Button>
      )}
    </div>
  );
}

export function BankTransferInfo({ bankTransfer }: BankTransferInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos para transferencia bancaria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CopyableRow label="Titular" value={bankTransfer.accountHolder} />
        <CopyableRow label="Banco" value={bankTransfer.bankName} />
        <CopyableRow label="CBU" value={bankTransfer.cbu} />
        <CopyableRow label="Alias" value={bankTransfer.alias} />
        <CopyableRow label="CUIT" value={bankTransfer.cuit} />
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">Referencia de pago</p>
          <p className="font-mono text-lg font-semibold">{bankTransfer.reference}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Incluí este código en el concepto de la transferencia para que podamos acreditar tu
            pago.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
