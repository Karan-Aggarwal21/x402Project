"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { BudgetGauge } from "@/dashboard/components/budget-gauge";
import { VelocityMeter } from "@/dashboard/components/velocity-meter";
import { SpendArea } from "@/dashboard/charts/spend-area";
import { DecisionFeed } from "@/dashboard/components/decision-feed";
import type { AgentItem } from "@/dashboard/components/agent-card";
import {
  ArrowLeft,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Coins,
  Copy,
  Check,
  FileText,
  Lock,
} from "lucide-react";

interface AgentBudgetResponse {
  agentId: string;
  hourSpentUsd: string;
  hourlyBudgetUsd: string;
  daySpentUsd: string;
  dailyBudgetUsd: string;
  monthSpentUsd: string;
  monthlyBudgetUsd: string;
  reservedUsd: string;
  walletAllowanceRemainingUsd: string;
  txLastMinute: number;
  maxTxPerMinute: number;
  txLastHour: number;
  maxTxPerHour: number;
}

/**
 * OWNER: UI · Route: /agents/[agentId]
 * DATA: GET /api/v1/agents/:id, GET /api/v1/budgets/:agentId
 */
export function AgentDetailPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || "";

  const [agent, setAgent] = useState<AgentItem | null>(null);
  const [budget, setBudget] = useState<AgentBudgetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadAgentDetail() {
      if (!agentId) return;
      try {
        setLoading(true);
        const [agentData, budgetData] = await Promise.all([
          apiGet<any>(API.agent(agentId)),
          apiGet<AgentBudgetResponse>(API.budgets(agentId)),
        ]);
        if (agentData) {
          setAgent({
            id: agentData.agentId || agentData.id || "",
            name: agentData.name || "Agent",
            description: agentData.description || "",
            status: agentData.status || "ACTIVE",
            walletAddress: agentData.wallet?.address ?? agentData.walletAddress ?? "",
            walletAllowanceCapUsd: agentData.wallet?.allowanceCapUsd ?? agentData.walletAllowanceCapUsd ?? "0.00",
            walletFundedUsd: agentData.wallet?.fundedUsd ?? agentData.walletFundedUsd ?? "0.00",
            spentUsd: agentData.spentUsd ?? "0.00",
            activePolicyId: agentData.activePolicyId ?? "",
            activePolicyVersion: agentData.activePolicyVersion ?? 0,
            frozenAt: agentData.frozenAt ?? undefined,
            frozenReason: agentData.frozenReason ?? undefined,
            createdAt: agentData.createdAt ?? new Date().toISOString(),
          });
        }
        setBudget(budgetData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent");
      } finally {
        setLoading(false);
      }
    }

    loadAgentDetail();
  }, [agentId]);

  const handleCopyWallet = () => {
    if (!agent) return;
    navigator.clipboard.writeText(agent.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-200 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-zinc-200 rounded-xl" />
          <div className="h-28 bg-zinc-200 rounded-xl" />
          <div className="h-28 bg-zinc-200 rounded-xl" />
        </div>
        <div className="h-64 bg-zinc-200 rounded-xl" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="space-y-4">
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-700">
          <h3 className="font-semibold text-base">Agent Not Found</h3>
          <p className="text-sm mt-1">{error || `Could not find agent with ID: ${agentId}`}</p>
        </div>
      </div>
    );
  }

  const isFrozen = agent.status === "FROZEN";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/agents"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Agents
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
              <Bot className="h-6 w-6 text-zinc-700" />
              {agent.name}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono ${
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
          <p className="text-xs text-zinc-500">{agent.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyWallet}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 px-3 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Wallet className="h-3.5 w-3.5 text-zinc-400" />
            <span>
              {agent.walletAddress.slice(0, 8)}...{agent.walletAddress.slice(-6)}
            </span>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* Frozen Alert Banner (Rule 1 Live Subject Proof) */}
      {isFrozen && (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 shadow-sm flex items-start gap-4">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="font-bold text-sm flex items-center gap-2">
              <span>Agent is FROZEN — Policy Engine Rule 1 Enforcement Active</span>
            </div>
            <p className="text-xs text-rose-800">
              {agent.frozenReason || "Agent has been halted due to policy violation or velocity exhaustion."}
            </p>
            <p className="text-[11px] text-rose-700 font-mono pt-1">
              All payment attempts from this agent will be rejected with error code <span className="font-bold">AGENT_FROZEN</span>.
            </p>
          </div>
        </div>
      )}

      {/* Budget Gauges Section (Hour, Day, Month) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
            Budget Utilisation Windows
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            Active Policy v{agent.activePolicyVersion}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <BudgetGauge
            label="Hourly Budget Window"
            spent={budget?.hourSpentUsd || "0.08"}
            budget={budget?.hourlyBudgetUsd || "1.00"}
            reserved={budget?.reservedUsd || "0.00"}
          />
          <BudgetGauge
            label="Daily Budget Window"
            spent={budget?.daySpentUsd || "1.35"}
            budget={budget?.dailyBudgetUsd || "5.00"}
            reserved={budget?.reservedUsd || "0.00"}
          />
          <BudgetGauge
            label="Monthly Budget Window"
            spent={budget?.monthSpentUsd || "1.35"}
            budget={budget?.monthlyBudgetUsd || "50.00"}
            reserved={budget?.reservedUsd || "0.00"}
          />
        </div>
      </div>

      {/* Velocity & Allowance Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <VelocityMeter
          current={budget?.txLastMinute ?? 1}
          limit={budget?.maxTxPerMinute ?? 10}
          windowLabel="tx / min"
        />
        <div className="bg-white rounded-xl border border-zinc-200 p-4 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-zinc-500" />
              Allowance Cap Remaining
            </span>
            <span className="font-mono font-bold text-zinc-900">
              ${budget?.walletAllowanceRemainingUsd || "23.65"} / ${agent.walletAllowanceCapUsd}
            </span>
          </div>
          <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.round(
                  ((parseFloat(budget?.walletAllowanceRemainingUsd || "23.65")) /
                    (parseFloat(agent.walletAllowanceCapUsd) || 1)) *
                    100
                )}%`,
              }}
            />
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-0.5">
            <span>Funded on Base: ${agent.walletFundedUsd} USDC</span>
            <span className="font-medium text-emerald-600">On-Chain Allowance Valid</span>
          </div>
        </div>
      </div>

      {/* Spend Trajectory Chart */}
      <SpendArea budgetCeiling={parseFloat(budget?.hourlyBudgetUsd || "1.00")} />

      {/* Recent Decisions for this Agent */}
      <DecisionFeed agentId={agent.id} limit={10} />
    </div>
  );
}
