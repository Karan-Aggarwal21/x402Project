"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { DecisionFeed } from "@/dashboard/components/decision-feed";
import {
  DollarSign,
  ShieldBan,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Timer,
  ShieldCheck,
  Zap,
  TrendingDown,
} from "lucide-react";

interface MetricsSummary {
  windowHours: number;
  decisions: {
    allow: number;
    hold: number;
    block: number;
  };
  spentUsd: string;
  blockedUsd: string;
  onChainTxCount: number;
  blockedOnChainTxCount: number;
  topBlockReasons: { code: string; count: number }[];
  p95GuardLatencyMs: number;
}

const HUMAN_REASONS: Record<string, string> = {
  PER_TRANSACTION_LIMIT_EXCEEDED: "Exceeded per-transaction limit ($0.10)",
  ABSOLUTE_BLOCK_THRESHOLD: "Exceeded absolute limit / prompt injection",
  MERCHANT_NOT_ALLOWLISTED: "Merchant domain not on allowlist",
  MERCHANT_BLOCKED: "Merchant domain is explicitly blocked",
  RECIPIENT_MISMATCH: "Recipient address mismatch (pinned recipient)",
  VELOCITY_EXCEEDED: "Velocity limit exceeded (tx/min)",
  BUDGET_EXCEEDED: "Hourly budget ceiling exceeded",
};

export function OverviewPage() {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setLoading(true);
        const data = await apiGet<MetricsSummary>(API.metrics);
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-zinc-200 rounded-xl" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-semibold">Unable to load dashboard overview</p>
        <p className="text-sm mt-1 text-red-600">{error || "No data received"}</p>
      </div>
    );
  }

  const totalDecisions =
    metrics.decisions.allow + metrics.decisions.hold + metrics.decisions.block;

  return (
    <div className="space-y-8">
      {/* Title & Context */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          Enforcement Overview
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Real-time policy guard decisions and on-chain prevention metrics for the last {metrics.windowHours}h.
        </p>
      </div>

      {/* 4 Core Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Spend Today */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Spend Today
            </span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900 tracking-tight font-mono">
              ${metrics.spentUsd}
            </div>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">
                {metrics.onChainTxCount} payments
              </span>{" "}
              settled on-chain
            </p>
          </div>
        </div>

        {/* 2. Money Refused (STAR PRODUCT TILE) */}
        <div className="bg-gradient-to-br from-rose-950 to-zinc-900 rounded-xl border border-rose-900/50 p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 h-28 w-28 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <ShieldBan className="h-3.5 w-3.5 text-rose-400" />
              Money Refused ⭐
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              Protected
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
              ${metrics.blockedUsd}
            </div>
            <p className="text-xs text-rose-200/80 mt-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
              Unauthorized spend intercepted before blockchain
            </p>
          </div>
        </div>

        {/* 3. Blocked On-Chain (GOAL G2 TILE) */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Blocked On-Chain
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-600 tracking-tight font-mono">
              {metrics.blockedOnChainTxCount}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Goal G2: Zero failed txs or gas fees wasted
            </p>
          </div>
        </div>

        {/* 4. Guard Latency */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              P95 Guard Latency
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-zinc-900 tracking-tight font-mono">
              {metrics.p95GuardLatencyMs}ms
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Deterministic pre-flight evaluation
            </p>
          </div>
        </div>
      </div>

      {/* Decision Mix & Top Block Reasons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision Breakdown */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Decision Mix ({totalDecisions} Intents)
          </h3>
          <div className="mt-6 space-y-4">
            {/* ALLOW */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-zinc-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ALLOW (Settled)
                </span>
                <span className="font-mono font-bold text-zinc-900">
                  {metrics.decisions.allow}
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(metrics.decisions.allow / totalDecisions) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* HOLD */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-zinc-700">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  HOLD (Needs Review)
                </span>
                <span className="font-mono font-bold text-zinc-900">
                  {metrics.decisions.hold}
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(metrics.decisions.hold / totalDecisions) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* BLOCK */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-zinc-700">
                  <XCircle className="h-4 w-4 text-rose-500" />
                  BLOCK (Refused)
                </span>
                <span className="font-mono font-bold text-zinc-900">
                  {metrics.decisions.block}
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{
                    width: `${(metrics.decisions.block / totalDecisions) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Block Reasons List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Top Block Reasons (Enforcement Activity)
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                {metrics.decisions.block} intercepted intents
              </span>
            </div>

            <div className="mt-5 divide-y divide-zinc-100">
              {metrics.topBlockReasons.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {HUMAN_REASONS[item.code] || item.code}
                    </p>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      Code: {item.code}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono bg-rose-50 text-rose-700 border border-rose-200">
                      {item.count} {item.count === 1 ? "intent" : "intents"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-zinc-400" />
              Policy rules active on all agent payment requests
            </span>
            <span className="font-medium text-emerald-600">
              100% Pre-flight Enforcement
            </span>
          </div>
        </div>
      </div>

      {/* Decision Feed (⭐ The Demo's Centre of Gravity) */}
      <DecisionFeed limit={15} />
    </div>
  );
}
