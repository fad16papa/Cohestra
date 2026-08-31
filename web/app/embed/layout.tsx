/**
 * Chrome-light layout for iframe embeds — no PublicFormLayout header/footer.
 * CSP frame-ancestors is set per-request in middleware (Story 32.1).
 */
export default function EmbedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-0 bg-surface-warm text-text-warm">{children}</div>
  );
}
