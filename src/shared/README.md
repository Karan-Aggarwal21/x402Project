# `src/shared/` - frozen contracts

**Owner: everyone, by protocol. Frozen at hour 0 + 0:45 by CORE.**

The only folder every division is allowed to import. It contains the shared vocabulary and nothing
else: no business logic, no I/O, no framework code.

| File | What | Editable by |
|---|---|---|
| `types.ts` | `PaymentIntent`, `EvaluationResult`, `Decision`, `PolicyRules`, `Reason` | CORE only, after a group ack |
| `errors.ts` | The 24 error codes from `API_DOCS.md` section 2.5 | append-only |
| `money.ts` | `bigint` minor-unit helpers. USDC has 6 decimals. | CORE |
| `ids.ts` | Prefixed ULIDs: `agt_`, `pol_`, `int_`, `evl_`, ... | CORE |
| `http.ts` | Tiny JSON response helpers used by every route handler | CORE |
| `env.ts` | Typed environment access, fails fast at boot | PAY |

## Change protocol

Changing `types.ts` breaks all four divisions at once. Therefore:

1. Post the proposed change in the group chat.
2. Wait for three acks.
3. CORE commits it alone, in a single-purpose commit.
4. Everyone pulls immediately.

Anything else is a merge conflict waiting to happen.

## Hard rules

- **Money is `bigint` minor units.** `$0.05 USDC` is `50000n`. Never a float, never a `number`.
- Nothing in this folder may import from `@/core`, `@/payments`, `@/dashboard` or `@/demo`.
- Nothing in this folder may touch the database, the network or the clock.

