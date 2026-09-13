# Operational Realtime Refresh Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make MesaFácil operational order panels refresh automatically when customer orders or order items change.

**Architecture:** Enable Supabase Postgres Changes Realtime for `tenant_customer_orders` and `tenant_customer_order_items`, then add a small client component that subscribes to tenant-scoped events and calls `router.refresh()` with debounce. Keep all data reads server-side and tenant-filtered; the client only receives change notifications through authenticated Supabase Realtime/RLS.

**Tech Stack:** Next.js App Router, Supabase Realtime, TypeScript, Vitest, SQL migrations.

---

### Task 1: Add tested Realtime helper

**Objective:** Centralize channel names, event filtering and debounce constants for order panels.

**Files:**
- Create: `src/lib/realtime/order-events.ts`
- Create: `src/lib/realtime/order-events.test.ts`

**Steps:**
1. Write RED tests for tenant channel naming, table relevance, tenant match and debounce value.
2. Implement helper with no browser dependencies.
3. Run: `npm test -- src/lib/realtime/order-events.test.ts`

### Task 2: Enable Realtime publication for order tables

**Objective:** Ensure Supabase emits changes for order headers and order items.

**Files:**
- Create: `supabase/migrations/20260913102000_enable_order_realtime.sql`
- Create: `supabase/tests/realtime_order_publication.sql`

**Steps:**
1. Create idempotent migration adding `public.tenant_customer_orders` and `public.tenant_customer_order_items` to `supabase_realtime` only when absent.
2. Create SQL test that asserts both tables are in `pg_publication_tables`.
3. Run test before migration for expected failure if not enabled; apply migration; run again for pass.

### Task 3: Add client refresh subscriber

**Objective:** Refresh `/pedidos` and `/cozinha` automatically without duplicating data-fetching logic.

**Files:**
- Create: `src/components/orders/order-realtime-refresh.tsx`
- Modify: `src/components/orders/orders-list.tsx`

**Steps:**
1. Add `'use client'` subscriber using `createClient()` from browser Supabase client, `useRouter()`, and `setTimeout` debounce.
2. Subscribe to `postgres_changes` for both relevant tables with `filter: tenant_id=eq.<tenantId>`.
3. Render a small status badge: `Tempo real ativo` / `Reconectando atualizações`.
4. Include the component in `OrdersList` header.

### Task 4: Verify and review

**Objective:** Prove no regression before deploy.

**Commands:**
- `npm test`
- `npm run lint`
- `npm run build`
- `supabase db lint --linked`
- `supabase db query --linked --file supabase/tests/realtime_order_publication.sql`
- Independent code review before commit/deploy.

### Task 5: Ship carefully

**Objective:** Publish only after verification.

**Notes:**
- GitHub push is currently blocked by credential, so local commits may stay ahead of origin.
- Vercel deploy can still publish production from local verified source if approved/needed.
