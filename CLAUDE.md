@AGENTS.md

# x402project — code rules

Project docs live outside this repo in [`../Docs/`](../Docs/). Division docs live in
`src/<division>/README.md`. Project-level rules live in [`../CLAUDE.md`](../CLAUDE.md).
This file holds the **code conventions** for everything inside `x402project/`.

---

## 1. API response envelope — mandatory, no exceptions

**Every** API response from **every** endpoint uses this envelope. No bare objects, no bare arrays.

### Success

```json
{
  "status": true,
  "statusCode": 200,
  "data": { }
}
```

### Error

```json
{
  "status": false,
  "statusCode": 402,
  "message": "Transaction amount $2.00 exceeds the per-transaction limit of $0.10.",
  "error": {
    "code": "PER_TRANSACTION_LIMIT_EXCEEDED",
    "details": { "requested": "2.00", "limit": "0.10" }
  }
}
```

| Field | Type | Present when | Notes |
|---|---|---|---|
| `status` | `boolean` | always | `true` on 2xx, `false` on 4xx/5xx |
| `statusCode` | `number` | always | must equal the actual HTTP status |
| `data` | `object \| array` | success | the payload. `null` when there is nothing to return |
| `message` | `string` | errors; optional on success | human-readable, safe to show a user |
| `error.code` | `string` | errors | from `src/shared/errors.ts`, SCREAMING_SNAKE_CASE |
| `error.details` | `object` | optional | machine-readable context |

### How to comply

Never build a `Response` by hand. Use the helpers — they are the single enforcement point:

```ts
import { ok, fail, notImplemented } from "@/shared/http";

export async function GET() {
  const agents = await listAgents();
  return ok({ agents, total: agents.length });        // -> { status, statusCode, data }
}

export async function POST() {
  return fail("PER_TRANSACTION_LIMIT_EXCEEDED", { requested: "2.00", limit: "0.10" });
}
```

Rules:
- `ok(data, statusCode?)` for every success. `fail(code, details?, message?)` for every error.
- `statusCode` in the body always matches the HTTP status of the response.
- Doc examples in [`../Docs/API_DOCS.md`](../Docs/API_DOCS.md) show the **`data` payload only** —
  wrap them in this envelope when you implement.
- The `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` headers are protocol-defined and
  are **not** wrapped. The envelope applies to JSON bodies we author.
- The frontend reads `res.data`. It never reads a top-level field other than `status` / `message`.

---

## 2. Naming conventions

| Thing | Case | Example |
|---|---|---|
| Variables, functions, methods, object keys | `camelCase` | `dailyBudgetMinor`, `evaluatePayment()` |
| JSON request and response fields | `camelCase` | `intentId`, `riskScore`, `txHash` |
| Types, interfaces, React components, classes | `PascalCase` | `PaymentIntent`, `DecisionFeed` |
| Constants and enum-like literal maps | `SCREAMING_SNAKE_CASE` | `ERROR_CODES`, `USDC_DECIMALS` |
| Error codes and event types | `SCREAMING_SNAKE_CASE` | `BUDGET_EXCEEDED`, `PAYMENT_SETTLED` |
| Database tables and columns | `snake_case` | `payment_intents`, `amount_minor` |
| Files: modules, utilities | `camelCase.ts` | `allowToken.ts`, `guardedFetch.ts` |
| Files: React components and pages | `kebab-case.tsx` | `decision-feed.tsx`, `agent-detail.tsx` |
| Folders | `kebab-case` | `api-client/`, `attack-drills/` |
| Route segments | `kebab-case` | `/api/v1/payments/evaluate` |
| Branches | `role/slice` | `core/budget-ledger` |

Drizzle maps `snake_case` columns to `camelCase` fields. The DB is the only place snake_case appears.

### Naming quality

- Say what it **is**, not what it does mechanically: `remainingDailyBudgetMinor`, not `calcVal`.
- Booleans read as a question: `isFrozen`, `hasActivePolicy`, `canSettle`.
- Async functions that fetch are `get*` / `list*`; ones that mutate are `create*` / `update*` /
  `reserve*` / `commit*` / `release*`.
- Money variables **always** end in `Minor` when they are `bigint` base units: `amountMinor`.
  A money name without the suffix means a decimal display string. This prevents the worst bug class
  in the project.
- No invented abbreviations. `evaluation`, not `eval`; `request`, not `req` (except the framework's
  own handler parameter); `configuration`, not `cfg`.

---

## 3. Comments

Write code that does not need explaining, then explain only what the code cannot say.

**Do:**
- One short file header — what the file is and who owns it. Two lines maximum.
- One line above a non-obvious decision, explaining **why**, never **what**.
- `// TODO(owner): …` for a real, tracked gap.

**Do not:**
- Multi-line banner blocks, ASCII art, or section dividers inside implementation files.
- Comments restating the code (`// loop over agents` above a loop over agents).
- Commented-out code. Delete it — git remembers.
- JSDoc on every function. Add it only to exported public APIs where the signature is not enough.

```ts
// Good — explains why, once.
// Advisory lock is per-agent so two agents never contend for the same budget row.
await tx.execute(sql`select pg_advisory_xact_lock(${agentIdHash})`);

// Bad — restates the code and will rot.
/**
 * This function reserves budget.
 * It takes an agent id, an intent id and an amount.
 * Then it inserts a ledger row.
 */
```

**About the scaffold:** the stub files currently carry a 3–5 line header describing the file's
purpose. That is scaffolding for the team handoff. **When you implement a file, cut its header to
two lines and delete the TODO comment blocks.** Do not add new long headers.

---

## 4. Code style, briefly

- TypeScript `strict`. No `any` anywhere in the money path (`src/core/policy`, `src/core/budget`,
  `src/payments/wallet`). Prefer `unknown` and narrow it.
- Validate every request body with Zod at the route boundary. Trust nothing from an agent.
- Route handlers stay thin: validate → call a lib function → wrap in `ok()`. No business logic.
- Money is `bigint` minor units end to end. A `number` never touches a monetary value.
- No default exports except React pages and layouts, which Next requires.
- Named exports everywhere else, so imports are greppable.
- Errors thrown inside the money path must fail closed. See [`../CLAUDE.md`](../CLAUDE.md) rule 2.
