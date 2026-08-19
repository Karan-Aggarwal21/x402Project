"use client";

import Link from "next/link";
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Wallet,
  Lock,
  Zap,
} from "lucide-react";

export interface AgentItem {
  id: string;
  name: string;
  description: string;
  status: "ACTIVE" | "FROZEN";
  /** Null until a wallet is attached. A freshly registered agent has none. */
  walletAddress: string | null;
  walletAllowanceCapUsd: string;
  walletFundedUsd: string;
  spentUsd: string;
  activePolicyId: string;
  activePolicyVersion: number;
  frozenAt?: string;
  frozenReason?: string;
  createdAt: string;
}

/** What CORE actually serves — see toAgentDto in src/core/handlers/serialize.ts. */
export interface AgentRow {
  agentId: string;
  name: string;
  description: string;
  status: "ACTIVE" | "FROZEN";
  activePolicyId: string;
  wallet: { address: string; network: string; allowanceCapUsd: string; fundedUsd: string };
  frozenAt?: string | null;
  frozenReason?: string | null;
  createdAt: string;
}

// The cards want a flat shape; CORE groups the wallet. Reading agent.walletAddress off the raw row
// throws on .slice and takes the whole page down, so the flattening happens on the way in.
// spentUsd has no source on the agents endpoints — it lives on /api/v1/budgets/:agentId.
export function toAgentItem(row: AgentRow, activePolicyVersion = 0): AgentItem {
  return {
    id: row.agentId,
    name: row.name,
    description: row.description,
    status: row.status,
    walletAddress: row.wallet.address ?? null,
    walletAllowanceCapUsd: row.wallet.allowanceCapUsd,
    walletFundedUsd: row.wallet.fundedUsd,
    spentUsd: "0.00",
    activePolicyId: row.activePolicyId,
    activePolicyVersion,
    frozenAt: row.frozenAt ?? undefined,
    frozenReason: row.frozenReason ?? undefined,
    createdAt: row.createdAt,
  };
}

/** OWNER: UI · Agent summary card: status, wallet, budget bar, 24h decision mix. */
export function AgentCard({ agent }: { agent: AgentItem }) {
  const isFrozen = agent.status === "FROZEN";
  const spent = parseFloat(agent.spentUsd) || 0;
  const cap = parseFloat(agent.walletAllowanceCapUsd) || 1;
  const percent = Math.min(100, Math.round((spent / cap) * 100));

  return (
    <div
      className={`bg-white rounded-xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
        isFrozen
          ? "border-rose-300 bg-rose-50/10"
          : "border-zinc-200"
      }`}
    >
      <div className="p-6 space-y-4">
        {/* Header: Name + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isFrozen
                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {isFrozen ? <Lock className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 flex items-center gap-2">
                {agent.name}
              </h3>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${
              isFrozen
                ? "bg-rose-100 text-rose-800 border border-rose-300"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            {isFrozen ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                FROZEN
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                ACTIVE
              </>
            )}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-zinc-600 line-clamp-2">{agent.description}</p>

        {/* Frozen Alert Box if applicable */}
        {isFrozen && agent.frozenReason && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <span className="font-semibold">Frozen Reason:</span> {agent.frozenReason}
          </div>
        )}

        {/* Wallet & Policy */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-zinc-400" />
              Wallet:
            </span>
            <span className="font-mono text-zinc-800 font-medium">
              {agent.walletAddress
                ? `${agent.walletAddress.slice(0, 6)}...${agent.walletAddress.slice(-4)}`
                : "not attached"}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-500">
            <span>Active Policy:</span>
            <span className="font-mono text-zinc-800 font-bold">
              v{agent.activePolicyVersion}
            </span>
          </div>
        </div>

        {/* Budget Gauge Mini */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 font-medium">Allowance Used:</span>
            <span className="font-mono font-bold text-zinc-900">
              ${agent.spentUsd} / ${agent.walletAllowanceCapUsd} ({percent}%)
            </span>
          </div>
          <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isFrozen || percent >= 100
                  ? "bg-rose-500"
                  : percent >= 75
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="p-3 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between px-6 text-xs">
        <span className="text-zinc-400 font-mono">
          Funded: ${agent.walletFundedUsd} USDC
        </span>
        <Link
          href={`/agents/${agent.id}`}
          className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
