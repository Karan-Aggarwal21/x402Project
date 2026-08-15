"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { AgentCard, type AgentItem } from "@/dashboard/components/agent-card";
import { DecisionBar } from "@/dashboard/charts/decision-bar";
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Coins,
} from "lucide-react";

/** What CORE actually serves — see toAgentDto in src/core/handlers/serialize.ts. */
interface AgentRow {
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

interface AgentsApiResponse {
  agents: AgentRow[];
  total: number;
}

// The card wants a flat shape; CORE groups the wallet. Reading agent.walletAddress off the raw
// row throws on .slice and takes the whole page down, so the flattening happens here on the way in.
// spentUsd and activePolicyVersion have no source on this endpoint — they live on
// /api/v1/budgets/:agentId and /api/v1/policies/:agentId. TODO(UI): fetch them or drop the tiles.
function toAgentItem(row: AgentRow): AgentItem {
  return {
    id: row.agentId,
    name: row.name,
    description: row.description,
    status: row.status,
    walletAddress: row.wallet.address,
    walletAllowanceCapUsd: row.wallet.allowanceCapUsd,
    walletFundedUsd: row.wallet.fundedUsd,
    spentUsd: "0.00",
    activePolicyId: row.activePolicyId,
    activePolicyVersion: 0,
    frozenAt: row.frozenAt ?? undefined,
    frozenReason: row.frozenReason ?? undefined,
    createdAt: row.createdAt,
  };
}

export function AgentsListPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        setLoading(true);
        const data = await apiGet<AgentsApiResponse>(API.agents);
        if (data?.agents) {
          setAgents(data.agents.map(toAgentItem));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agents");
      } finally {
        setLoading(false);
      }
    }

    loadAgents();
  }, []);

  const total = agents.length;
  const activeCount = agents.filter((a) => a.status === "ACTIVE").length;
  const frozenCount = agents.filter((a) => a.status === "FROZEN").length;
  const totalAllowance = agents
    .reduce((acc, a) => acc + (parseFloat(a.walletAllowanceCapUsd) || 0), 0)
    .toFixed(2);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
          <Bot className="h-6 w-6 text-zinc-700" />
          Autonomous Agents
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          Registered agent spenders governed by real-time policy rules, wallet allowances, and velocity limits.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agents */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Total Agents
          </span>
          <div className="text-2xl font-bold text-zinc-900 font-mono mt-2">
            {loading ? "..." : total}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Managed by gateway</p>
        </div>

        {/* Active Agents */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Active Agents
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
            {loading ? "..." : activeCount}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Operating within policy</p>
        </div>

        {/* Frozen Agents */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Frozen Agents
            </span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono mt-2">
            {loading ? "..." : frozenCount}
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">Rule 1: Frozen subject</p>
        </div>

        {/* Total Allowance Pool */}
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Total Allowance
            </span>
            <Coins className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 font-mono mt-2">
            ${totalAllowance}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Combined wallet caps</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-zinc-100 rounded-xl animate-pulse" />
          ))
        ) : (
          agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
        )}
      </div>

      {/* Decision Mix Comparison Chart */}
      <DecisionBar />
    </div>
  );
}
