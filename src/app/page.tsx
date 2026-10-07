import SocialApp from "@/components/social-app";
import { ensureSeeded } from "@/lib/seed";
import { getSocialState, getViewer } from "@/lib/social";
import type { View } from "@/lib/types";

export const dynamic = "force-dynamic";

const views: View[] = ["home", "guests", "chat", "connections", "events", "about", "rules", "admin"];

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await ensureSeeded();
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const state = await getSocialState(viewer);
  const requestedView = typeof params.view === "string" ? params.view as View : "home";
  return <SocialApp initialState={state} initialView={views.includes(requestedView) ? requestedView : "home"} />;
}
