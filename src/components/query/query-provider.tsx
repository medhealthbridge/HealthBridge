"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * One cache per signed-in console session, in memory only: it is never written to disk (the PWA rule that patient
 * data is never stored on the device) and it disappears on sign-out or when the tab closes.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Shown instantly from memory; refreshed in the background once older than this.
            staleTime: 30_000,
            // How long a page you left stays in memory.
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
