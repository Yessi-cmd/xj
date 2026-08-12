import CompassExperience from "@/app/components/CompassExperience";
import { getTodayOverviewData } from "@/app/lib/today-overview-data";

export const metadata = {
  title: "玄鉴命理投研罗盘",
  description: "一命一盘，每日寻缘。输入出生时空，生成当天六枚 A 股玄签。",
};

export default async function LivePage() {
  const overview = await getTodayOverviewData();
  return (
    <CompassExperience
      displayName="玄鉴用户"
      dailyOverview={overview.fengShui}
      marketSnapshot={overview.market}
      standaloneMode
    />
  );
}
