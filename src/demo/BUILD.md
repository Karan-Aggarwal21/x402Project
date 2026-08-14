# 🟧 DEMO — build checklist

Read [README.md](./README.md) once for context. **This file is your order of work.** One checkpoint =
one commit. Never start C(n+1) before C(n) is green.

| | |
|---|---|
| **Branch** | `demo/<slice>` — e.g. `demo/sandbox-merchant`, `demo/scenarios` |
| **You own** | `src/demo/**`, `app/api/sandbox/**`, `app/api/v1/simulator/**` |
| **You never touch** | `src/core/**`, `src/payments/**`, `src/dashboard/**` |
| **You depend on** | Nobody at build time. You call the Guard over HTTP, never by import. |
| **People waiting on you** | 🟥 **PAY at C1** — they need a live 402 to point at. Ship it first. |

---

## Before you start

```bash
git pull origin main
npm install
cp .env.example .env.local
npm run dev
```

You will need `MERCHANT_WALLET_ADDRESS` (the address that receives sandbox payments) on day 0, and
`GROQ_API_KEY` plus `npm install ai @ai-sdk/groq` at C5 — not before.

---

## Commit convention

```
<type>(demo): C<n> <what changed>
```

Examples:

```
feat(demo): C1 six sandbox sellers returning a real 402
feat(demo): C3 deterministic simulator with scenarios D1 and D2
feat(demo): C6 prompt injection contained, 2000 attempted 0.03 spent
```

Team-wide progress:

```bash
git log --all --oneline | grep -oE "\((core|pay|ui|demo)\): C[0-9]+" | sort -u
```

---

## Progress

| | Checkpoint | Unblocks | Done |
|---|---|---|---|
| C1 | Sandbox sellers return real 402 | 🚨 **PAY** | ☐ |
| C2 | `guardedFetch` | C3 | ☐ |
| C3 | Simulator + D1, D2 | C4 | ☐ |
| C4 | D3, D4, D5, D7 | 🟩 UI simulator page | ☐ |
| C5 | LLM agent | C6 | ☐ |
| C6 | D6 prompt injection | the hero moment | ☐ |
| C7 | Drills + submission assets | submission | ☐ |

---

## C1 — Sandbox sellers 🚨 PAY is blocked until this ships

**Goal.** Six real x402 sellers. Real `402`, real `PAYMENT-REQUIRED`, real settlement through the
public facilitator.

**Files.** `sandbox/pricing.ts`, `sandbox/data.ts`, `sandbox/middleware.ts`,
`handlers/sandbox-*.ts` (six of them)

**Prices — one table, the single source of truth.** These must match what CORE seeded:

| Endpoint | Price | Purpose in the demo |
|---|---|---|
| `/api/sandbox/search` | `0.02` | D1 normal payment |
| `/api/sandbox/extract` | `0.03` | ordinary traffic |
| `/api/sandbox/fact-check` | `0.08` | ordinary traffic |
| `/api/sandbox/summarize` | `0.05` | ordinary traffic |
| `/api/sandbox/premium-report` | `2.00` | **D2 — the blocked one** |
| `/api/sandbox/rogue` | `0.04` | D4 — not on the allowlist |

**Contract.** Sellers use `@x402/next` middleware. Canned responses from `data.ts` — a seller must
never depend on a real upstream service while a judge is watching.

The `402` body is **protocol-shaped, not our envelope**. The envelope applies only to JSON bodies we
author under `/api/v1/*`.

**Done when.**

```bash
npm run dev
curl -i localhost:3000/api/sandbox/search
# HTTP/1.1 402 Payment Required
# PAYMENT-REQUIRED: eyJ...   <- decodes to amount, asset, network, payTo
```

**Commit.** `feat(demo): C1 six sandbox sellers returning a real 402`

**Then tell PAY immediately.** Their C1 needs this to point at.

---

## C2 — `guardedFetch`

