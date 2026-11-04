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

This is a full-stack app, not a GitHub Pages static site. Put this directory in a GitHub repository and deploy it on a Node.js 24 / Docker web host with a persistent disk. A host-provided domain or your own domain works without GPT in the URL.

The `Dockerfile` builds Next.js standalone output; `compose.yaml` supplies a persistent volume. Start one application instance. Set `APP_ORIGIN` to the exact public HTTPS origin and mount a persistent, writable volume at `/data`. Accounts, SQLite records and private uploads live there. Do not expose or commit `/data` or environment files. Keep a consistent backup of the SQLite database and uploads using the host's backup procedure. Restoring accounts requires restoring this data.

On Render, request-origin validation automatically uses the documented `RENDER_EXTERNAL_URL`. Set `APP_ORIGIN` explicitly when serving a custom domain instead.

The owner declined paid hosting. There is deliberately no active root `render.yaml`. The optional, inactive `deploy/render.paid.yaml.example` describes one Docker web service in Singapore, the smallest paid web compute plan (`0.5c-512mb`) and a 1 GB persistent disk at `/data`. Do not activate or apply it without new approval. No hosted resource has been created. The app's server-side data must not be put on Render's free ephemeral filesystem and presented as durable storage.

For local Docker use:

```sh
docker compose up --build
```

Render is one possible host: choose a Docker web service, health check `/api/health`, port `3000`, and persistent disk `/data`. Render's persistent disks require a paid service; its free filesystem loses changes on restart. No paid service has been provisioned by this project. See [Render disks](https://render.com/docs/disks) and [Render free service limits](https://render.com/docs/free). The app is also usable on another host that supplies the same runtime and storage.

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
