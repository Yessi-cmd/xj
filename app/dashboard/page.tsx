import CompassExperience from "@/app/components/CompassExperience";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getTodayOverviewData } from "@/app/lib/today-overview-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireChatGPTUser("/dashboard");
  const overview = await getTodayOverviewData();
  const displayName = user.fullName ?? user.email.split("@")[0] ?? "玄鉴用户";

  return <CompassExperience displayName={displayName} dailyOverview={overview.fengShui} marketSnapshot={overview.market} signedIn />;
}
