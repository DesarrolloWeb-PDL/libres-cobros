'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Club {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface ClubSelectorProps {
  userRole?: string;
}

export function ClubSelector({ userRole }: ClubSelectorProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )active_club_id=([^;]+)'));
    setActiveClubId(match ? decodeURIComponent(match[2]) : null);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin || !mounted) return;
    fetch('/api/admin/clubs', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => setClubs(json.data ?? []))
      .catch(() => setClubs([]));
  }, [isSuperAdmin, mounted]);

  if (!isSuperAdmin || !mounted) return null;

  const activeClub = clubs.find((c) => c.id === activeClubId);
  const displayName = activeClub?.name ?? 'Todos los clubes';

  function handleSelectClub(clubId: string | null) {
    const days = 365;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `active_club_id=${encodeURIComponent(clubId ?? '')}; expires=${expires}; path=/`;
    setActiveClubId(clubId);
    setIsOpen(false);
    window.location.reload();
  }

  return (
    <div className="px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground mb-1">Club activo</div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm',
            'bg-background hover:bg-muted transition-colors'
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{clubs.length === 0 ? 'Cargando...' : displayName}</span>
          </span>
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-lg border bg-background shadow-lg">
            <div className="max-h-60 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => handleSelectClub(null)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  !activeClubId
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-left'
                )}
              >
                Todos los clubes
              </button>
              {clubs
                .filter((c) => c.status === 'ACTIVE')
                .map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => handleSelectClub(club.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                      activeClubId === club.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-left'
                    )}
                  >
                    {club.name}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
