# OnboardSync — Associate Onboarding Platform

A full-stack web app for managing new hire onboarding. Associates are assigned to cohorts and 4 supervisors (Director, Manager, Team Lead, Senior Mentor). Each supervisor must complete a check-in for each of 6 onboarding phases: Pre-Start, First Day, Week 1, Week 2, Week 3, Week 4.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/onboarding run dev` — run the frontend (port 23165)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, TanStack Query, Wouter routing, shadcn/ui
- API: Express 5 (shared `artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (v3), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/` — Drizzle tables: cohorts, supervisors, associates, checkins
- `artifacts/api-server/src/routes/` — Express route handlers per domain
- `artifacts/onboarding/src/` — React frontend

## Architecture decisions

- `type: number` used in OpenAPI spec for all integer fields — Orval 8.x generates `zod.int()` for `type: integer` which is a Zod v4 feature; the workspace uses Zod v3 (`^3.25.76`) which only has `z.number().int()`.
- Check-ins are pre-created for each associate (all 24 per associate: 6 phases × 4 roles), then completed over time — this makes the grid display and progress tracking straightforward.
- Dashboard aggregates (summary, cohort view, pending list) are implemented as dedicated read-only endpoints rather than client-side computation.

## Product

- **Dashboard** (`/`) — completion rate, pending check-ins requiring action, cohort progress glance
- **Cohorts** (`/cohorts`, `/cohorts/:id`) — manage cohorts; detail shows phase × associate completion matrix
- **Associates** (`/associates`, `/associates/:id`) — manage associates with supervisor assignments; detail shows phase × supervisor check-in grid with click-to-complete
- **Supervisors** (`/supervisors`, `/supervisors/:id`) — manage supervisors by role; detail shows their assigned check-ins
- **Check-ins** (`/checkins`) — global audit view of all check-ins, filterable by phase and status

## User preferences

_Populate as needed._

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking any artifact — stale declarations cause false "not exported" errors.
- After changing `lib/api-spec/openapi.yaml`, always re-run codegen before touching any route or frontend code.
- Do NOT use `type: integer` in the OpenAPI spec — use `type: number` instead (Orval + Zod v3 compatibility).
