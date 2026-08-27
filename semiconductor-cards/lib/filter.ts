import type { Company, Region, Segment } from "./types";

export type SortKey = "revenue" | "margin" | "name";

export interface FilterState {
  segment: Segment | "all";
  region: Region | "all";
  query: string;
}

export function filterCompanies(companies: Company[], state: FilterState): Company[] {
  const q = state.query.trim().toLowerCase();
  return companies.filter((c) => {
    if (state.segment !== "all" && !c.segments.includes(state.segment)) return false;
    if (state.region !== "all" && c.region !== state.region) return false;
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.nameJa.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q)
    );
  });
}

export function sortCompanies(companies: Company[], key: SortKey): Company[] {
  const sorted = [...companies];
  switch (key) {
    case "revenue":
      return sorted.sort((a, b) => b.revenueUsdB - a.revenueUsdB);
    case "margin":
      return sorted.sort((a, b) => b.operatingMarginPct - a.operatingMarginPct);
    case "name":
      return sorted.sort((a, b) => a.nameJa.localeCompare(b.nameJa, "ja"));
    default:
      return sorted;
  }
}
