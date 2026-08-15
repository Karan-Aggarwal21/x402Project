/**
 * OWNER: UI
 * WHAT: MSW handlers providing a complete fake API for development and testing.
 *       All responses follow the mandatory API envelope: { status, statusCode, data }.
 */
import { http, HttpResponse } from "msw";
import {
  metricsSummary,
  agents,
  budgets,
  policies,
  transactions,
  approvals,
  merchants,
  auditLogs,
} from "@/dashboard/mock/fixtures";

export const handlers = [
  // 1. Metrics summary
  http.get("*/api/v1/metrics/summary", () => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: metricsSummary,
    });
  }),

  // 2. Agents list
  http.get("*/api/v1/agents", () => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        agents,
        total: agents.length,
      },
    });
  }),

  // 3. Agent detail
  http.get("*/api/v1/agents/:id", ({ params }) => {
    const agent = agents.find((a) => a.id === params.id);
    if (!agent) {
      return HttpResponse.json(
        {
          status: false,
          statusCode: 404,
          message: `Agent ${params.id} not found`,
          error: { code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: agent,
    });
  }),

  // 4. Budgets for agent
  http.get("*/api/v1/budgets/:agentId", ({ params }) => {
    const budget = budgets[params.agentId as string] || budgets.agent_researchbot;
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: budget,
    });
  }),

  // 5. Policies for agent
  http.get("*/api/v1/policies/:agentId", ({ params }) => {
    const policy = policies.find((p) => p.agentId === params.agentId && p.isActive);
    if (!policy) {
      return HttpResponse.json(
        {
          status: false,
          statusCode: 404,
          message: `Active policy for agent ${params.agentId} not found`,
          error: { code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: policy,
    });
  }),

  // 6. Policy versions for agent
  http.get("*/api/v1/policies/:agentId/versions", ({ params }) => {
    const agentPolicies = policies.filter((p) => p.agentId === params.agentId);
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        versions: agentPolicies,
        total: agentPolicies.length,
      },
    });
  }),

  // 7. Create/Update policy version (with server validation)
  http.post("*/api/v1/policies", async ({ request }) => {
    const body = (await request.json()) as any;
    const maxPerTx = parseFloat(body?.rules?.financial?.maxPerTransactionUsd);
    const hourly = parseFloat(body?.rules?.financial?.hourlyBudgetUsd);

    if (maxPerTx > hourly) {
      return HttpResponse.json(
        {
          status: false,
          statusCode: 400,
          message: `Invalid policy: maxPerTransactionUsd ($${maxPerTx}) cannot exceed hourlyBudgetUsd ($${hourly}).`,
          error: { code: "INVALID_POLICY_RULES" },
        },
        { status: 400 }
      );
    }

    const newVersion = {
      policyId: `pol_${Date.now()}`,
      agentId: body?.agentId || "agent_researchbot",
      version: (policies.length || 3) + 1,
      isActive: true,
      rules: body?.rules || {},
      createdByEmail: "admin@aspg.dev",
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: newVersion,
    });
  }),

  // 8. Transactions list
  http.get("*/api/v1/transactions", ({ request }) => {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId");
    const decision = url.searchParams.get("decision");

    let filtered = [...transactions];
    if (agentId) {
      filtered = filtered.filter((t) => t.agentId === agentId);
    }
    if (decision) {
      filtered = filtered.filter((t) => t.decision.toLowerCase() === decision.toLowerCase());
    }

    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        transactions: filtered,
        total: filtered.length,
      },
    });
  }),

  // 9. Transaction detail
  http.get("*/api/v1/transactions/:id", ({ params }) => {
    const tx = transactions.find((t) => t.id === params.id || t.intentId === params.id);
    if (!tx) {
      return HttpResponse.json(
        {
          status: false,
          statusCode: 404,
          message: `Transaction ${params.id} not found`,
          error: { code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: tx,
    });
  }),

  // 10. Approvals list & actions
  http.get("*/api/v1/approvals", () => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        approvals,
        total: approvals.length,
      },
    });
  }),

  http.post("*/api/v1/approvals/:id/approve", ({ params }) => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        approvalId: params.id,
        status: "APPROVED",
        txHash: `0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd2001299`,
        settledAt: new Date().toISOString(),
      },
    });
  }),

  http.post("*/api/v1/approvals/:id/reject", ({ params }) => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        approvalId: params.id,
        status: "REJECTED",
        rejectedAt: new Date().toISOString(),
      },
    });
  }),

  // 11. Simulator run endpoint
  http.post("*/api/v1/simulator/run", async ({ request }) => {
    const body = (await request.json()) as any;
    const scenario = body?.scenario || "D1";

    const results: Record<string, any> = {
      D1: {
        scenario: "D1",
        decision: "ALLOW",
        amountUsd: "0.02",
        merchant: "localhost:3000",
        txHash: "0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd2001201",
        latencyMs: 19,
        riskScore: 6,
        message: "Ordinary payment allowed and settled on Base Sepolia.",
      },
      D2: {
        scenario: "D2",
        decision: "BLOCK",
        amountUsd: "2.00",
        merchant: "localhost:3000",
        txHash: null,
        reasonCode: "PER_TRANSACTION_LIMIT_EXCEEDED",
        message: "Amount $2.00 exceeds per-transaction ceiling ($0.10). No transaction created.",
        latencyMs: 14,
        riskScore: 42,
      },
      D3: {
        scenario: "D3",
        decision: "BLOCK",
        amountUsd: "0.06",
        merchant: "localhost:3000",
        txHash: null,
        reasonCode: "VELOCITY_EXCEEDED",
        message: "11 requests in 60s tripped 10 tx/min velocity ceiling. No transaction created.",
        latencyMs: 16,
        riskScore: 48,
      },
      D4: {
        scenario: "D4",
        decision: "BLOCK",
        amountUsd: "0.09",
        merchant: "rogue.example.com",
        txHash: null,
        reasonCode: "MERCHANT_BLOCKED",
        message: "rogue.example.com is on blocklist. No transaction created.",
        latencyMs: 12,
        riskScore: 88,
      },
      D5: {
        scenario: "D5",
        decision: "BLOCK",
        amountUsd: "0.30",
        merchant: "localhost:3000",
        txHash: null,
        reasonCode: "BUDGET_EXCEEDED",
        message: "DataBot hourly budget saturated ($0.50 / $0.50). No transaction created.",
        latencyMs: 15,
        riskScore: 33,
      },
      D6: {
        scenario: "D6",
        decision: "HOLD",
        amountUsd: "0.45",
        merchant: "localhost:3000",
        txHash: null,
        reasonCode: "APPROVAL_REQUIRED",
        message: "$0.45 falls into review band ($0.10-$1.00). Sent to approval inbox.",
        latencyMs: 21,
        riskScore: 38,
      },
      D7: {
        scenario: "D7",
        decision: "BLOCK",
        amountUsd: "2000.00",
        merchant: "localhost:3000",
        txHash: null,
        reasonCode: "ABSOLUTE_BLOCK_THRESHOLD",
        message: "Prompt injection attempted $2,000.00. Blocked by absolute ceiling. No transaction created.",
        latencyMs: 12,
        riskScore: 100,
      },
    };

    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: results[scenario] || results.D1,
    });
  }),

  // 12. Merchants
  http.get("*/api/v1/merchants", () => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        merchants,
        total: merchants.length,
      },
    });
  }),

  // 13. Audit log & audit verify
  http.get("*/api/v1/audit", () => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        entries: auditLogs,
        total: auditLogs.length,
      },
    });
  }),

  http.get("*/api/v1/audit/verify", () => {
    return HttpResponse.json({
      status: true,
      statusCode: 200,
      data: {
        valid: true,
        checkedRows: auditLogs.length,
        headHash: auditLogs[auditLogs.length - 1]?.rowHash ?? "GENESIS",
      },
    });
  }),
];

export { metricsSummary, agents, budgets, policies, transactions, approvals, merchants, auditLogs };