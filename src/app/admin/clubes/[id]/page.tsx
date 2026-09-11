import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClubesIdRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/instituciones/${id}`);
}
