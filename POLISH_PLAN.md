## 1. Current Architecture

### Route Map (`app/`)

- `app/layout.tsx`
  - **Does:** Root layout, global styles, Clerk provider, top-right auth controls, Vercel Analytics.
  - **Gating:** None (layout-level UI only).
  - **Issues/Gaps:** Only global metadata is set; no per-route metadata. Includes `generator: "v0.app"` (`app/layout.tsx`).

- `app/page.tsx`
  - **Does:** Landing page composition using `components/landing/*`.
  - **Gating:** Public.
  - **Issues/Gaps:** No route metadata export.

- `app/pricing/page.tsx`
  - **Does:** Pricing cards and checkout links.
  - **Gating:** Public view; unauthenticated users are sent to `/sign-in` on checkout click.
  - **Issues/Gaps:** Uses non-null env assertions for variants (`app/pricing/page.tsx`).

- `app/game/layout.tsx`
  - **Does:** Intended gate for `/game`.
  - **Gating:** **Currently disabled**. Auth + entitlement checks are commented (`app/game/layout.tsx`).
  - **Issues/Gaps:** Commercially critical route is not protected.

- `app/game/page.tsx`
  - **Does:** Full 3-site game orchestrator (phase flow, timer, results).
  - **Gating:** Depends on `app/game/layout.tsx` (currently disabled).
  - **Issues/Gaps:** No in-page fallback gating if layout guard stays off.

- `app/solver/page.tsx`
  - **Does:** Solver shell rendering `SeawolfSolver`.
  - **Gating:** None currently.
  - **Issues/Gaps:** Should likely be entitlement-gated for paid tier.

- `app/simulator/page.tsx`
  - **Does:** Standalone simulation route (legacy-style all-in-one simulator).
  - **Gating:** Public.
  - **Issues/Gaps:** Very large route component; maintainability risk.

- `app/simulator/profiling/page.tsx`
  - **Does:** Standalone Phase 1 simulator.
  - **Gating:** Public.
  - **Issues/Gaps:** Completion contains disabled “See Results” control.

- `app/simulator/categorization/page.tsx`
  - **Does:** Standalone categorization + review simulator.
  - **Gating:** Public.
  - **Issues/Gaps:** Completion also has disabled “See Results”.

- `app/simulator/phase2/page.tsx`
  - **Does:** Standalone prospect pool simulator.
  - **Gating:** Public.
  - **Issues/Gaps:** Explicit placeholder results copy (“will be implemented next”).

- `app/api/webhooks/lemonsqueezy/route.ts`
  - **Does:** Lemon Squeezy webhook verification + Supabase upserts.
  - **Gating:** API endpoint.
  - **Issues/Gaps:** Non-timing-safe signature compare, no parse guard, non-null secret assertion (`app/api/webhooks/lemonsqueezy/route.ts`).

- `app/globals.css`
  - **Does:** Global styling.
  - **Gating:** N/A.

- `app/simulator/types.ts`
  - **Does:** Standalone simulator-local types.
  - **Gating:** N/A.

### Components Map (`components/`)

- `components/game/GamePhase0Panel.tsx` — Review panel (site 2/3), reassign/confirm flow.
- `components/game/GamePhase1ProfilingPanel.tsx` — Phase 1 profile selection.
- `components/game/GamePhase2Panel.tsx` — Categorization flow + review mode.
- `components/game/GamePhase3PoolPanel.tsx` — Prospect pool rounds.
- `components/game/GamePhase4TreatmentPanel.tsx` — Treatment selection from pool.
- `components/game/GameResultsFull.tsx` — Full post-game report.
- `components/game/GameHelpModal.tsx` — Help modal content + section nav.

- `components/seawolf-solver.tsx` — Main solver experience for `/solver`.
- `components/app-sidebar.tsx` — Sidebar shell (appears dashboard-oriented, currently placeholder/hardcoded identity).
- `components/theme-provider.tsx` — Theme context wrapper.

- Landing section components:
  - `components/landing/announcement-banner.tsx`
  - `components/landing/navbar.tsx`
  - `components/landing/hero.tsx`
  - `components/landing/trust-badges.tsx`
  - `components/landing/social-proof.tsx` (currently returns `null`)
  - `components/landing/how-it-works.tsx`
  - `components/landing/features.tsx`
  - `components/landing/pricing.tsx`
  - `components/landing/faq.tsx`
  - `components/landing/footer.tsx`

- UI primitives (`components/ui/*`): full shadcn-style primitive set (accordion, dialog, drawer, toast, table, form, sidebar, etc.). Good foundation but inconsistently used in game/landing surfaces.

### Library Map (`lib/`)

