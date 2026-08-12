import locationData from "../data/china-locations.json" with { type: "json" };

export type LocationLevel = "city" | "county" | "region";

export type LocationOption = {
  code: string;
  label: string;
  shortName: string;
  longitude: number;
  level: LocationLevel;
};

export type CountyLocationOption = {
  code: string;
  name: string;
  location: LocationOption;
};

export type CityLocationOption = {
  code: string;
  name: string;
  location: LocationOption;
  counties: CountyLocationOption[];
};

export type ProvinceLocationOption = {
  code: string;
  name: string;
  cities: CityLocationOption[];
};

export type LocationPath = {
  province: ProvinceLocationOption;
  city: CityLocationOption;
  county?: CountyLocationOption;
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

export function resolveLocation(value: string): LocationOption | undefined {
  return locationsByLabel.get(value) ?? locationsByShortName.get(value) ?? undefined;
}

export function resolveLocationLongitude(value: string): number {
  return resolveLocation(value)?.longitude ?? DEFAULT_LONGITUDE;
}

export function formatLocationLabel(value: string): string {
  return value.replaceAll(" / ", " · ");
}

type MutableCity = Omit<CityLocationOption, "counties"> & { counties: CountyLocationOption[] };
type MutableProvince = Omit<ProvinceLocationOption, "cities"> & { cities: MutableCity[] };

const provinceBuilders = new Map<string, MutableProvince>();
const cityBuilders = new Map<string, MutableCity>();

function locationParts(location: LocationOption): string[] {
  return location.label.split(" / ");
}

function ensureProvince(code: string, name: string): MutableProvince {
  const existing = provinceBuilders.get(code);
  if (existing) return existing;
  const province = { code, name, cities: [] };
  provinceBuilders.set(code, province);
  return province;
}

function ensureCity(
  province: MutableProvince,
  code: string,
  name: string,
  location: LocationOption,
): MutableCity {
  const existing = cityBuilders.get(code);
  if (existing) return existing;
  const city = { code, name, location, counties: [] };
  cityBuilders.set(code, city);
  province.cities.push(city);
  return city;
}

for (const location of LOCATIONS.filter((candidate) => candidate.level !== "county")) {
  const parts = locationParts(location);
  const provinceCode = location.code.slice(0, 2);
  const province = ensureProvince(provinceCode, parts[0]);
  const cityCode = location.level === "region" ? `${provinceCode}00` : location.code;
  ensureCity(province, cityCode, parts.at(-1) ?? location.shortName, location);
}

for (const location of LOCATIONS.filter((candidate) => candidate.level === "county")) {
  const parts = locationParts(location);
  const provinceCode = location.code.slice(0, 2);
  const province = ensureProvince(provinceCode, parts[0]);
  const cityCode = location.code.slice(0, 4);
  const fallbackLocation = resolveLocation(parts[0]) ?? location;
  const city = ensureCity(
    province,
    cityCode,
    parts.length >= 3 ? parts[1] : parts[0],
    fallbackLocation,
  );
  city.counties.push({ code: location.code, name: location.shortName, location });
}

export const LOCATION_HIERARCHY: readonly ProvinceLocationOption[] = [...provinceBuilders.values()]
  .map((province) => ({
    ...province,
    cities: province.cities
      .map((city) => ({
        ...city,
        counties: [...city.counties].sort((left, right) => left.code.localeCompare(right.code, "en")),
      }))
      .sort((left, right) => left.code.localeCompare(right.code, "en")),
  }))
  .sort((left, right) => left.code.localeCompare(right.code, "en"));

const locationPaths = new Map<string, LocationPath>();

for (const province of LOCATION_HIERARCHY) {
  for (const city of province.cities) {
    locationPaths.set(city.location.label, { province, city });
    for (const county of city.counties) {
      locationPaths.set(county.location.label, { province, city, county });
    }
  }
}

const defaultLocationPath = locationPaths.get("北京市");

export function resolveLocationPath(value: string): LocationPath {
  const location = resolveLocation(value);
  const path = location ? locationPaths.get(location.label) : undefined;
  if (path) return path;
  if (defaultLocationPath) return defaultLocationPath;
  const province = LOCATION_HIERARCHY[0];
  const city = province?.cities[0];
  if (!province || !city) throw new Error("全国县市地点数据为空");
  return { province, city };
}
