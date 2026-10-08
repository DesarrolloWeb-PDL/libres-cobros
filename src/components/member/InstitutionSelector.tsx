'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface InstitutionSelectorProps {
  clubs: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export function InstitutionSelector({ clubs }: InstitutionSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSelect(slug: string) {
    setOpen(false);
    router.push(`/pagos/${slug}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button
            {...props}
            className="bg-accent text-white font-medium hover:bg-accent/90 transition-colors px-8"
          >
            Elegí tu institución
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Elegí tu institución</DialogTitle>
          <DialogDescription>
            Seleccioná la institución a la que pertenecés para ver tus cuotas y realizar pagos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => handleSelect(club.slug)}
              className="group flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-all duration-200 hover:border-accent/50 hover:bg-accent/5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="size-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold group-hover:text-accent transition-colors">
                    {club.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Portal de pagos</p>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
