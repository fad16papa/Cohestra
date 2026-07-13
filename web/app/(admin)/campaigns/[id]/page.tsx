import { CampaignDetailPage } from "@/components/campaigns/campaign-detail-page";

type CampaignDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignDetailRoute({ params }: CampaignDetailRouteProps) {
  const { id } = await params;
  return <CampaignDetailPage id={id} />;
}
