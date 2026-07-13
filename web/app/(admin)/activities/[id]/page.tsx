import { ActivityDetailPageClient } from "@/components/activities/activity-detail-page-client";

type ActivityDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { id } = await params;
  return <ActivityDetailPageClient id={id} />;
}
