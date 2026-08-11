# 🟥 PAY - Payments division

> **Mission:** own every line of code between "the merchant said 402" and "the money settled on
> Base Sepolia" - and make sure nothing gets signed unless CORE said `ALLOW`.

| | |
|---|---|
| **Owner role** | `PAY` (D1 Payments Lead in `Docs/DEVELOPMENT_PLAN.md`) |
| **Phases** | P0 (x402 proof of concept), P3 (gateway + signer), P6 (production deploy) |
| **Critical path** | ✅ Yes. Nothing demoable exists until this division works. |
| **Blocked by** | Nobody. Uses `@/core/mock` on day 0. |

---

## 1. What this division is about

x402 turns an HTTP request into a payment negotiation:

```
GET /resource        -> 402 + PAYMENT-REQUIRED (amount, asset, network, payTo)
retry + PAYMENT-SIGNATURE  -> server /verify + /settle via the facilitator
                           -> 200 + PAYMENT-RESPONSE (tx hash)
```

**Our product inserts itself between step 1 and step 2** - after the price is known, before anything
irreversible happens. That insertion point is this division's entire job.

The second job is just as important: **the agent must never hold the private key.** The signer lives
here, behind the Guard. Enforcement an agent can skip is not enforcement.

---

## 2. Folder map

| Path | What it does |
|---|---|
| `x402/adapter.ts` | ⭐ **The only file in the repo allowed to `import "@x402/*"`.** If the SDK surface differs from the docs, exactly one file changes. |
| `x402/headers.ts` | Encode/decode `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE` (base64 JSON). |
| `x402/facilitator.ts` | Types for the facilitator `/verify` + `/settle` contract, plus a mock for tests. |
| `intent/build.ts` | `PAYMENT-REQUIRED` -> canonical `PaymentIntent`. Resolves the merchant from the request host. |
| `intent/hash.ts` | Canonical `intentHash` - what binds the signer to the exact approved fields. |
| `wallet/signer.ts` | Verifies the `allowToken`, re-checks every field, then signs. Refuses anything else. |
| `wallet/allowToken.ts` | HMAC token minted on `ALLOW`. Single-use, 60 s TTL, bound to `intentHash`. |
| `wallet/balance.ts` | RPC balance reads for the agent wallet. |
| `gateway/orchestrator.ts` | ⭐ The main flow: forward -> 402 -> evaluate -> sign -> retry -> settle -> commit. |
| `gateway/forward.ts` | Proxies the agent's original request; strips `X-Guard-*`, `Authorization`, `PAYMENT-*`. |
| `handlers/gw-request.ts` | Route handler body for `POST /api/gw/request`. |
| `mock/index.ts` | Fake signer + fake facilitator so CORE and DEMO can run without a chain. |
| `scripts/poc-x402.ts` | **Phase 0 spike.** Prove a real payment settles before writing product code. |
| `scripts/fund-wallet.ts` | Create/fund the Base Sepolia wallet, print balances. |
| `tests/` | Header codecs against real P0 captures; signer tamper + replay tests. |
| `index.ts` | Public API. The only surface other divisions may import. |

---

## 3. Public API (what other divisions may import)

```ts
import { runGuardedRequest, signPaymentPayload, buildIntentFromRequirements } from "@/payments";
```

Everything else is internal. If someone needs a new export, add it to `index.ts` deliberately.

---

## 4. Dependencies

| Direction | Detail |
|---|---|
| **Imports** | `@/shared/*` (types, money, env) and `@/core` (the `evaluate` / `reserve` / `commit` / `release` public API) |
| **Imported by** | `app/api/gw/*` only |
| **Never imports** | `@/core/policy/*` internals, `@/dashboard/*`, `@/demo/*` |
| **Day-0 unblock** | Import `@/core/mock` instead of `@/core`. Its `evaluate()` returns `ALLOW`. Swap one import line when CORE ships. |

---

## 5. Phase 0 - do this first, before anything else

x402 is the only dependency the team does not control. Prove it in the first four hours.

1. Scaffold + Vercel + push the stub tree (unblocks everyone else).
2. Create the Base Sepolia wallet, fund test ETH + test USDC.
3. Ask DEMO for `/api/sandbox/search` returning a real `402`.
4. `pnpm poc:x402` must print a real transaction hash.
5. Write the true header shapes into `Docs/x402-notes.md`.
6. **Screenshot the BaseScan transaction. It goes on PPT slide 4.**

🚨 If this is not green by hour 4, escalate: CORE pairs in and everyone else keeps working on mocks.

---

## 6. Security rules this division owns

| Rule | Where enforced |
|---|---|
| The agent never receives a private key or an RPC URL | `handlers/gw-request.ts` response shape |
| The signer refuses any payload that differs from the approved intent | `wallet/signer.ts` |
| `allowToken` is single-use, 60 s TTL, HMAC-bound to `intentHash` | `wallet/allowToken.ts` |
| Every failure path releases the budget reservation | `gateway/orchestrator.ts` |
| Blocked payments are never signed and never sent | `gateway/orchestrator.ts` |

---

## 7. Definition of done

- [ ] Allowed payment returns `200` with a real `txHash` and an explorer URL.
- [ ] Blocked payment returns `402` with `onChain.signed === false` and no transaction on BaseScan.
- [ ] Verify-fail, settle-fail, timeout and 402-on-retry each release the reservation.
- [ ] A tampered intent is refused by the signer (test proves it).
- [ ] Rate limiting returns `429`, distinct from a policy `402 VELOCITY_EXCEEDED`.

