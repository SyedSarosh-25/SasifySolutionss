# AGENTS.md — SasifySolutions

This is the operating contract for coding agents. The expected private upstream is `horizonbymuneeb/sasify-os`.

## Project map

- `src/` — React SPA, routes, customer/admin pages, providers, hooks, and browser utilities.
- `api/boot.ts` — Hono production entry point; mounts tRPC, REST webhooks, static assets, and the reconciliation worker.
- `api/router.ts`, `api/routers/` — application procedures grouped by domain.
- `api/services/` — financial, payment, provider, email, delivery, and reconciliation logic.
- `api/lib/` — security, cookies, environment, encryption, and domain helpers.
- `api/mongo/models.ts` — Mongoose persistence models and indexes.
- `api/queries/connection.ts` — MongoDB connection lifecycle.
- `contracts/` — shared client/server types and constants.
- `db/seed.ts` — development seed; destructive and prohibited against production.
- `scripts/` — migrations, audits, repairs, and production probes; many have side effects.
- `docs/` — integration/operator notes.

## Safe edit boundaries

- Keep UI, tRPC contract, service, and Mongoose changes synchronized.
- Financial state changes require idempotency, atomicity/transactions where supported, integer-cent handling, authorization, audit entries, and explicit error behavior.
- Delivered credentials must remain encrypted at rest; never reintroduce plaintext fields or logs.
- Do not hand-edit `dist/`, `node_modules/`, coverage, logs, `.hermes/`, Graphify output, runtime env, OpenShip releases, or production exports.
- Treat scripts containing `APPLY`, repair, migrate, seed, probe, purchase, webhook, or reconciliation logic as side-effecting. Read them first and never run them against production without explicit approval.
- Do not change Caddy or user-systemd units as part of an application-only task.

## Setup and exact commands

```bash
cp .env.example .env
npm ci
npm run check
npm run dev
```

Use an isolated MongoDB database. Runtime `DATABASE_URL` is a MongoDB URI even though legacy Drizzle tooling also references that name.

## Test and build requirements

For normal changes:

```bash
npm run check
npm run lint
npm test
npm run build
```

Run focused Vitest files while iterating, then the full suite. For financial/provider code, add or update tests for success, authorization, replay/idempotency, provider timeout/unknown result, and compensation/refund behavior. A Vite build does not replace `npm run check`.

Never run `npm run db:seed` against production. Never perform a real provider purchase, payment, refund, wallet adjustment, webhook replay, or repair as an ordinary test.

## Secrets and data policy

- Mention environment variable names only; never commit or disclose values.
- `.env`, external OpenShip env files, MongoDB dumps, customer PII, API keys, delivered credentials, payment references, wallet/ledger exports, cookies, and audit exports stay outside Git.
- Browser-exposed `VITE_*` variables may contain public identifiers/URLs only, never secrets.
- `CREDENTIAL_ENCRYPTION_KEY` changes can make existing encrypted deliveries unreadable. Rotation requires an explicit migration plan.
- Redact provider payloads and financial identifiers in logs, tests, screenshots, and issue reports.

## Deployment contract

Production uses OpenShip v0.3.0, a user-systemd service, and Caddy:

- repository: `horizonbymuneeb/sasify-os`
- current unit: `openship-dep_V6-fZ3rKVx7vgt5t.service`
- port: `20135`
- domain: `sas.hhdevs.space`
- env file: `~/.openship/env/sas.env`
- build: `npm ci && npm run build`
- start: `NODE_ENV=production PORT=20135 node --env-file=~/.openship/env/sas.env build/boot.js`

MongoDB and any object storage are external persistent systems. Releases are disposable. OpenShip owns deployment units; Caddy owns TLS and reverse proxying. Do not embed secrets into the unit, repository, build output, or command history.

The deployment ID may change after replacement. Resolve the current OpenShip deployment/unit rather than hardcoding the historical ID in automation.

## Verification checklist

- [ ] Diff is limited to requested source/docs; generated/runtime artifacts are absent.
- [ ] Client/server contracts and Mongoose models remain consistent.
- [ ] Financial and fulfilment changes preserve authorization, cents-based arithmetic, idempotency, encryption, and audits.
- [ ] `npm run check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` produces `build/public/` and `build/boot.js`.
- [ ] No secret, PII, production payload, database export, or delivered credential is staged.
- [ ] Loopback homepage responds on port `20135` after deployment.
- [ ] Public HTTPS homepage responds through Caddy.
- [ ] User-systemd service and journal are healthy.
- [ ] No real purchase/payment/refund was triggered without explicit authorization.
