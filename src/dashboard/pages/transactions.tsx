"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { TxTable } from "@/dashboard/components/tx-table";
import type { LiveDecisionItem } from "@/dashboard/hooks/useLiveDecisions";
import {
  ArrowLeftRight,
  ShieldCheck,
  ShieldBan,
  Clock,
  DollarSign,
} from "lucide-react";

interface TransactionsApiResponse {
  transactions: LiveDecisionItem[];
  total: number;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<LiveDecisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        const data = await apiGet<TransactionsApiResponse>(API.transactions);
        if (data?.transactions) {
          setTransactions(data.transactions);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const total = transactions.length;
  const allowCount = transactions.filter((t) => t.decision === "ALLOW").length;
  const blockCount = transactions.filter((t) => t.decision === "BLOCK").length;
  const holdCount = transactions.filter((t) => t.decision === "HOLD").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
          <ArrowLeftRight className="h-6 w-6 text-zinc-700" />
          Transactions & Decisions
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Historical audit ledger of autonomous payment intents, policy evaluations, and on-chain settlements.
        </p>
      </div>

      {/* Stat Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Total Intents
          </span>
          <div className="text-2xl font-bold text-zinc-900 font-mono mt-2">
            {loading ? "..." : total}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Evaluated by policy engine</p>
        </div>

        {/* Settled */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Settled (ALLOW)
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
            {loading ? "..." : allowCount}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Executed on Base Sepolia</p>
        </div>

        {/* Blocked */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Intercepted (BLOCK)
            </span>
            <ShieldBan className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-2">
            {loading ? "..." : blockCount}
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">0 gas spent on-chain</p>
        </div>

        {/* Held */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Held (HOLD)
            </span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-2">
            {loading ? "..." : holdCount}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Awaiting human review</p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tx Table */}
      <TxTable transactions={transactions} loading={loading} />
    </div>
  );
}
