import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { BrandAccentSync } from "@/components/theme/brand-accent-sync";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemePreferenceSync } from "@/components/theme/theme-preference-sync";
import { ThemeScript } from "@/components/theme/theme-script";
import { AppFooter } from "@/components/layouts/app-footer";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cohestra",
  description: "Activity Lead Engine — web client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <BrandAccentSync />
              <ThemePreferenceSync />
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
              <AppFooter />
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
