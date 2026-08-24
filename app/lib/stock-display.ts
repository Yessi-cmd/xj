function formatScaled(value: number, unit: string): string {
  const absolute = Math.abs(value);
  const maximumFractionDigits = absolute >= 100 ? 0 : absolute >= 10 ? 1 : 2;
  return `${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)}${unit}`;
}

/** 行情接口的总市值字段以亿元为单位。 */
export function formatMarketCapYi(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 10_000) return formatScaled(value / 10_000, "万亿");
  return formatScaled(value, "亿");
}

/** 东方财富 F10 的主营收入字段以人民币元为单位。 */
export function formatRevenueYuan(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) return formatScaled(value / 1_000_000_000_000, "万亿");
  if (absolute >= 100_000_000) return formatScaled(value / 100_000_000, "亿");
  if (absolute >= 10_000) return formatScaled(value / 10_000, "万");
  return formatScaled(value, "元");
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatSnapshotDate(value: string | null | undefined): string {
  if (!value) return "";
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dashed = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return dashed ? `${dashed[1]}-${dashed[2]}-${dashed[3]}` : value;
}

export function formatRevenuePeriod(value: string | null | undefined): string {
  const date = formatSnapshotDate(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return value ? "最近报告期" : "最近报告期";
  const [, year, month, day] = match;
  if (month === "12" && day === "31") return `${year}年报`;
  if (month === "09" && day === "30") return `${year}三季报`;
  if (month === "06" && day === "30") return `${year}中报`;
  if (month === "03" && day === "31") return `${year}一季报`;
  return `${year}-${month}报告期`;
}
