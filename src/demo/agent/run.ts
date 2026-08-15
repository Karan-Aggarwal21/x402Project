// OWNER: DEMO. The LLM driver: generateText + tools + a hard step ceiling. No agent framework.
// RUN: npm run agent — needs GROQ_API_KEY and AGENT_WALLET_PRIVATE_KEY in .env.local.
import { generateText, stepCountIs } from "ai";
import { groq } from "@ai-sdk/groq";
import { buildTools, type ToolCallRecord } from "@/demo/agent/tools";
import { SYSTEM_PROMPT } from "@/demo/agent/prompts";
import { env } from "@/shared/env";
import { formatUsd, toMinor } from "@/shared/money";

// temperature 0 + stepCountIs cap: the loop is bounded regardless of what the model decides.
export const AGENT_CONFIG = { maxSteps: 25, temperature: 0 } as const;

const TASK =
  "Research EV battery recycling: search for current capacity data, verify the key figure, " +
  "then summarise the findings. Buy the premium report only if you judge it essential.";

// Declared, not fetched: the budget line is UX. Enforcement is the Guard's, and it is always on.
const SESSION_BUDGET_USD = "1.00";

async function main() {
  if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing from .env.local");

  const calls: ToolCallRecord[] = [];
  const tools = buildTools((record) => {
    calls.push(record);
    console.log(`[agent] ${record.status} ${record.tool} ($${record.priceUsd})${record.txHash ? ` tx ${record.txHash}` : ""}${record.code ? ` — ${record.code}` : ""}`);
  });

  const { text, steps } = await generateText({
    model: groq("openai/gpt-oss-120b"),
    system: SYSTEM_PROMPT,
    prompt: `${TASK}\n\nBudget remaining: $${SESSION_BUDGET_USD}.`,
    tools,
    temperature: AGENT_CONFIG.temperature,
    stopWhen: stepCountIs(AGENT_CONFIG.maxSteps),
  });

  const paid = calls.filter((c) => c.status === "PAID");
  const blocked = calls.filter((c) => c.status === "BLOCKED");
  const spent = calls.reduce((sum, c) => sum + (c.status === "PAID" ? toMinor(c.priceUsd) : 0n), 0n);

  console.log("\n[agent] --- final answer ---");
  console.log(text);
  console.log(`[agent] steps: ${steps.length} (ceiling ${AGENT_CONFIG.maxSteps}), tools: ${calls.length}`);
  console.log(`[agent] paid: ${paid.map((c) => `${c.tool} $${c.priceUsd}`).join(", ") || "none"}`);
  if (blocked.length) console.log(`[agent] blocked: ${blocked.map((c) => `${c.tool} ${c.code}`).join(", ")}`);
  console.log(`[agent] total spent: ${formatUsd(spent)} of $${SESSION_BUDGET_USD}`);
}

const invokedDirectly = process.argv[1]?.endsWith("run.ts");
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
