/**
 * F3: 環境データ(気温・気圧・湿度)の自動取得。
 * Open-Meteo(APIキー不要・無料)を使用。位置情報はブラウザのGeolocation APIで
 * 一度だけ取得してlocalStorageに保存し、以降は自動で使い回す。
 */

const LOCATION_KEY = "vitalog:location";

export interface StoredLocation {
  lat: number;
  lon: number;
}

export interface EnvironmentSnapshot {
  temperatureC?: number;
  pressureHpa?: number;
  humidityPercent?: number;
}

export function loadLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as StoredLocation) : null;
  } catch {
    return null;
  }
}

function saveLocation(loc: StoredLocation): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}

export function requestLocation(): Promise<StoredLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("このブラウザは位置情報の取得に対応していません"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveLocation(loc);
        resolve(loc);
      },
      (err) => reject(err),
      { timeout: 10_000 }
    );
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 対象日が今日なら現在値API、過去日ならアーカイブAPI(正午の値)を使う */
export async function fetchEnvironment(
  loc: StoredLocation,
  dateStr: string
): Promise<EnvironmentSnapshot | null> {
  try {
    if (dateStr >= todayIso()) {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
        `&current=temperature_2m,surface_pressure,relative_humidity_2m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const c = data.current;
      if (!c) return null;
      return {
        temperatureC: c.temperature_2m,
        pressureHpa: c.surface_pressure,
        humidityPercent: c.relative_humidity_2m,
      };
    }

    const url =
      `https://archive-api.open-meteo.com/v1/archive?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&start_date=${dateStr}&end_date=${dateStr}` +
      `&hourly=temperature_2m,surface_pressure,relative_humidity_2m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const times: string[] = data.hourly?.time ?? [];
    const idx = times.findIndex((t) => t.endsWith("T12:00"));
    if (idx === -1) return null;
    return {
      temperatureC: data.hourly.temperature_2m?.[idx],
      pressureHpa: data.hourly.surface_pressure?.[idx],
      humidityPercent: data.hourly.relative_humidity_2m?.[idx],
    };
  } catch (err) {
    console.error("環境データの取得に失敗しました:", err);
    return null;
  }
}
