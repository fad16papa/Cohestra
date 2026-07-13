import { ClientProfilePage } from "@/components/clients/client-profile-page";

type ClientProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientProfileRoute({ params }: ClientProfilePageProps) {
  const { id } = await params;
  return <ClientProfilePage id={id} />;
}
