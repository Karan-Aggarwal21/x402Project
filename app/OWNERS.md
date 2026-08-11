# `app/` - the thin routing shell

**Owner: shared. Created once at hour 0, then effectively frozen.**

Every file in this folder is a 2-line re-export. No business logic, no data access, no JSX beyond a
single component reference. All real code lives in `src/<division>/`.

```ts
// app/api/v1/payments/evaluate/route.ts
export { POST } from "@/core/handlers/payments";
```

## Why

Four developers adding endpoints would otherwise collide in the same files. Here, each route file is
owned by exactly one division and never changes again after it is created.

## Ownership of the re-export files

| Path | Points at | Owner |
|---|---|---|
| `app/(dashboard)/**` | `@/dashboard/pages/*` | UI |
| `app/api/gw/**` | `@/payments/handlers/*` | PAY |
| `app/api/v1/**` | `@/core/handlers/*` | CORE |
| `app/api/v1/simulator/**` | `@/demo/handlers/*` | DEMO |
| `app/api/sandbox/**` | `@/demo/handlers/*` | DEMO |

## Rules

1. If you are writing logic in `app/`, you are in the wrong folder.
2. `app/layout.tsx` and `app/globals.css` belong to UI. PAY, CORE and DEMO never touch them.
3. Adding an endpoint = create the 2-line file here + the handler in your own division.
4. Route handlers that sign, use the DB or call an RPC must declare `export const runtime = "nodejs"`.

