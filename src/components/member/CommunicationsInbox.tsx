'use client';

import { useState, useEffect } from 'react';
import { Mail, MailOpen, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export interface InboxMessage {
  id: string;
  kind: 'campaign' | 'sms';
  date: string;
  sender: string;
  subject?: string;
  message: string;
  status?: string;
}

interface CommunicationsInboxProps {
  messages: InboxMessage[];
  memberName?: string;
}

function storageKey(id: string): string {
  return `inbox-read:${id}`;
}

export function CommunicationsInbox({ messages, memberName }: CommunicationsInboxProps) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const read = new Set<string>();
      for (const msg of messages) {
        if (window.localStorage.getItem(storageKey(msg.id)) === '1') {
          read.add(msg.id);
        }
      }
      const handle = window.setTimeout(() => setReadIds(read), 0);
      return () => window.clearTimeout(handle);
    } catch {
      // ignore storage failures
    }
  }, [messages]);

  function markRead(id: string) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      window.localStorage.setItem(storageKey(id), '1');
    } catch {
      // ignore
    }
  }

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    markRead(id);
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const unreadCount = sorted.filter((m) => !readIds.has(m.id)).length;

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-10 text-muted-foreground/50" />}
        title="Sin mensajes"
        description="No hay comunicaciones de la institución por el momento."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {memberName ? `Mensajes para ${memberName}` : 'Mensajes de la institución'}
        </p>
        {unreadCount > 0 && (
          <Badge variant="default">{unreadCount} sin leer</Badge>
        )}
      </div>

      <div className="space-y-3">
        {sorted.map((msg) => {
          const isRead = readIds.has(msg.id);
          const isExpanded = expandedId === msg.id;
          const preview =
            msg.message.length > 120 ? `${msg.message.slice(0, 120).trim()}…` : msg.message;
          const date = new Date(msg.date).toLocaleString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <Card
              key={msg.id}
              className={cn(
                'rounded-xl shadow-sm transition-colors',
                !isRead && 'border-primary/30 bg-primary/5'
              )}
            >
              <CardContent className="p-4">
                <button
                  type="button"
                  onClick={() => toggle(msg.id)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div className="mt-0.5 shrink-0">
                    {isRead ? (
                      <MailOpen className="size-5 text-muted-foreground" />
                    ) : (
                      <Mail className="size-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{msg.sender}</span>
                      {msg.status && (
                        <Badge variant="outline" className="text-xs">
                          {msg.status}
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">{date}</span>
                    </div>
                    {!isExpanded && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
                    )}
                    {isExpanded && (
                      <p className="whitespace-pre-wrap text-sm text-foreground">{msg.message}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default CommunicationsInbox;