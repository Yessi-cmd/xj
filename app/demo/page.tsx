import CompassExperience from "@/app/components/CompassExperience";
import { getTodayOverviewData } from "@/app/lib/today-overview-data";

export const metadata = {
  title: "产品演示",
  description: "体验玄鉴每日玄签、缘分册、星轨与加密本命档案。",
};

export default async function DemoPage() {
  const overview = await getTodayOverviewData();
  return <CompassExperience displayName="访客" dailyOverview={overview.fengShui} marketSnapshot={overview.market} demoMode />;
}
