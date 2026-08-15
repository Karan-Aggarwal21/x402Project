"use client";

import { useState, useEffect } from "react";
import { apiPost } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { DecisionBadge } from "@/dashboard/components/decision-badge";
import type { LiveDecisionItem } from "@/dashboard/hooks/useLiveDecisions";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

/** OWNER: UI · 🟡 HOLD item with a live countdown to the 5 minute TTL. */
export function ApprovalCard({
  item,
  onResolved,
}: {
  item: LiveDecisionItem;
  onResolved?: (id: string, status: "APPROVED" | "REJECTED") => void;
}) {
  const id = item.intentId || item.id;
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(300);

  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? `0${s}` : s}`;
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiPost(API.approve(id));
      setStatus("APPROVED");
      if (onResolved) onResolved(id, "APPROVED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiPost(API.reject(id));
      setStatus("REJECTED");
      if (onResolved) onResolved(id, "REJECTED");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 space-y-4 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-extrabold font-mono text-zinc-900">
            ${item.amountUsd}
          </div>
          <span className="text-xs font-mono text-zinc-400">USDC</span>
          <DecisionBadge decision="HOLD" />
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md border font-semibold ${
            secondsRemaining < 60
              ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>TTL: {formatCountdown(secondsRemaining)}</span>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-zinc-600">
          <span>Agent:</span>
          <span className="font-mono font-medium text-zinc-900">{item.agentName || "ResearchBot"}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-600">
          <span>Merchant:</span>
          <span className="font-medium text-zinc-900">{item.merchant}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-600">
          <span>Band:</span>
          <span className="font-medium text-amber-800">
            {item.reasons?.[0]?.message || `$${item.amountUsd} falls in $0.10–$1.00 review band`}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {status ? (
        <div
          className={`p-3 rounded-lg text-center text-xs font-bold font-mono ${
            status === "APPROVED"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {status === "APPROVED" ? "✓ PAYMENT APPROVED & BROADCAST" : "✕ PAYMENT REJECTED"}
        </div>
      ) : (
        <div className="pt-2 flex items-center gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {loading ? "Signing..." : "Approve & Settle"}
          </button>

          <button
            onClick={handleReject}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      )}
    </article>
  );
}
