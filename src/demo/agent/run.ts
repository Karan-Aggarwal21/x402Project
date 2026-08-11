/**
 * OWNER: DEMO
 * WHAT: The LLM driver. Vercel AI SDK generateText + tools + maxSteps. No agent framework.
 * RUN:  pnpm agent
 * SAFETY: temperature 0 and maxSteps 25 cap the loop regardless of what the model decides.
 */

export const AGENT_CONFIG = { maxSteps: 25, temperature: 0 } as const;

async function main() {
  // generateText({ model: groq("openai/gpt-oss-120b"), tools: buildTools(), ...AGENT_CONFIG })
  throw new Error("NOT_IMPLEMENTED: agent run");
}

main().catch((e) => { console.error(e); process.exit(1); });

