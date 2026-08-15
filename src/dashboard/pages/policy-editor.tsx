"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet } from "@/dashboard/api-client/client";
import { API } from "@/dashboard/api-client/endpoints";
import { PolicyForm } from "@/dashboard/components/policy-form";
import type { Policy, PolicyRules } from "@/shared/types";
import { Shield, History, Code, GitCompare, CheckCircle2 } from "lucide-react";

interface PolicyVersionsResponse {
  versions: Policy[];
  total: number;
}

export function PolicyEditorPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || "agent_researchbot";

  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [versions, setVersions] = useState<Policy[]>([]);
  const [activeTab, setActiveTab] = useState<"form" | "json" | "history">("form");
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<number>(3);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      // This endpoint nests the policy under `policy`. Assigning the envelope leaves rules
      // undefined and the form silently shows its own defaults instead of the live policy.
      const [current, vers] = await Promise.all([
        apiGet<{ policy: Policy }>(API.policy(agentId)),
        apiGet<PolicyVersionsResponse>(API.policyVersions(agentId)),
      ]);
      if (current?.policy) setActivePolicy(current.policy);
      if (vers?.versions) {
        setVersions(vers.versions);
        setSelectedVersion(current?.policy?.version ?? 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, [agentId]);

  const targetVersionPolicy = versions.find((v) => v.version === selectedVersion) || activePolicy;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-zinc-700" />
            Policy Engine Editor
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Configure financial rules, merchant allowlists, velocity limits, and risk review bands for{" "}
            <span className="font-mono font-medium text-zinc-900">{agentId}</span>.
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-xs font-medium shadow-sm">
          <button
            onClick={() => setActiveTab("form")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "form" ? "bg-zinc-900 text-white font-semibold" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Visual Form
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "json" ? "bg-zinc-900 text-white font-semibold" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            JSON Schema
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "history" ? "bg-zinc-900 text-white font-semibold" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Version Diff ({versions.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === "form" && (
        <PolicyForm
          // initialRules only seeds the form's state on mount, and it arrives after the fetch.
          // Keying on the loaded version remounts the form once the real policy lands.
          key={activePolicy?.policyId ?? "loading"}
          agentId={agentId}
          initialRules={activePolicy?.rules}
          onVersionCreated={loadPolicy}
        />
      )}

      {activeTab === "json" && (
        <div className="bg-zinc-900 text-emerald-400 p-6 rounded-xl font-mono text-xs overflow-x-auto shadow-sm border border-zinc-800">
          <pre>{JSON.stringify(activePolicy?.rules || {}, null, 2)}</pre>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Version Selector Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Compare Against Active (v3):
            </span>
            <div className="flex items-center gap-2">
              {versions.map((v) => (
                <button
                  key={v.version}
                  onClick={() => setSelectedVersion(v.version)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    selectedVersion === v.version
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm font-bold"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  v{v.version} {v.isActive ? "(ACTIVE)" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Diff Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Version Selected */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 font-mono">
                    Version v{targetVersionPolicy?.version}
                  </h4>
                  <span className="text-xs text-zinc-400 font-mono">
                    Created: {targetVersionPolicy?.createdAt ? new Date(targetVersionPolicy.createdAt).toLocaleDateString() : "Historical"}
                  </span>
                </div>
                {targetVersionPolicy?.isActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Max Per Tx:</span>
                  <span className="font-bold text-zinc-900">${targetVersionPolicy?.rules?.financial?.maxPerTransactionUsd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Hourly Budget:</span>
                  <span className="font-bold text-zinc-900">${targetVersionPolicy?.rules?.financial?.hourlyBudgetUsd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Daily Budget:</span>
                  <span className="font-bold text-zinc-900">${targetVersionPolicy?.rules?.financial?.dailyBudgetUsd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Allowed Merchants:</span>
                  <span className="text-zinc-900 truncate max-w-[200px]">
                    {targetVersionPolicy?.rules?.merchant?.allowedMerchants?.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-50">
                  <span className="text-zinc-500">Velocity Limit:</span>
                  <span className="font-bold text-zinc-900">{targetVersionPolicy?.rules?.velocity?.maxTxPerMinute} tx/min</span>
                </div>
              </div>
            </div>

            {/* Current Active v3 */}
            <div className="bg-white rounded-xl border border-emerald-300/80 bg-emerald-50/10 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 font-mono">
                    Current Gateway Active (v3)
                  </h4>
                  <span className="text-xs text-zinc-400 font-mono">Live Rule Set</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  CURRENT
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-zinc-500">Max Per Tx:</span>
                  <span className="font-bold text-emerald-700">${activePolicy?.rules?.financial?.maxPerTransactionUsd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-zinc-500">Hourly Budget:</span>
                  <span className="font-bold text-emerald-700">${activePolicy?.rules?.financial?.hourlyBudgetUsd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-zinc-500">Daily Budget:</span>
                  <span className="font-bold text-emerald-700">${activePolicy?.rules?.financial?.dailyBudgetUsd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-zinc-500">Allowed Merchants:</span>
                  <span className="text-zinc-900 truncate max-w-[200px]">
                    {activePolicy?.rules?.merchant?.allowedMerchants?.join(", ")}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-50">
                  <span className="text-zinc-500">Velocity Limit:</span>
                  <span className="font-bold text-emerald-700">{activePolicy?.rules?.velocity?.maxTxPerMinute} tx/min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
