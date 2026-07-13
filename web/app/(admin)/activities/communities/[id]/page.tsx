"use client";

import { use } from "react";

import { CommunityDetailPage } from "@/components/activities/community-detail-page";

type CommunityDetailRouteProps = {
  params: Promise<{ id: string }>;
};

export default function CommunityDetailRoute({ params }: CommunityDetailRouteProps) {
  const { id } = use(params);
  return <CommunityDetailPage id={id} />;
}
