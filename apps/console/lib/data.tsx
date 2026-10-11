"use client";

import { createApiAdapter, createMockAdapter, type ConsoleData } from "@suryasaathi/console-data";
import { useEffect, useState } from "react";
import { getAccessToken } from "./auth";
import { config } from "./config";

let instance: ConsoleData | null = null;

/** The console's data source, created on first use in the browser. */
export function consoleData(): ConsoleData {
  instance ??=
    config.dataSource === "api"
      ? createApiAdapter({ baseUrl: config.apiUrl, getToken: getAccessToken })
      : createMockAdapter();
  return instance;
}

export interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/** Loads ``fn``'s result for ``key``; reloads when the key changes. */
export function useQuery<T>(key: string, fn: (data: ConsoleData) => Promise<T>): QueryState<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: Error }>({ key: "" });
  useEffect(() => {
    let alive = true;
    fn(consoleData()).then(
      (data) => alive && setState({ key, data }),
      (error: unknown) =>
        alive &&
        setState({ key, error: error instanceof Error ? error : new Error(String(error)) }),
    );
    return () => {
      alive = false;
    };
    // fn is recreated each render; the key identifies the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    loading: !current,
  };
}
