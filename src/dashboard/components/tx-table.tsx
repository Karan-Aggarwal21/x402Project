"use client";

import { useState } from "react";
import Link from "next/link";
import { DecisionBadge } from "@/dashboard/components/decision-badge";
import { ReasonChip } from "@/dashboard/components/reason-chip";
import type { LiveDecisionItem } from "@/dashboard/hooks/useLiveDecisions";
import { Search, ExternalLink, ArrowRight, ShieldX, Clock } from "lucide-react";

/** OWNER: UI · Transaction list. Blocked rows render a dash where the tx hash would be. */
export function TxTable({
  transactions,
  loading = false,
}: {
  transactions: LiveDecisionItem[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<string>("ALL");
  const [selectedAgent, setSelectedAgent] = useState<string>("ALL");

  const filtered = transactions.filter((t) => {
    if (selectedDecision !== "ALL" && t.decision !== selectedDecision) {
      return false;
    }
    if (selectedAgent !== "ALL") {
      if (selectedAgent === "ResearchBot" && t.agentId !== "agent_researchbot") return false;
      if (selectedAgent === "DataBot" && t.agentId !== "agent_databot") return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchMerchant = t.merchant.toLowerCase().includes(q);
      const matchId = t.intentId?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q);
      const matchReason = t.reasons?.some((r) => r.code.toLowerCase().includes(q) || r.message.toLowerCase().includes(q));
      const matchResource = t.resource?.toLowerCase().includes(q);
      if (!matchMerchant && !matchId && !matchReason && !matchResource) return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
      {/* Filters Bar */}
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter by merchant, intent ID, or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Decision Filter */}
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-medium">
            {["ALL", "ALLOW", "HOLD", "BLOCK"].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDecision(d)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedDecision === d
                    ? "bg-white text-zinc-900 shadow-sm font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Agent Filter */}
          <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-medium">
            {["ALL", "ResearchBot", "DataBot"].map((a) => (
              <button
                key={a}
                onClick={() => setSelectedAgent(a)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedAgent === a
                    ? "bg-white text-zinc-900 shadow-sm font-semibold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Decision</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Merchant & Resource</th>
              <th className="py-3 px-4">Agent</th>
              <th className="py-3 px-4">Enforcement / Reason</th>
              <th className="py-3 px-4">On-Chain Tx</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4 text-right">Detail</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 text-zinc-700">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="py-4 px-4">
                    <div className="h-6 bg-zinc-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400">
                  No transactions match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const targetId = t.intentId || t.id;
                const isAllow = t.decision === "ALLOW";
                const isBlock = t.decision === "BLOCK";
                const isHold = t.decision === "HOLD";
                const primaryReason = t.reasons?.[0];

                return (
                  <tr
                    key={targetId}
                    className={`hover:bg-zinc-50/80 transition-colors ${
                      isBlock ? "bg-rose-50/15" : isHold ? "bg-amber-50/15" : ""
                    }`}
                  >
                    {/* Decision */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <DecisionBadge decision={t.decision} />
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-zinc-900 text-sm">
                      ${t.amountUsd}
                    </td>

                    {/* Merchant & Resource */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-medium text-zinc-900 truncate" title={t.merchant}>
                        {t.merchant}
                      </div>
                      {t.resource && (
                        <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5" title={t.resource}>
                          {t.resource}
                        </div>
                      )}
                    </td>

                    {/* Agent */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {t.agentName || t.agentId}
                      </span>
                    </td>

                    {/* Reason / Policy match */}
                    <td className="py-3.5 px-4 max-w-[240px]">
                      {isBlock && primaryReason ? (
                        <ReasonChip code={primaryReason.code} message={primaryReason.message} />
                      ) : isHold ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          <Clock className="h-3 w-3" />
                          Pending Review Band
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[11px] font-mono">
                          {t.matchedRules?.slice(0, 1).join(", ") || "Policy compliant"}
                        </span>
                      )}
                    </td>

                    {/* On-Chain Tx Hash */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isAllow && t.txHash ? (
                        <a
                          href={`https://sepolia.basescan.org/tx/${t.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-mono text-[11px] hover:underline"
                        >
                          <span>{t.txHash.slice(0, 6)}...{t.txHash.slice(-4)}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : isBlock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <ShieldX className="h-3 w-3 text-rose-500" />
                          — no tx —
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-mono text-[11px]">— pending —</span>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 text-[11px]">
                      {new Date(t.createdAt).toLocaleTimeString()}
                    </td>

                    {/* Detail Link */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/transactions/${targetId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500 px-4">
        <span>
          Showing {filtered.length} of {transactions.length} transactions
        </span>
        <span className="font-mono text-zinc-400">Deterministic Audit Ledger</span>
      </div>
    </div>
  );
}
