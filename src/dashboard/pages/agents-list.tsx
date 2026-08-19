"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { AgentCard, toAgentItem, type AgentItem, type AgentRow } from "@/dashboard/components/agent-card";
import { DecisionBar } from "@/dashboard/charts/decision-bar";
import { CreateAgentModal } from "@/dashboard/components/create-agent-modal";
import {
  Bot,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Coins,
} from "lucide-react";

interface AgentsApiResponse {
  agents: AgentRow[];
  total: number;
}

export function AgentsListPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Bumped after a create so the list refetches without a page reload.
  const [reloadToken, setReloadToken] = useState(0);

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
  }, [reloadToken]);

  const total = agents.length;
  const activeCount = agents.filter((a) => a.status === "ACTIVE").length;
  const frozenCount = agents.filter((a) => a.status === "FROZEN").length;
  const totalAllowance = agents
    .reduce((acc, a) => acc + (parseFloat(a.walletAllowanceCapUsd) || 0), 0)
    .toFixed(2);

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3 font-sans">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            Autonomous Agents
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Registered agent spenders governed by real-time policy rules, wallet allowances, and velocity limits.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Register agent
        </button>
      </div>

      {creating && (
        <CreateAgentModal
          onClose={() => setCreating(false)}
          onCreated={() => setReloadToken((n) => n + 1)}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Agents */}
        <div className="bg-white rounded-[22px] border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Agents
          </span>
          <div className="text-3xl sm:text-[34px] font-extrabold text-slate-900 tracking-tight font-sans mt-2">
            {loading ? "..." : total}
          </div>
          <p className="text-xs text-slate-400 mt-1">Managed by gateway</p>
        </div>

        {/* Active Agents */}
        <div className="bg-white rounded-[22px] border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Active Agents
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl sm:text-[34px] font-extrabold text-emerald-600 tracking-tight font-sans mt-2">
            {loading ? "..." : activeCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Operating within policy</p>
        </div>

        {/* Frozen Agents */}
        <div className="bg-white rounded-[22px] border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              Frozen Agents
            </span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-3xl sm:text-[34px] font-extrabold text-rose-600 tracking-tight font-sans mt-2">
            {loading ? "..." : frozenCount}
          </div>
          <p className="text-xs text-rose-600 font-semibold mt-1">Rule 1: Frozen subject</p>
        </div>

        {/* Total Allowance Pool */}
        <div className="bg-white rounded-[22px] border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Total Allowance
            </span>
            <Coins className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-3xl sm:text-[34px] font-extrabold text-slate-900 tracking-tight font-sans mt-2">
            ${totalAllowance}
          </div>
          <p className="text-xs text-slate-400 mt-1">Combined wallet caps</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[22px] animate-pulse" />
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
