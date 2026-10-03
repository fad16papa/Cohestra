import { RouteBoundaryState } from "@/components/shared/route-boundary-state";

export default function EmbedNotFound() {
  return <RouteBoundaryState kind="not-found" surface="embed" ownsMain />;
}
