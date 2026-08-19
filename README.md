# SasifySolutions

SasifySolutions is a full-stack marketplace for digital subscriptions and services. It provides a public catalogue, customer accounts and wallet flows, automated or manual order fulfilment, provider integrations, support and referral workflows, and an administration surface for inventory, deposits, users, reports, and site configuration.

The expected private repository is `horizonbymuneeb/sasify-os`.

## Architecture

```text
React 19 SPA (`src/`)
  -> tRPC client
  -> Hono Node server (`api/boot.ts`)
       -> tRPC routers and REST webhooks (`api/`)
       -> services: payments, providers, delivery, email
       -> Mongoose models (`api/mongo/models.ts`)
       -> MongoDB (`DATABASE_URL`)

Production build:
  Vite -> `dist/public/`
  esbuild -> `dist/boot.js`
  Hono serves API + static SPA from one Node process
```

Production mode also starts the Binance Pay reconciliation worker. Financial, delivery, and provider code is sensitive: preserve idempotency, encryption, authorization, and audit behavior.

## Prerequisites

- Node.js 20 or newer and npm.
- A reachable MongoDB deployment. Despite the variable name, `DATABASE_URL` must be a MongoDB connection string because runtime persistence uses Mongoose.
- Provider, payment, webhook, and SMTP credentials only for the integrations being enabled.
- OpenShip v0.3.0 and Caddy for the production workflow below.

## Clean local setup

```bash
git clone git@github.com:horizonbymuneeb/sasify-os.git
cd sasify-os
cp .env.example .env
npm ci
npm run check
npm run dev
```

Vite serves development traffic (normally `http://localhost:3000`; use the URL printed by Vite). The Hono Vite integration handles backend routes during development.

Seed data is optional and destructive to its target collections:

```bash
npm run db:seed
```

Read `db/seed.ts`, use an isolated development database, and never seed production.

## Configuration

Runtime values belong in an untracked `.env` or the deployment secret store. The application uses these names:

| Variable | Purpose |
| --- | --- |
| `APP_ID` | Required in production; application identifier used by the runtime. |
| `APP_SECRET` | Required in production; signs application sessions/JWTs and is the encryption fallback. |
| `DATABASE_URL` | Required in production; MongoDB/Mongoose connection string. |
| `CREDENTIAL_ENCRYPTION_KEY` | Optional separate key for delivered passwords and 2FA secrets; strongly recommended. |
| `WEBHOOK_SECRET` | Authenticates supported payment/phone automation webhooks. |
| `PORT` | Production Hono listen port; defaults to `3000`. |
| `NODE_ENV` | Runtime mode. Production mode serves `dist/public` and starts workers. |
| `PUBLIC_APP_URL` | Canonical public URL used for callbacks/webhooks. |
| `KIMI_AUTH_URL`, `KIMI_OPEN_URL` | Server-side Kimi authentication/platform endpoints. |
| `OWNER_UNION_ID` | Grants the initial owner/admin role. |
| `VITE_KIMI_AUTH_URL`, `VITE_APP_ID` | Browser-exposed Vite configuration; never put secrets in `VITE_*`. |
| `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `BINANCE_PAY_BASE_URL` | Binance Pay server configuration. |
| `TECHNYSOFT_API_KEY`, `CANBOSO_API_KEY`, `AKUNDING_API_KEY` | Server-side marketplace provider credentials. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional email transport. |
| `DEPOSIT_NOTIFICATION_EMAIL` | Destination for deposit notifications. |

`APP_ID`, `APP_SECRET`, and `DATABASE_URL` are required in production. `DATABASE_URL` must be a MongoDB URI. `drizzle.config.ts` is legacy/tooling-oriented; runtime persistence is Mongoose, not SQL migrations. Set `TRUST_PROXY=true` only when the deployment proxy overwrites `X-Forwarded-For` and `X-Real-IP`. There are no SQL migration or schema-push commands for this MongoDB runtime.

## Commands

| Command | Use |
| --- | --- |
| `npm run dev` | Start the Vite development environment. |
| `npm run check` | Run the TypeScript project build/check. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run Vitest once. |
| `npm run build` | Build SPA assets and bundle `api/boot.ts` to `dist/boot.js`. |
| `npm start` | Run the completed production bundle. |
| `npm run preview` | Preview Vite output; not the production API process. |
| `npm run db:seed` | Bundle and run the MongoDB seed; non-production only. |

Minimum pre-deployment gate:

```bash
npm run check
npm run lint
npm test
npm run build
```

## OpenShip v0.3.0 production deployment

The production contract is an OpenShip-managed **user systemd** service behind Caddy:

- GitHub repository: `horizonbymuneeb/sasify-os` (private)
- public host: `https://sas.hhdevs.space`
- loopback application port: `20135`
- current unit: `openship-dep_V6-fZ3rKVx7vgt5t.service`
- external environment file: `~/.openship/env/sas.env`
- start command: `node --env-file=~/.openship/env/sas.env dist/boot.js`

From an authenticated, clean checkout:

```bash
npm ci
npm run check
npm run lint
npm test
npm run build
openship init
openship deploy
```

OpenShip should install dependencies, run `npm run build`, and run `dist/boot.js` with `NODE_ENV=production` and `PORT=20135`. Caddy terminates TLS and proxies `sas.hhdevs.space` to `127.0.0.1:20135`. MongoDB is external; no database files belong in an OpenShip release.

### Production verification

There is no dedicated health endpoint. Verify the service, homepage, and a known non-destructive API response:

```bash
systemctl --user status openship-dep_V6-fZ3rKVx7vgt5t.service --no-pager
journalctl --user -u openship-dep_V6-fZ3rKVx7vgt5t.service -n 100 --no-pager
curl -fsSI http://127.0.0.1:20135/
curl -fsSI https://sas.hhdevs.space/
```

Then exercise authentication and a read-only catalogue/dashboard route in the browser. Payment/provider smoke tests must be explicitly authorized and use sandbox or controlled test accounts; do not trigger a real purchase merely to check deployment health.

## Persistent data and Git exclusions

Never commit:

- `.env` values or provider/payment/SMTP secrets;
- MongoDB exports, customer records, delivered credentials, wallet/ledger snapshots, or audit exports;
- `node_modules/`, `dist/`, logs, coverage, `.hermes/` artifacts, or local tooling output;
- OpenShip project links, release directories, or deployment environment files.

The authoritative persistent data is MongoDB plus any external object storage configured by the application. Back up and restore those systems independently of Git and OpenShip releases.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Startup reports a missing variable | In production, `APP_SECRET` and `DATABASE_URL` are required by `api/lib/env.ts`. |
| MongoDB connection fails | Confirm `DATABASE_URL` is a MongoDB URI, network access, TLS parameters, and database user permissions. |
| Homepage works but API calls fail | Inspect the Hono journal, `/api/trpc/*` requests, session cookies, and `PUBLIC_APP_URL`. |
| Static assets are missing | Run `npm run build` and confirm `dist/public/` exists beside `dist/boot.js`. |
| Provider purchase fails | Check the relevant provider key and readiness settings; preserve idempotency keys and do not blind-retry a charge. |
| Public URL fails but loopback works | Verify Caddy routes `sas.hhdevs.space` to port `20135`. |
| Type/build disagreement | Run `npm run check` before `npm run build`; do not treat a successful Vite transpile as a type-check. |

See [AGENTS.md](AGENTS.md) before editing financial, delivery, authentication, or deployment code.
