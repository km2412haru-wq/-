"use client";

import { useEffect, useState } from "react";
import {
  fetchEnvironment,
  loadLocation,
  requestLocation,
  type EnvironmentSnapshot,
  type StoredLocation,
} from "@/lib/environment";

export function useEnvironment(targetDate: string) {
  const [location, setLocation] = useState<StoredLocation | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocation(loadLocation());
  }, []);

  useEffect(() => {
    if (!location) {
      setEnvironment(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEnvironment(location, targetDate).then((env) => {
      if (cancelled) return;
      setEnvironment(env);
      setLoading(false);
      if (!env) setError("環境データを取得できませんでした");
    });
    return () => {
      cancelled = true;
    };
  }, [location, targetDate]);

  const enableLocation = async () => {
    setError(null);
    try {
      const loc = await requestLocation();
      setLocation(loc);
    } catch {
      setError("位置情報を取得できませんでした(設定で許可が必要な場合があります)");
    }
  };

  return { location, environment, loading, error, enableLocation };
}
