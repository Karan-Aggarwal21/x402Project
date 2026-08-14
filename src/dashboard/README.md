# 🟩 UI - Dashboard division

> **Mission:** make the Guard's decisions *visible*. A judge with no context should watch the screen
> for ten seconds and understand that a payment was refused and no money moved.

| | |
|---|---|
| **Owner role** | `UI` (D3 Frontend in `Docs/DEVELOPMENT_PLAN.md`) |
| **Phases** | P4 |
| **Critical path** | ❌ No - but this is what the judges actually look at |
| **Blocked by** | **Nobody, ever.** MSW mocks + `db/seed.ts` from hour 0. |

> 👉 **Start here: [BUILD.md](./BUILD.md)** — checkpoints C1–C7, commit messages and the one-line
> swap from mocks to the real API. This README is the context; that file is the order of work.

---

## 1. What this division is about

Two audiences, one surface:

1. **Ops / security admin** - configure policies, watch spend, approve held payments, read the audit log.
2. **The judge in the demo** - see `ALLOW` / `HOLD` / `BLOCK` land live, with reasons, and see that a
   blocked payment has **no transaction hash**.

The single most important UI element in the whole project is the **live decision feed** with a red
`BLOCK` row that says *"no transaction created"*. Everything else supports that moment.

---

## 2. Folder map

| Path | What it does |
|---|---|
| `shell/shell.tsx` | Dashboard layout: sidebar + header. Rendered by `app/(dashboard)/layout.tsx`. |
| `shell/sidebar.tsx` `shell/header.tsx` | Navigation and the global "reset demo" button. |
| `pages/overview.tsx` | Spend today, decision counts, **"money refused"** tile, top block reasons. |
| `pages/agents-list.tsx` | All agents with budget utilisation and 24 h decision mix. |
| `pages/agent-detail.tsx` | Wallet, budget gauges, velocity headroom, recent decisions. |
| `pages/policy-editor.tsx` | Form + JSON view + validation errors + version history and diff. |
| `pages/transactions.tsx` | Filterable decision + settlement table. |
| `pages/transaction-detail.tsx` | Intent -> evaluation -> reasons -> risk signals -> tx hash -> explorer. |
| `pages/approvals.tsx` | HOLD inbox with a countdown and approve/reject. |
| `pages/merchants.tsx` | Allowlist, pinned recipients, trust level. |
| `pages/audit.tsx` | Audit stream + chain verification result. |
| `pages/simulator.tsx` | One button per demo scenario D1-D7. **The judge-facing page.** |
| `components/decision-feed.tsx` | ⭐ Live SSE stream of decisions. |
| `components/decision-badge.tsx` | 🟢 ALLOW / 🟡 HOLD / 🔴 BLOCK chip. |
| `components/reason-chip.tsx` | Error code -> human sentence. |
| `components/budget-gauge.tsx` `velocity-meter.tsx` | Utilisation visuals. |
| `components/policy-form.tsx` | The policy editor form, mirrors `PolicyRules`. |
| `components/tx-table.tsx` `tx-timeline.tsx` `agent-card.tsx` `approval-card.tsx` | Building blocks. |
| `charts/spend-area.tsx` `charts/decision-bar.tsx` | Recharts wrappers. |
| `hooks/useLiveDecisions.ts` | SSE subscription hook. |
| `api-client/client.ts` `endpoints.ts` | Typed fetch. **The only way this division talks to the server.** |
| `mock/handlers.ts` `mock/fixtures.ts` | MSW handlers copied verbatim from `API_DOCS.md` examples. |

---

## 3. Dependencies

| Direction | Detail |
|---|---|
| **Imports** | `@/shared/types` for types **only** |
| **Talks to the server** | Over HTTP, through `api-client/`. Never by importing server code. |
| **Never imports** | `@/core/*`, `@/payments/*`, `@/demo/*`, `db/*` - ESLint fails the build if you try |
| **Day-0 unblock** | `mock/handlers.ts` (MSW) then `pnpm db:seed` for real-shaped data at hour 2 |

**Why the hard rule:** importing server code into a client component leaks secrets into the browser
bundle. There is no exception worth making under this deadline.

---

## 4. Build order

| Order | Page | Why this order |
|---|---|---|
| 1 | Shell + Overview | Gives everyone something to look at, proves the mock layer works |
| 2 | Agents list + detail | Budget gauges are reused everywhere |
| 3 | **Decision feed** | The demo's centre of gravity - build it early, polish it twice |
| 4 | Transactions + detail | Where "no transaction created" is proven |
| 5 | Policy editor | Biggest single page; needs the version-diff API |
| 6 | Simulator page | Wire to DEMO's scenario endpoint |
| 7 | Approvals, merchants, audit | 🟡 nice to have, first to be cut |

---

## 5. Visual rules

| Decision | Colour | Must always show |
|---|---|---|
| 🟢 `ALLOW` | green | amount, merchant, **tx hash linked to BaseScan** |
| 🟡 `HOLD` | amber | amount, merchant, countdown to expiry |
| 🔴 `BLOCK` | red | amount, merchant, **reason chip**, and the words *"no transaction created"* |

Money is always rendered from the API's decimal string. Never parse it into a `number` in the browser.

---

## 6. Definition of done

- [ ] All six demo scenarios are readable end-to-end in the browser with no terminal open.
- [ ] A blocked row visibly states that no transaction was created.
- [ ] A new decision appears in the live feed within 2 seconds.
- [ ] The policy editor rejects an invalid policy with the server's own error message.
- [ ] Every page renders correctly against `mock/handlers.ts` with the API switched off.