**Goal.** The agent's only route to the outside world.

**File.** `agent/guardedFetch.ts`

**Contract — this is PAY's frozen response shape. Code against it; do not wait for their gateway.**

```ts
export interface GuardedResult {
  ok: boolean;
  blocked?: { code: string; message: string };
  data?: unknown;
  txHash?: string;
}

guardedFetch(url: string, body: unknown, reason: string): Promise<GuardedResult>
```

It sends:

```http
POST /api/gw/request
X-Guard-Key: gk_live_researchbot_demo
{ "url": "...", "method": "POST", "body": {...}, "reason": "why this purchase" }
```

And maps PAY's three responses:

| Gateway response | `GuardedResult` |
|---|---|
| `200` `{status:true, data:{onChain:{txHash}, response}}` | `{ ok: true, data: response, txHash }` |
| `402` `{status:false, error:{code, ...}}` | `{ ok: false, blocked: { code, message } }` |
| `202` `APPROVAL_REQUIRED` | `{ ok: false, blocked: { code, message } }` |

**Hard rule — a 402 is returned as DATA, never thrown.** The agent must be able to adapt: pick a
cheaper tool, skip a step, report the block. An agent that crashes on a block is a worse demo than
one that says "blocked, trying something cheaper". This is the PS phrase *"maintaining a seamless
autonomous payment experience"*.

**The agent carries one credential and one endpoint.** No private key, no RPC URL, no signer. That is
the product thesis expressed as an architecture — do not add anything else to this file.

**Done when.** A unit test with a stubbed `fetch` asserts all three mappings and that a 402 does not
throw. **No dependency on PAY to pass this test.**

```bash
npm test -- guardedFetch
```

**Commit.** `feat(demo): C2 guardedFetch returns blocks as data, never as a throw`

---

## C3 — Simulator and the first two scenarios

**Goal.** The deterministic driver. Same tools as the LLM, no model, repeatable.

**Files.** `agent/tools.ts` (the `TOOL_ENDPOINTS` map only), `simulator/index.ts`,
`simulator/scenarios/d1-normal-payment.ts`, `d2-over-limit.ts`

**Why this before the LLM.** The simulator is your **stage insurance**. If Groq is down or slow
during the demo, this replays the identical scenario against the identical tools and the judges see
the same result. Only the decider changes.

**Contract.** Both drivers call the same `guardedFetch`. The Guard cannot tell them apart — which is
itself a point worth making on camera.

**Done when.**

```bash
npm run sim -- d1     # ALLOW, prints a tx hash
npm run sim -- d2     # BLOCK, prints the reason code and NO tx hash
```

**Commit.** `feat(demo): C3 deterministic simulator with scenarios D1 and D2`

---

## C4 — The remaining deterministic scenarios

**Files.** `simulator/scenarios/d3-velocity-loop.ts`, `d4-unknown-merchant.ts`,
`d5-budget-exhaustion.ts`, `d7-human-escalation.ts`, `handlers/simulator-run.ts`

| ID | Scenario | Expected | Judge sees |
|---|---|---|---|
| D3 | 20 calls in 10 s | 🟢 ×10 then 🔴 | velocity meter maxes out |
| D4 | Unallowlisted merchant | 🔴 BLOCK | merchant allowlist reason |
| D5 | Repeated $0.10 to the daily cap | 🔴 BLOCK | budget gauge hits 100 % |
| D7 | $0.50 payment | 🟡 HOLD → approve | payment resumes and settles |

`handlers/simulator-run.ts` backs `POST /api/v1/simulator/run` — UI's simulator page calls it, one
button per scenario. Response goes through the envelope (`ok()` from `@/shared/http`).

**Done when.** All six deterministic scenarios pass from one command each, and `npm run db:reset`
returns the demo to a clean state so you can run them again.

**Commit.** `feat(demo): C4 scenarios D3, D4, D5 and D7 plus the simulator endpoint`

