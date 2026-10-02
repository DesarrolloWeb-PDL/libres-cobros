"use client";

import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TicketActions() {
  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <div className="no-print mx-auto mt-8 flex max-w-2xl justify-center gap-3 print:hidden">
      <Button
        type="button"
        variant="outline"
        onClick={handlePrint}
        className="h-11 px-6"
      >
        <Printer className="mr-2 size-4" />
        Imprimir
      </Button>
      <Button
        type="button"
        onClick={handlePrint}
        className="h-11 px-6"
      >
        <Download className="mr-2 size-4" />
        Descargar PDF
      </Button>
    </div>
  );
}
