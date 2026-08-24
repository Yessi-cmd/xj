function normalizeDateKey(value) {
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(value ?? "");
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dashed = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return dashed ? `${dashed[1]}-${dashed[2]}-${dashed[3]}` : "";
}

export function calendarDayAge(snapshotDate, asOfDate) {
  const snapshot = normalizeDateKey(snapshotDate);
  const asOf = normalizeDateKey(asOfDate);
  if (!snapshot || !asOf) throw new Error("快照日期格式无效。");
  const age = (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${snapshot}T00:00:00Z`)) / 86_400_000;
  if (!Number.isInteger(age) || age < 0) throw new Error("快照日期晚于检查日期。");
  return age;
}

export function freshnessProblems({
  asOfDate,
  marketDate,
  factsDate,
  marketMaxDays = 7,
  factsMaxDays = 14,
}) {
  const marketAge = calendarDayAge(marketDate, asOfDate);
  const factsAge = calendarDayAge(factsDate, asOfDate);
  const problems = [];
  if (marketAge > marketMaxDays) problems.push(`大盘快照已 ${marketAge} 天未更新（上限 ${marketMaxDays} 天）`);
  if (factsAge > factsMaxDays) problems.push(`个股事实快照已 ${factsAge} 天未更新（上限 ${factsMaxDays} 天）`);
  return { marketAge, factsAge, problems };
}
