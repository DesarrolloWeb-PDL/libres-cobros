'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ClubDirectoryProps {
  clubs: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export function ClubDirectory({ clubs }: ClubDirectoryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clubs.map((club) => (
        <Link key={club.id} href={`/pagos/${club.slug}`}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold">{club.name}</h2>
                <p className="text-sm text-muted-foreground">Portal de pagos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
