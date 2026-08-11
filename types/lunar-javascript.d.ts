declare module "lunar-javascript" {
  interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
  }

  interface LunarDate {
    getEightChar(): EightChar;
    toString(): string;
  }

  interface SolarDate {
    getLunar(): LunarDate;
  }

  export const Solar: {
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): SolarDate;
  };

  export const Lunar: unknown;
}
