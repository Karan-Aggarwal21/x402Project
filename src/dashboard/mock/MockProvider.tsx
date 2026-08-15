"use client";

import { useEffect, useState, type ReactNode } from "react";

export function MockProvider({ children }: { children: ReactNode }) {
  const [mockReady, setMockReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initMocks() {
      if (typeof window !== "undefined") {
        try {
          const { worker } = await import("@/dashboard/mock/browser");
          await worker.start({
            onUnhandledRequest: "bypass",
            serviceWorker: {
              url: "/mockServiceWorker.js",
            },
          });
          console.log("[MSW] Mock Service Worker ready.");
        } catch (error) {
          console.error("[MSW] Failed to start Mock Service Worker:", error);
        }
      }
      if (isMounted) {
        setMockReady(true);
      }
    }

    initMocks();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!mockReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-sm text-zinc-500 font-mono">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Initializing Policy Gateway...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
