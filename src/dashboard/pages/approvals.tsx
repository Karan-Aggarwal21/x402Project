"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { ApprovalCard } from "@/dashboard/components/approval-card";
import type { LiveDecisionItem } from "@/dashboard/hooks/useLiveDecisions";
import { ShieldAlert, Clock, CheckCircle2 } from "lucide-react";

interface ApprovalsResponse {
  approvals: LiveDecisionItem[];
  total: number;
}

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<LiveDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadApprovals() {
      try {
        setLoading(true);
        const data = await apiGet<ApprovalsResponse>(API.approvals);
        if (data?.approvals) {
          setApprovals(data.approvals);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load approvals");
      } finally {
        setLoading(false);
      }
    }

    loadApprovals();
  }, []);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-sans">
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5" />
          </div>
          Approval Inbox (HOLD Queue)
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Transactions falling within human review bands requiring operator sign-off before settlement.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Approvals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))
        ) : approvals.length === 0 ? (
          <div className="col-span-2 p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400">
            No pending approvals in queue.
          </div>
        ) : (
          approvals.map((item) => (
            <ApprovalCard key={item.intentId || item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}
