export type MarketIndexSnapshot = {
  code: string;
  name: string;
  level: number;
  change: number;
  changePercent: number;
};

export type MarketSnapshot = {
  schemaVersion: 1;
  tradingDate: string;
  marketUpdatedAt: string;
  capturedAt: string;
  status: "盘中快照" | "收盘快照" | "最近收盘";
  source: {
    name: string;
    url: string;
  };
  indices: MarketIndexSnapshot[];
};

export type MarketSummary = {
  title: string;
  description: string;
  direction: "up" | "down" | "mixed" | "flat";
};

export function summarizeMarket(snapshot: MarketSnapshot): MarketSummary {
  const positive = snapshot.indices.filter((index) => index.changePercent > 0).length;
  const negative = snapshot.indices.filter((index) => index.changePercent < 0).length;

  if (positive === snapshot.indices.length) {
    return {
      title: "三大指数同步收涨",
      description: "截至快照时点，上证、深证与创业板指数均较前一交易日收高。这里仅陈列已发生的变化，不推断后市。",
      direction: "up",
    };
  }
  if (negative === snapshot.indices.length) {
    return {
      title: "三大指数同步收跌",
      description: "截至快照时点，上证、深证与创业板指数均较前一交易日收低。这里仅陈列已发生的变化，不推断后市。",
      direction: "down",
    };
  }
  if (positive === 0 && negative === 0) {
    return {
      title: "三大指数大致持平",
      description: "截至快照时点，三项核心指数相对前一交易日变动有限。这里仅陈列已发生的变化，不推断后市。",
      direction: "flat",
    };
  }
  return {
    title: "三大指数表现分化",
    description: "截至快照时点，三项核心指数涨跌并不同步。这里仅陈列已发生的变化，不把分化解读为后市信号。",
    direction: "mixed",
  };
}
