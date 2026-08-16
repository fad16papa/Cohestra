type TenantMaintenancePageProps = {
  tenantName?: string | null;
};

export function TenantMaintenancePage({ tenantName }: TenantMaintenancePageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper2 px-6 py-16">
      <div className="max-w-md text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
          Workspace paused
        </p>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink">
          {tenantName ? `${tenantName} is on hold` : "This workspace is on hold"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone">
          Access is temporarily frozen while a platform review or support matter is resolved.
          This is not ordinary billing. Signed-in operators can open{" "}
          <strong className="font-medium text-ink">Settings → Help &amp; support</strong> to reach
          Creativorare with a screenshot and support ID.
        </p>
      </div>
    </main>
  );
}
