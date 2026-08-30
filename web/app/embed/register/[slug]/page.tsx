type EmbedRegisterPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * Story 32.1 stub — full chrome-light registration embed ships in 32.2.
 * Middleware sets route-scoped CSP frame-ancestors from tenant allow-list.
 */
export default async function EmbedRegisterPage({ params }: EmbedRegisterPageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex min-h-[12rem] max-w-lg flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm text-muted-foreground">Registration embed</p>
      <p className="text-lg font-medium">{slug}</p>
      <p className="text-xs text-muted-foreground">
        Embed form UI arrives in Story 32.2. CSP headers are active on this route.
      </p>
    </main>
  );
}
