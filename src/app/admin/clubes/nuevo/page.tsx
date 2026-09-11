import { redirect } from 'next/navigation';

export default function ClubesNuevoRedirect() {
  redirect('/admin/instituciones/nuevo');
}
