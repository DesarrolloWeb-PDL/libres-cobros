'use client';

import Link from 'next/link';
import { Users, ArrowRight } from 'lucide-react';

interface InstitutionDirectoryProps {
  clubs: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export function InstitutionDirectory({ clubs }: InstitutionDirectoryProps) {
  return (
    <div className="space-y-5">
      {clubs.map((institution) => (
        <Link
          key={institution.id}
          href={`/pagos/${institution.slug}`}
          className="group block"
        >
          <div className="flex items-center justify-between p-6 rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:border-accent/50 hover:bg-accent/5 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                <Users className="size-6 text-accent" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold group-hover:text-accent transition-colors">
                  {institution.name}
                </h2>
                <p className="text-sm text-muted-foreground">Portal de pagos</p>
              </div>
            </div>
            <ArrowRight className="size-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      ))}
    </div>
  );
}
