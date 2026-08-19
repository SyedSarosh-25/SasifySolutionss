# Spec: Sasify Visual Site Builder

## Objective
Give Sasify administrators a safe, section-based visual builder at `/admin/site-customize` for the full public storefront. The operator can select a public page, add curated blocks, reorder them by drag and drop, choose templates, edit content/styles, preview responsive layouts in real time, save drafts, publish explicitly, and restore prior versions. Customer dashboard and admin operational pages are not editable targets.

## Product Decisions
- Curated section composition, not free-form pixel positioning.
- Existing Sasify frontend is the default/fallback and first editable snapshot.
- Functional surfaces (catalog, forms, reviews, scammer directory, legal body) are protected **system blocks**: movable and hideable but their core logic is not destructively editable.
- Marketing blocks are fully configurable within safe schemas.
- Draft preview never changes the public site. Publish is explicit and versioned.

## Public Page Scope
`home`, `tools`, `product-detail`, `scammers`, `faq`, `reviews`, `contact`, `request-tool`, `provider-apply`, and `legal`.

## Section Library
- Hero: split visual, centered, compact
- Rich text / announcement
- Stats strip
- Feature/card grid: 2/3/4 columns
- Product/catalog system block
- Product carousel / content slider
- FAQ accordion
- Reviews/testimonial grid
- Trust/safety strip
- CTA: solid, split, compact
- Steps/how-it-works
- Spacer/divider
- Page-specific system blocks for forms and live data

## Data Contract
A versioned `SiteBuilderDocument` contains global theme tokens and page documents. Each page has ordered `BuilderSection` records:

```ts
type BuilderSection = {
  id: string;
  type: SectionType;
  variant: string;
  visible: boolean;
  content: SafeJsonObject;
  style: {
    surface: "default" | "muted" | "brand" | "dark";
    width: "narrow" | "content" | "wide" | "full";
    spacing: "none" | "compact" | "normal" | "spacious";
    align: "left" | "center";
  };
};
```

No raw HTML, CSS, JavaScript, arbitrary classes, secrets, provider metadata, or unsanitized URLs are accepted.

## Persistence
- One `SiteBuilderState` singleton stores draft and published documents plus optimistic revisions.
- Immutable `SiteBuilderVersion` snapshots are created on publish.
- Save requires `baseRevision`; stale saves return conflict instead of overwriting another edit.
- Restore copies a historical snapshot into draft; publishing remains explicit.
- Every save/publish/restore writes an audit log.

## API Boundaries
Admin-only procedures:
- `siteBuilder.getWorkspace`
- `siteBuilder.saveDraft`
- `siteBuilder.publish`
- `siteBuilder.versionList`
- `siteBuilder.restoreVersion`

Public procedure:
- `public.siteBuilderPublished`

Public response contains only the validated published rendering document. Draft state, editor metadata, actor IDs, revision history, and audit data never leave admin APIs.

## Admin Workspace
- Top bar: page selector, viewport selector, undo/redo, save state, Save Draft, Publish.
- Left rail: page sections + section library/templates.
- Center: real-time desktop/tablet/mobile preview using the same renderer as production.
- Right inspector: section content, variant, visibility, safe style controls; card/slide item editor.
- Keyboard-accessible drag controls and explicit move-up/move-down fallback.
- Unsaved-change guard and conflict message.

## Testing Strategy
- Unit: schema validation, sanitization, default config, public projection, revision conflicts.
- Router integration: admin auth boundary, draft isolation, publish version creation, restore semantics.
- Component/browser: add/reorder/edit/hide section; responsive preview; save/publish; public render.
- Regression: no config preserves current frontend; malformed config cannot blank the site.

## Boundaries
### Always
- Preserve existing public functionality and customer/provider confidentiality.
- Validate payload on both client and server.
- Create immutable publish history and audit logs.
- Build/test and verify authenticated admin + public routes before deployment.

### Ask first
- Allow arbitrary HTML/CSS/JS.
- Make dashboard/admin operations editable.
- Upload assets to a new external service.

### Never
- Auto-publish autosaves.
- Expose drafts or internal integration/provider data publicly.
- Overwrite the unrelated `api/routers/admin.ts` working-tree changes.

## Success Criteria
1. Admin can build and preview every named public page using curated sections.
2. Current production remains unchanged until explicit Publish.
3. Publish changes the customer route without redeploying code.
4. Version restore is reversible and audited.
5. Invalid/stale writes are rejected; malformed published data falls back safely.
6. Editor and representative pages pass 390px, 1024px, and 1440px browser verification.
