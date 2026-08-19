# Sasify Site Builder — Implementation Plan

## Phase 0 — Safety and rollback
- Record current commit/build hashes and public screenshots.
- Keep unrelated `api/routers/admin.ts` diff out of every builder commit.
- Add explicit feature fallback: absent/invalid published builder document renders current components.

## Phase 1 — Foundation
- Add shared builder types, schemas, safe JSON limits, URL validation, section/page registry, and default document.
- Add `SiteBuilderState` and `SiteBuilderVersion` Mongoose models.
- Add isolated `api/routers/site-builder.ts`; mount under `siteBuilder` in `api/router.ts`.
- Add public published-config query with safe projection/cache semantics.
- Unit-test validation, default document, draft/public isolation, revision behavior.

**Checkpoint:** tests + touched-scope typecheck + API probes; no public visual change.

## Phase 2 — Rendering system
- Add `SiteBuilderProvider` for published config and safe fallback.
- Build registry-based `SitePageRenderer` and reusable marketing blocks.
- Build system blocks that call existing data/components without exposing editor concerns.
- Add carousel/slider using existing Embla dependency.

**Checkpoint:** default document renders parity screenshots for Home and one functional page.

## Phase 3 — Admin editor
- Add `/admin/site-customize` nav item and route.
- Build three-pane workspace with page selector, section list, library, responsive preview, inspector, visibility/duplicate/delete controls.
- Add accessible DnD via `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` plus move buttons.
- Add local undo/redo and dirty-state tracking.

**Checkpoint:** authenticated browser can add, reorder, edit, hide, undo/redo and switch preview widths without API writes.

## Phase 4 — Draft/publish/versioning
- Wire Save Draft with optimistic revision.
- Wire explicit Publish confirmation and immutable version creation.
- Add version history drawer and Restore-to-draft action.
- Add unsaved navigation guard, conflict UI, and audit-log verification.

**Checkpoint:** draft cannot affect public HTML; publish changes it; restore returns prior output.

## Phase 5 — Full public frontend integration
- Home: all existing marketing sections become composable blocks.
- Tools/product: system catalog/detail block + configurable hero/CTA/trust blocks.
- Scammers/reviews/FAQ/contact/request/provider/legal: protected functional block plus configurable marketing blocks.
- Preserve route behavior, SEO, forms, tRPC calls, auth links, currency and supplier confidentiality.

**Checkpoint:** all public routes return 200, retain functional controls, and render configured ordering.

## Phase 6 — Verification and deploy
- Full unit suite, touched/full TypeScript evidence, production build.
- Authenticated Playwright: editor at 1440/1024/390.
- Public Playwright: homepage, tools, FAQ, contact at desktop/mobile.
- Verify draft isolation, publish, immutable version, restore and rollback.
- Secret/provider leak scan, service convergence, ping and logs.
- Atomic commits per phase; final completion manifest.

## File Scope
### New
- `src/site-builder/types.ts`
- `src/site-builder/schema.ts`
- `src/site-builder/default-document.ts`
- `src/site-builder/section-registry.tsx`
- `src/site-builder/SitePageRenderer.tsx`
- `src/site-builder/SiteBuilderProvider.tsx`
- `src/components/admin/site-builder/*`
- `api/routers/site-builder.ts`
- `api/lib/site-builder.ts`
- focused tests

### Modified
- `api/mongo/models.ts`
- `api/router.ts`
- `api/routers/public.ts`
- `src/main.tsx` or `src/App.tsx` provider mount
- `src/pages/Admin.tsx` nav/switch import only
- public page entry files for renderer integration
- `package.json` / lockfile for DnD dependencies

## Rollback
- Every phase is a separate commit.
- Before first publish, production output is unchanged by design.
- Runtime emergency rollback: clear/disable published builder state so fallback components render immediately.
- Code rollback: revert latest phase commit, rebuild, force-update `sas` service.
- Database rollback does not delete versions; restore the last known-good snapshot through the admin/API.
