import { redirect } from 'next/navigation';

interface SaldoRedirectProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SaldoRedirect({ params, searchParams }: SaldoRedirectProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const dni = typeof sp.dni === 'string' ? sp.dni : undefined;
  const qs = dni ? `?dni=${encodeURIComponent(dni)}` : '';
  redirect(`/pagos/${slug}/cuenta${qs}`);
}