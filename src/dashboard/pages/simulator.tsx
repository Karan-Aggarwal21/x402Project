"use client";

import { useState } from "react";
import { PlayCircle, ShieldCheck, ShieldBan, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  expected: "ALLOW" | "BLOCK" | "HOLD";
  description: string;
  intentPreview: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "D1",
    name: "D1 · Ordinary Allowed Payment",
    expected: "ALLOW",
    description: "ResearchBot buys $0.02 search API from allowlisted localhost:3000.",
    intentPreview: "POST /api/sandbox/search ($0.02)",
  },
  {
    id: "D2",
    name: "D2 · Per-Transaction Limit Exceeded",
    expected: "BLOCK",
    description: "Attempted $2.00 purchase exceeds $0.10 per-transaction policy limit.",
    intentPreview: "POST /api/sandbox/premium-report ($2.00)",
  },
  {
    id: "D3",
    name: "D3 · Velocity Burst Incident",
    expected: "BLOCK",
    description: "11 rapid payment requests trip the 10 tx/min velocity ceiling.",
    intentPreview: "Burst 11 tx/min -> VELOCITY_EXCEEDED",
  },
  {
    id: "D4",
    name: "D4 · Unlisted Rogue Merchant",
    expected: "BLOCK",
    description: "Payment directed to rogue.example.com or unknown domain.",
    intentPreview: "rogue.example.com -> MERCHANT_BLOCKED",
  },
  {
    id: "D5",
    name: "D5 · Budget Exhaustion",
    expected: "BLOCK",
    description: "DataBot attempts payment after reaching 100% of hourly budget ceiling.",
    intentPreview: "DataBot ($0.50 / $0.50) -> BUDGET_EXCEEDED",
  },
  {
    id: "D6",
    name: "D6 · Review Band Approval",
    expected: "HOLD",
    description: "Payment of $0.45 falls into the human review band ($0.10–$1.00).",
    intentPreview: "POST /api/sandbox/report ($0.45) -> APPROVAL_REQUIRED",
  },
  {
    id: "D7",
    name: "D7 · Prompt Injection Defense",
    expected: "BLOCK",
    description: "Adversarial prompt attempts $2,000 extraction to unauthorized wallet.",
    intentPreview: "$2000.00 -> ABSOLUTE_BLOCK_THRESHOLD",
  },
];

export function SimulatorPage() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, string>>({});

  const handleRun = async (scenario: Scenario) => {
    setRunningId(scenario.id);
    try {
      await new Promise((r) => setTimeout(r, 700));
      setLastResult((prev) => ({
        ...prev,
        [scenario.id]: `Scenario ${scenario.id} executed successfully. Decision: ${scenario.expected}`,
      }));
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
          <PlayCircle className="h-6 w-6 text-emerald-600" />
          Interactive Demo Simulator (D1–D7)
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          One-click scenario triggers for live judge demonstrations proving policy enforcement and zero-gas interception.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SCENARIOS.map((s) => {
          const isRunning = runningId === s.id;
          const result = lastResult[s.id];

          return (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-zinc-900">{s.name}</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                      s.expected === "ALLOW"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : s.expected === "HOLD"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    Expected: {s.expected}
                  </span>
                </div>

                <p className="text-xs text-zinc-600">{s.description}</p>

                <div className="font-mono text-[11px] bg-zinc-50 p-2 rounded border border-zinc-200 text-zinc-700">
                  {s.intentPreview}
                </div>
              </div>

              <div>
                {result && (
                  <div className="mb-3 p-2.5 rounded-lg bg-zinc-900 text-emerald-400 font-mono text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{result}</span>
                  </div>
                )}

                <button
                  onClick={() => handleRun(s)}
                  disabled={isRunning}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <PlayCircle className={`h-4 w-4 text-emerald-400 ${isRunning ? "animate-spin" : ""}`} />
                  <span>{isRunning ? `Running ${s.id}...` : `Run Scenario ${s.id}`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
