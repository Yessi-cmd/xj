import locationData from "../data/china-locations.json" with { type: "json" };

export type LocationLevel = "city" | "county" | "region";

export type LocationOption = {
  code: string;
  label: string;
  shortName: string;
  longitude: number;
  level: LocationLevel;
};

export type LocationSearchResult = {
  options: LocationOption[];
  total: number;
};

type LocationTuple = [
  code: string,
  label: string,
  shortName: string,
  longitude: number,
  level: LocationLevel,
];

const locationRows = locationData.locations as LocationTuple[];

export const LOCATIONS: readonly LocationOption[] = locationRows.map(([
  code,
  label,
  shortName,
  longitude,
  level,
]) => ({ code, label, shortName, longitude, level }));

export const LOCATION_COUNT = locationData.locationCount;
export const LOCATION_DATA_VERSION = locationData.divisionVersion;

const DEFAULT_LONGITUDE = 116.405285;
const locationsByLabel = new Map(LOCATIONS.map((location) => [location.label, location]));
const locationsByShortName = new Map<string, LocationOption | null>();

for (const location of LOCATIONS) {
  const existing = locationsByShortName.get(location.shortName);
  locationsByShortName.set(location.shortName, existing === undefined ? location : null);
}

function compactQuery(value: string): string {
  return value.toLocaleLowerCase("zh-CN").replace(/[\s/·—-]+/g, "");
}

function looseQuery(value: string): string {
  return compactQuery(value).replace(
    /特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|自治县|省|市|地区|盟|区|县|旗/g,
    "",
  );
}

const searchableLocations = LOCATIONS.map((location) => ({
  location,
  compactLabel: compactQuery(location.label),
  compactName: compactQuery(location.shortName),
  looseLabel: looseQuery(location.label),
  looseName: looseQuery(location.shortName),
}));

export function resolveLocation(value: string): LocationOption | undefined {
  return locationsByLabel.get(value) ?? locationsByShortName.get(value) ?? undefined;
}

export function resolveLocationLongitude(value: string): number {
  return resolveLocation(value)?.longitude ?? DEFAULT_LONGITUDE;
}

export function formatLocationLabel(value: string): string {
  return value.replaceAll(" / ", " · ");
}

const POPULAR_NAMES = [
  "北京市",
  "上海市",
  "广州市",
  "深圳市",
  "杭州市",
  "成都市",
  "武汉市",
  "西安市",
  "乌鲁木齐市",
];

const popularLocations = POPULAR_NAMES
  .map(resolveLocation)
  .filter((location): location is LocationOption => Boolean(location));

function matchScore(
  candidate: (typeof searchableLocations)[number],
  compact: string,
  loose: string,
): number | null {
  if (candidate.compactName === compact) return 0;
  if (candidate.looseName === loose) return 1;
  if (candidate.compactName.startsWith(compact)) return 2;
  if (candidate.looseName.startsWith(loose)) return 3;
  if (candidate.compactLabel.includes(compact)) return 4;
  if (loose && candidate.looseLabel.includes(loose)) return 5;
  return null;
}

export function searchLocations(query: string, limit = 80): LocationSearchResult {
  const compact = compactQuery(query);
  const loose = looseQuery(query);
  if (!compact) return { options: popularLocations, total: LOCATION_COUNT };

  const matches = searchableLocations
    .map((candidate) => ({ candidate, score: matchScore(candidate, compact, loose) }))
    .filter((match): match is { candidate: (typeof searchableLocations)[number]; score: number } => match.score !== null)
    .sort((left, right) => left.score - right.score
      || left.candidate.location.label.length - right.candidate.location.label.length
      || left.candidate.location.code.localeCompare(right.candidate.location.code, "en"));

  return {
    options: matches.slice(0, limit).map((match) => match.candidate.location),
    total: matches.length,
  };
}
