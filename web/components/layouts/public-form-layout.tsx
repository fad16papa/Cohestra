import { ThemeToggle } from "@/components/theme/theme-toggle";

type PublicFormLayoutProps = {
  children: React.ReactNode;
};

export function PublicFormLayout({ children }: PublicFormLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-warm">
      <header className="flex justify-end px-5 py-4">
        <ThemeToggle variant="public" className="min-h-12 px-4" />
      </header>
      <main className="flex flex-1 flex-col items-center px-5 py-4 pb-8 sm:py-6">
        <div className="w-full max-w-[480px]">{children}</div>
      </main>
    </div>
  );
}
