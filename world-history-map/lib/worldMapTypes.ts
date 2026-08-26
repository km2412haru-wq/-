export interface CountryShape {
  id: string;
  alpha2: string | null;
  nameJa: string;
  nameEn: string;
  d: string;
}

export interface WorldMapData {
  width: number;
  height: number;
  shapes: CountryShape[];
}
