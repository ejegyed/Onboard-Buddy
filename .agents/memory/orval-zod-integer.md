---
name: Orval + Zod v3 integer type compatibility
description: Using `type: integer` in OpenAPI spec causes Orval 8.x to generate `zod.int()` which only exists in Zod v4, breaking typecheck with Zod v3.
---

## The rule
Use `type: number` for all integer fields in `lib/api-spec/openapi.yaml`. Never use `type: integer` or `type: ["integer", "null"]`.

**Why:** Orval 8.x generates `zod.int()` for OpenAPI `type: integer` fields. This method is a Zod v4 feature. The workspace catalog pins `zod: ^3.25.76` (v3), which only has `z.number().int()`. The generated `lib/api-zod/src/generated/api.ts` file uses `import * as zod from 'zod'`, and `zod.int` is `undefined` in v3, causing a `TS2339` error during `pnpm run typecheck:libs`.

**How to apply:** Any time you write or update `lib/api-spec/openapi.yaml`, replace `type: integer` with `type: number` and `type: ["integer", "null"]` with `type: ["number", "null"]`. Run codegen after every spec change.
