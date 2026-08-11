/** OWNER: UI · 🟢 ALLOW / 🟡 HOLD / 🔴 BLOCK chip. Colours come from tailwind.config.ts. */
import type { Decision } from "@/shared/types";

export function DecisionBadge({ decision }: { decision: Decision }) {
  void decision;
  return <span>{/* TODO */}</span>;
}