- `lib/game-types.ts` — canonical game data contracts and constants.
- `lib/game-scoring.ts` — core phase scoring + aggregates (primary scoring source of truth).
- `lib/game-scoring.test.ts` — test coverage for scorer behavior.
- `lib/game-helpers.ts` — orchestration helpers, dev shortcuts, formatting, scenario chain builder, results helpers.
- `lib/game-visuals.tsx` — reusable game visuals and UI helper components.
- `lib/behavioural-scoring.ts` — supplemental behavioural score computation.
- `lib/access.ts` — entitlement check against Supabase purchases.
- `lib/checkout.ts` — Lemon Squeezy checkout URL builder.
- `lib/utils.ts` — utility (`cn`) helper.

### Utilities / Middleware / Config

- `utils/supabase/admin.ts` — admin client using secret key.
- `utils/supabase/client.ts` — browser client helper (**contains duplicate code block**).
- `utils/supabase/server.ts` — server client helper (**contains duplicate code block**).
- `utils/supabase/middleware.ts` — session refresh helper; appears currently unused.
- `proxy.ts` — Clerk middleware with `/game` matcher, but protection call commented.
- `next.config.mjs` — `typescript.ignoreBuildErrors: true`, `images.unoptimized: true`.
- `package.json` — Next 16 + React 19 + Clerk + Supabase + Vercel Analytics + Vitest.

### Public Data / Assets (`public/`)

- Data JSONs: `scenarios.json`, `pools.json`, `phase2_pools.json`, `categorization_pools.json`.
- Data generation scripts + mirrored datasets in `public/data-gen/` (python generators/validators + JSONs).
- Static assets: `icon.svg`, placeholders.

---

## 2. What's Working Well

- Core gameplay architecture is modular and readable: phase panels are separated and orchestrated centrally in `app/game/page.tsx`.
- Scoring logic is strongly typed and centralized in `lib/game-scoring.ts`, with tests in `lib/game-scoring.test.ts`.
- Clear data model definitions in `lib/game-types.ts`.
- Webhook-to-database purchase flow exists end-to-end (`app/api/webhooks/lemonsqueezy/route.ts` + `utils/supabase/admin.ts`).
- Landing page composition is clean and easy to iterate (`app/page.tsx` + `components/landing/*`).
- Reusable UI primitive library is already present (`components/ui/*`), reducing future implementation cost.
- Help modal system now exists and is reusable across game phases (`components/game/GameHelpModal.tsx`).

---

## 3. Bugs & Broken Things

- **Route protection is effectively broken/off**
  - `/game` gating logic is commented in `app/game/layout.tsx`.
  - Middleware protection call is commented in `proxy.ts`.

- **Production dev-mode bypass risk**
  - `DEV_MODE` is `true` in `lib/game-helpers.ts`, exposing skip paths in the game flow.

- **Results display mismatch in Phase 4**
  - In `components/game/GameResultsFull.tsx`, “Your score” line in the optimal-combination section uses `s.phase4.optimalScore` instead of actual player score.

- **Webhook hardening gaps**
  - Signature compare uses direct string equality (`app/api/webhooks/lemonsqueezy/route.ts`), not timing-safe compare.
  - `JSON.parse` has no try/catch safety; malformed payload can 500.
  - Secret uses non-null assertion; missing env can fail hard.

- **Duplicate Supabase utility definitions**
  - `utils/supabase/client.ts` and `utils/supabase/server.ts` each contain duplicated implementations in the same file.

- **Solver condition-label correctness risk**
  - `components/seawolf-solver.tsx` uses indexed trait labels in one section instead of selected desired/undesired traits, which can desync labels from actual scenario selection.

- **Standalone simulator placeholders still visible**
  - `app/simulator/phase2/page.tsx` has placeholder results copy.
  - `app/simulator/profiling/page.tsx` and `app/simulator/categorization/page.tsx` include disabled “See Results” controls.

---

## 4. Missing Features & Pages

- **Missing logged-in dashboard / practice hub**
  - No post-login “home” for purchased users (progress/history/re-entry point).

- **Free tier route not separated**
  - Product mentions free tier, but no dedicated ungated “free run/demo” productized route exists.

- **Game result persistence**
  - Full game results are session-local; no Supabase persistence for runs, site breakdowns, or trends.

- **Auth/purchase edge flow gaps**
  - No enforced gating currently for `/game`.
  - `/solver` appears ungated despite paid-tier positioning.
  - No robust “no-access” UX (e.g., upgrade prompt with clear entitlement checks).

- **Missing app-level error/loading boundaries**
  - No `app/**/loading.tsx`, `error.tsx`, or `not-found.tsx`.

- **SEO baseline missing**
  - No per-route metadata strategy.
  - No sitemap route (`sitemap.ts`), no robots route (`robots.ts`), no OG image route.

