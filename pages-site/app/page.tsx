import SocialApp from "@/components/social-app";
import { initialDemoState } from "@/lib/demo";

export default function Page() {
  return <SocialApp initialState={initialDemoState} />;
}
