import { PublicFormLayout } from "@/components/layouts/public-form-layout";
import { fetchPublicDoorServer } from "@/lib/public-door-api";
import { buildPublicRegistrationLayoutFooterLink } from "@/lib/publisher-website-url";
import { getRequestOrigin } from "@/lib/request-origin";

export default async function PublicRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [door, origin] = await Promise.all([fetchPublicDoorServer(), getRequestOrigin()]);
  const websiteLink = origin
    ? buildPublicRegistrationLayoutFooterLink(door, origin)
    : null;

  return <PublicFormLayout websiteLink={websiteLink}>{children}</PublicFormLayout>;
}
