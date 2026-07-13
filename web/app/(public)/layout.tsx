import { PublicFormLayout } from "@/components/layouts/public-form-layout";

export default function PublicRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicFormLayout>{children}</PublicFormLayout>;
}
