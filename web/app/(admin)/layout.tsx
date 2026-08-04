import { AdminRouteGuard } from "@/components/auth/admin-route-guard";
import { AuthHandoffHandler } from "@/components/auth/auth-handoff-handler";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthHandoffHandler>
      <AdminRouteGuard>
        <DashboardLayout>{children}</DashboardLayout>
      </AdminRouteGuard>
    </AuthHandoffHandler>
  );
}
