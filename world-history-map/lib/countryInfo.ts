/**
 * Basic country facts (flag / capital / population) from the free,
 * keyless REST Countries API, plus a flag image from flagcdn.com (also
 * free, keyless — just a static SVG per ISO alpha-2 code).
 */

export interface CountryBasicInfo {
  capital: string[];
  population: number;
  flagUrl: string;
}

const REST_COUNTRIES_BASE = "https://restcountries.com/v3.1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — this data barely changes
const cache = new Map<string, { value: CountryBasicInfo | null; expiresAt: number }>();

export async function fetchCountryBasicInfo(
  alpha2: string,
  options?: { baseUrl?: string }
): Promise<CountryBasicInfo | null> {
  const baseUrl = options?.baseUrl ?? REST_COUNTRIES_BASE;
  const useCache = !options?.baseUrl;

  if (useCache) {
    const cached = cache.get(alpha2);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let result: CountryBasicInfo | null = null;
  try {
    const url = `${baseUrl}/alpha/${alpha2}?fields=capital,population`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const data = await res.json();
      // The API's response shape has varied between a bare object and a
      // single-element array across versions — handle both defensively.
      const raw = Array.isArray(data) ? data[0] : data;
      if (raw) {
        result = {
          capital: Array.isArray(raw.capital) ? raw.capital : [],
          population: typeof raw.population === "number" ? raw.population : 0,
          flagUrl: `https://flagcdn.com/${alpha2.toLowerCase()}.svg`,
        };
      }
    }
  } catch {
    result = null;
  }

  if (useCache) {
    cache.set(alpha2, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return result;
}

/** Formats a population count the way it's conventionally read in Japanese (億/万 grouping). */
export function formatPopulationJa(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "不明";
  if (n >= 1e8) {
    const oku = Math.floor(n / 1e8);
    const man = Math.round((n % 1e8) / 1e4);
    return man > 0 ? `約${oku}億${man.toLocaleString("ja-JP")}万人` : `約${oku}億人`;
  }
  if (n >= 1e4) {
    const man = Math.round(n / 1e4);
    return `約${man.toLocaleString("ja-JP")}万人`;
  }
  return `${n.toLocaleString("ja-JP")}人`;
}
