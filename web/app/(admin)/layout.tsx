import { AdminRouteGuard } from "@/components/auth/admin-route-guard";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminRouteGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AdminRouteGuard>
  );
}
