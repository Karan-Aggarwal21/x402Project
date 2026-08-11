/**
 * OWNER: UI
 * ⭐ The most important component in the project. Live SSE stream of decisions.
 * A BLOCK row must show the reason AND the words "no transaction created".
 */
export function DecisionFeed({ agentId }: { agentId?: string }) {
  void agentId;
  return <ul>{/* TODO: subscribe via useLiveDecisions */}</ul>;
}