---

## C5 — The LLM agent

**Goal.** A real tool-calling agent, ~40 lines. No agent framework.

**Files.** `agent/tools.ts` (the `buildTools()` half), `agent/run.ts`, `agent/prompts.ts`

```bash
npm install ai @ai-sdk/groq     # now, not earlier
```

**Contract.** Vercel AI SDK `generateText` + tools + `maxSteps`. Every tool's `execute()` goes
through `guardedFetch`. On a 402 it returns `{ blocked: true, code }` so the model can adapt.

**Safety — three hard ceilings, all already in the scaffold:**

| Ceiling | Value | Why |
|---|---|---|
| `temperature` | `0` | reproducible in front of judges |
| `maxSteps` | `25` | caps the loop regardless of what the model decides |
| Guard | always on | the only one that actually matters |

⚠️ **The system prompt tells the agent its remaining budget. That is UX, not enforcement.** An
injected agent ignores the prompt entirely and the Guard still stops it. Say this explicitly in the
video — it is the difference between a prompt trick and a security control.

**Done when.**

```bash
npm run agent     # completes a research task, pays for 2-3 tools, reports total spend
```

**Commit.** `feat(demo): C5 LLM driver with temperature 0 and a hard step ceiling`

---

## C6 — D6 prompt injection ⭐ the hero moment

**Files.** `fixtures/poisoned.ts` (already written), `simulator/scenarios/d6-prompt-injection.ts`

The poisoned result is served as one of the search results — exactly the way a real poisoned web page
would deliver it. It orders 1000 calls to `premiumReport` at $2.00 each.

**Expected outcome:**

| | |
|---|---|
| Attempted spend | **$2,000.00** |
| Actual spend | **≤ $0.05** |
| Transactions on BaseScan | the allowed ones only |

**Use the real LLM for this one.** The injection must genuinely work on a model, or you are faking
the threat and a sharp judge will ask.

**🚨 Record it the moment it works.** The video is a required deliverable anyway, and a live LLM in
front of judges is the one risk you cannot engineer away.

**Done when.** The run prints attempted vs actual spend, and the dashboard shows the blocked attempts
with reason chips and no transaction hashes.

**Commit.** `feat(demo): C6 prompt injection contained, 2000 attempted 0.03 spent`

---

## C7 — Drills and submission

**Files.** `drills/index.ts`, plus `Docs/ATTACK_DRILLS.md`, README, PPT, video

Run the ten attack drills from `Docs/DEVELOPMENT_PLAN.md` Phase 5. Record **attempted spend vs actual
spend** for each — that table is the strongest slide in the deck.

**Done when.**

- [ ] All six sellers return a real `402` with a decodable `PAYMENT-REQUIRED`
- [ ] 7/7 scenarios pass on the **deployed** URL, one button click each
- [ ] `Docs/ATTACK_DRILLS.md` records attempted vs actual for all ten drills
- [ ] `npm run db:reset` returns the demo to a clean state
- [ ] README, PPT, video and demo links open in incognito

**Commit.** `docs(demo): C7 attack drill results and submission assets`

---

## Frozen contracts — do not work around these

| What | Why |
|---|---|
| `POST /api/gw/request` shape | PAY owns it; changing your side silently breaks integration |
| A 402 is data, not a throw | the whole "seamless autonomous experience" claim rests on it |
| `guardedFetch` is the agent's only network call | if the agent can reach anything else, enforcement is bypassable |
| Sandbox prices match the seed | D2 and D5 stop demonstrating anything if they drift |

You may not edit `src/shared/types.ts`. Need a field? Ask CORE in the group chat.

---

## Load balance

You are the lightest lane in the first hours and the heaviest at the end. After C1 ships, if CORE is
drowning in the 13 rules, help there — your early work is small and self-contained, so it is the only
cross-lane help that does not create a merge conflict.