- **Legal pages missing**
  - Footer links point to `/privacy`, `/terms`, `/refund-policy`, but route pages are not present.

- **Cookie consent missing**
  - No consent banner/preferences manager despite analytics + commercial flows.

---

## 5. Polish & UX Issues

- **Visual consistency / IA drift**
  - Mixed branding labels (“SeaWolfPrep”, placeholder company naming in sidebar).
  - Landing sections and game surfaces feel like different design systems in places.

- **Responsive/mobile gaps**
  - Game panels rely on large absolute-positioned side cards and fixed-width layouts; likely cramped/overlapping on smaller screens.
  - Solver UI has dense/fixed structures that need dedicated mobile treatment.

- **Copy quality / unfinished copy**
  - Placeholder/dev copy still present in simulators and some landing sections.
  - Some instructional text is strong, but tone consistency varies across routes.

- **Loading/empty/error state consistency**
  - Core game and solver flows generally lack unified loading/empty/error components, despite existing UI primitives for this.

- **DEV_MODE left on**
  - `lib/game-helpers.ts` has `DEV_MODE = true` (critical polish and release risk).

---

## 6. Infrastructure Gaps

- **Analytics**
  - Only Vercel Analytics is present; no product analytics/event funnel instrumentation (phase drop-off, conversion steps, purchase funnel).

- **Error monitoring**
  - No Sentry (or equivalent) integration for frontend/server/API runtime.

- **Domain / deployment configuration clarity**
  - No explicit deployment config artifacts in repo (`vercel.json` etc.); domain assumptions are implicit.

- **Transactional email**
  - No transactional email integration for purchase confirmations, receipts, support, onboarding.

- **Environment hardening**
  - Multiple non-null env assertions in payment/access paths.
  - Build currently ignores TS errors (`next.config.mjs`), masking release-time defects.

---

## 7. Prioritised Task List

- **P0 / S / NO** — Re-enable `/game` protection in `proxy.ts` and `app/game/layout.tsx` (auth + entitlement checks).
- **P0 / S / NO** — Set `DEV_MODE` to false for production-safe behavior (`lib/game-helpers.ts`).
- **P0 / S / NO** — Fix Phase 4 results score display mismatch in `GameResultsFull` (“Your score” should show player score, not optimal score).
- **P0 / S / NO** — Harden Lemon Squeezy webhook: timing-safe signature compare + guarded JSON parse + explicit env validation.
- **P0 / S / PARTIAL** — Remove duplicate code blocks in `utils/supabase/client.ts` and `utils/supabase/server.ts`.
- **P0 / M / NO** — Enforce solver entitlement gating strategy (`/solver`) aligned to paid tier matrix.
- **P0 / M / NO** — Add legal pages routes: `/privacy`, `/terms`, `/refund-policy` with footer links verified.
- **P0 / M / PARTIAL** — Add global `app/error.tsx`, `app/not-found.tsx`, and route-level loading states for critical flows.

- **P1 / S / YES** — Add per-route metadata exports for `app/page.tsx`, `/pricing`, `/game`, `/solver`, and simulator routes.
- **P1 / S / YES** — Add `app/robots.ts` and `app/sitemap.ts`.
- **P1 / S / YES** — Remove or replace no-op `components/landing/social-proof.tsx`.
- **P1 / S / YES** — Clean branding/copy inconsistencies (placeholder labels and inconsistent naming).
- **P1 / M / NO** — Implement logged-in dashboard/practice hub route with purchase-aware navigation.
- **P1 / M / NO** — Persist full game results to Supabase (runs + per-site/per-phase breakdown).
- **P1 / M / PARTIAL** — Add cookie consent banner/preferences for analytics/compliance.
- **P1 / M / PARTIAL** — Add pricing/paywall UX states for “not entitled”, “already purchased”, and “session expired”.
- **P1 / L / PARTIAL** — Improve game panel responsive behavior for mobile/tablet (layout collapse strategy).

- **P2 / S / YES** — Improve standalone simulator completion states (remove disabled placeholder controls or complete paths).
- **P2 / S / YES** — Add lightweight empty/loading/error wrappers using existing `components/ui` primitives.
- **P2 / S / NO** — Add tests for `lib/access.ts` and `lib/checkout.ts` edge cases (env + variant mismatch behavior).
- **P2 / M / PARTIAL** — Add event-level product analytics (phase completion, abandon, paywall interactions, checkout clickouts).
- **P2 / M / PARTIAL** — Integrate Sentry for app + API + edge middleware monitoring.
- **P2 / M / PARTIAL** — Add transactional email provider and purchase confirmation workflow.
- **P2 / L / PARTIAL** — Refactor oversized simulator/solver route components into smaller composable sections with test coverage.

