import CompassExperience from "@/app/components/CompassExperience";
import { requireChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireChatGPTUser("/dashboard");
  const displayName = user.fullName ?? user.email.split("@")[0] ?? "玄鉴用户";

  return <CompassExperience displayName={displayName} signedIn />;
}
