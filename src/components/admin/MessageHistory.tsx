import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import type { MassMessageHistoryResponse } from '@/types/messaging';

interface MessageHistoryProps {
  history: MassMessageHistoryResponse;
}

const statusLabels: Record<string, string> = {
  SENT: 'Enviado',
  PARTIAL: 'Parcial',
  FAILED: 'Fallido',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  SENT: 'default',
  PARTIAL: 'secondary',
  FAILED: 'destructive',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateMessage(message: string, maxLength = 80): string {
  if (message.length <= maxLength) return message;
  return `${message.slice(0, maxLength).trim()}…`;
}

export function MessageHistory({ history }: MessageHistoryProps) {
  const items = history.data;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-base font-semibold">Historial de mensajes</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Sin mensajes enviados</p>
              <p className="text-xs text-muted-foreground">
                Los envíos masivos aparecerán aquí.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(item.sentAt)}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-xs truncate text-sm" title={item.message}>
                        {truncateMessage(item.message)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="tabular-nums">{item.recipientCount}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({item.sentCount} enviados
                        {item.failedCount > 0 && ` · ${item.failedCount} fallidos`}
                        {item.skippedCount > 0 && ` · ${item.skippedCount} omitidos`})
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[item.status] ?? 'default'}>
                        {statusLabels[item.status] ?? item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
