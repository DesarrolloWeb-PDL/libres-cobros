'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Institution {
  id: string;
  name: string;
  siglas?: string | null;
  slug: string;
  status: string;
}

export interface InstitutionSelectorProps {
  userRole?: string;
}

export function InstitutionSelector({ userRole }: InstitutionSelectorProps) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )active_institution_id=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  });
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isSuperAdmin || !mounted) return;
    fetch('/api/admin/institutions', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => setInstitutions(json.data ?? []))
      .catch(() => setInstitutions([]));
  }, [isSuperAdmin, mounted]);

  if (!isSuperAdmin || !mounted) return null;

  const activeInstitution = institutions.find((c) => c.id === activeInstitutionId);
  const displayName = activeInstitution?.siglas || activeInstitution?.name || 'Todas las instituciones';

  function handleSelectInstitution(institutionId: string | null) {
    const days = 365;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `active_institution_id=${encodeURIComponent(institutionId ?? '')}; expires=${expires}; path=/`;
    setActiveInstitutionId(institutionId);
    setIsOpen(false);
    window.location.reload();
  }

  return (
    <div className="px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground mb-1">Institución activa</div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm min-w-[200px] w-full',
            'bg-background hover:bg-muted transition-colors'
          )}
        >
          <span className="flex items-center gap-2">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="whitespace-nowrap">{institutions.length === 0 ? 'Cargando...' : displayName}</span>
          </span>
          <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute inset-x-0 top-full z-50 mt-1 rounded-lg border bg-background shadow-lg min-w-[200px]">
            <div className="max-h-60 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => handleSelectInstitution(null)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  !activeInstitutionId
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-left'
                )}
              >
                Todas las instituciones
              </button>
              {institutions
                .filter((c) => c.status === 'ACTIVE')
                .map((institution) => (
                  <button
                    key={institution.id}
                    type="button"
                    onClick={() => handleSelectInstitution(institution.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors text-left whitespace-nowrap',
                      activeInstitutionId === institution.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {institution.siglas ? (
                      <span className="font-medium">{institution.siglas}</span>
                    ) : null}
                    <span className={institution.siglas ? 'text-muted-foreground' : ''}>
                      {institution.name}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
