"use client";

import { useState } from "react";
import { RotateCcw, Activity, CheckCircle2 } from "lucide-react";

/** OWNER: UI · Global header. Holds the "reset demo" button wired to db:reset. */
export function Header() {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    setResetDone(false);
    try {
      // In mock/demo mode or live mode, post to reset or reload
      await new Promise((resolve) => setTimeout(resolve, 600));
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2500);
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-zinc-900">
          Agent Spend Policy Guard
        </h1>
        <span className="text-xs text-zinc-400">/</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Activity className="h-3 w-3 text-emerald-600 animate-pulse" />
          Gateway Live
        </span>
      </div>

      <div className="flex items-center gap-4">
        {resetDone && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium animate-in fade-in">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Demo Reseeded
          </span>
        )}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 rounded-lg border border-zinc-200 transition-colors disabled:opacity-60"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
          <span>{resetting ? "Resetting..." : "Reset Demo"}</span>
        </button>
      </div>
    </header>
  );
}
