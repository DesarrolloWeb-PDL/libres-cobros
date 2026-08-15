import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className="flex min-h-full bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 pt-14 lg:pt-0">
        <div className="container mx-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
