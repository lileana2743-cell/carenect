# Carenect

An independent, English care app with Senior, Caregiver and Family clients. The original lime, lavender, mood illustrations, restaurant volunteer flow and fine-art exhibition assets are retained. No OpenAI account, GPT domain, Sites runtime, D1 or R2 account is required.

Original binary assets are stored losslessly in `assets/part-*.json`. `pnpm dev` and `pnpm build` restore them to `public/` automatically and verify each SHA-256 checksum. To view the original image and font files separately, run `pnpm assets`. Generated files are excluded from Git; the asset packs are the source of truth.

## Run

Node.js 24 or newer and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Create an account at `/auth?mode=register`. The same account can sign in from another device and use all three client views at `/senior`, `/caregiver`, `/family`.

```sh
pnpm typecheck
pnpm build
pnpm test
pnpm start
```

Tests run a production server with temporary test accounts, an isolated database and uploaded image. They cover real sessions, account isolation, cross-device records, origin validation, image ownership and persistence across a server restart.

## Host outside GPT

This is a full-stack app, not a GitHub Pages static site. A host-provided domain or your own domain works without GPT in the URL. The root `render.yaml` uses **Render Free compute plus Supabase Free durable storage**, with no paid disk or compute plan. See [Free connected hosting](deploy/FREE-HOSTING.md) for project connection, private storage and live verification. A real Supabase project and live host are not connected yet.

For local or self-hosted SQLite use, the `Dockerfile` builds Next.js standalone output and `compose.yaml` supplies a persistent volume. Start one application instance and mount a persistent writable volume at `/data`. Accounts, SQLite records and private uploads live there. Do not expose or commit `/data` or environment files. Keep consistent database-native backups with the corresponding private uploads. Restoring accounts requires restoring this data. On Render, select an explicit backend; the free deployment must use `DATA_BACKEND=supabase`, not local SQLite.

On Render, request-origin validation automatically uses the documented `RENDER_EXTERNAL_URL`. Set `APP_ORIGIN` explicitly when serving a custom domain instead.

The owner declined paid hosting. The optional `deploy/render.paid.yaml.example` is inactive and must not be applied without new approval. The active root Blueprint uses free compute and external durable storage. No hosted resource has been created. Supabase secret keys are server-only environment variables; they must never appear in client code, source control or chat. Database tables and transaction functions deny public and ordinary authenticated Supabase API roles; the Node server verifies its own HttpOnly sessions and scopes data to the Carenect account.

For local Docker use:

```sh
docker compose up --build
```

Render's free filesystem loses changes on restart, so the free configuration keeps records and photos in Supabase instead. Free services can sleep; Supabase Free projects have quotas and pause after one week of inactivity. No paid service has been provisioned. See [Render free limits](https://render.com/docs/free) and [Supabase Free pricing](https://supabase.com/pricing). Another Node.js 24 / Docker host with the required database and storage is also supported.

GitHub Actions verifies types, a production build and integration tests. It does not deploy or buy a hosting plan automatically. This repository contains the complete app source; a public website has not been provisioned. A GitHub repository URL is a source-code link, not a running app URL.

## Accounts and data

- Email/password registration with scrypt password hashes and random HttpOnly, SameSite sessions. Cookies are Secure in production; production requires HTTPS.
- A sign-in session can be revoked independently via `/logout`. Multiple device sessions access the same account's records.
- Ten authentication attempts per email per fifteen minutes; no OpenAI identity headers are trusted.
- Care data and uploaded files are scoped to the signed-in account. Switching clients changes the view within that account; separate accounts are isolated. Invitation-based sharing between different people's accounts is not implemented.
- Photos and videos are stored outside `public/`; access requires an authenticated owner session. Files have a 20 MB limit and MIME-signature validation.
- Email verification and password-reset email delivery are not configured. Configure an email provider and recovery flow before offering general public registration. No real patient data was exported from the old site; only original sample content is included.

The health cards are sample measurements, not live device readings. The music player uses labeled sound studies because original song audio was not provided. There are no native push notifications or app-store packages.

## Design provenance

The assets in `public/original` come from the user's original Illustrator and image designs. Fine-art assets are paintings, sculpture and gallery photographs. Preserve attribution and confirm distribution rights before wider release. Original fonts and the supplied brand artwork are included; no assets were substituted with unrelated couple photographs.
