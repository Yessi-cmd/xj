import marketSnapshotData from "@/app/data/market-snapshot.json";
import { buildDailyFengShuiOverview } from "@/app/lib/daily-overview";
import { createDailyContext } from "@/app/lib/fortune";
import type { MarketSnapshot } from "@/app/lib/market-overview";

export async function getTodayOverviewData(date = new Date()) {
  const dailyContext = await createDailyContext(date);
  return {
    fengShui: buildDailyFengShuiOverview(dailyContext),
    market: marketSnapshotData as MarketSnapshot,
  };
}
