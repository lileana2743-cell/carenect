# Carenect

An independent, English care app with Senior, Caregiver and Family clients. The original lime, lavender, mood illustrations, restaurant volunteer flow and fine-art exhibition assets are retained. No OpenAI account, GPT domain, Sites runtime, D1 or R2 account is required.

Original binary assets are stored losslessly in `assets/part-*.json`. `pnpm dev` and `pnpm build` restore them to `public/` automatically and verify each SHA-256 checksum. To view the original image and font files separately, run `pnpm assets`. Generated files are excluded from Git; the asset packs are the source of truth.

## Run

Node.js 24 or newer and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Create an account at `/auth?mode=register`. The same account can sign in from another device and use all three client views at `/senior`, `/caregiver`, `/family`. These routes redirect signed-out visitors to login and retain the requested destination. The landing and login pages remain public.

Local development defaults to SQLite. For native Supabase Auth, set `DATA_BACKEND=supabase`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in an ignored `.env.local`. Apply both migrations in order. The hosted app uses a publishable key and the signed-in user's session; it does not need an administrator or service-role key.

```sh
pnpm typecheck
pnpm build
pnpm test
pnpm start
```

Tests run a production server with temporary test accounts, an isolated database and uploaded image. They cover real sessions, account isolation, cross-device records, origin validation, image ownership and persistence across a server restart.

## Host outside GPT

This is a full-stack app, not a GitHub Pages static site. A host-provided domain or your own domain works without GPT in the URL. The root `render.yaml` uses **Render Free compute plus Supabase Free durable storage**, with no paid disk or compute plan. See [Free connected hosting](deploy/FREE-HOSTING.md). The Supabase Free project and private bucket are provisioned; a public frontend host is still pending.

For local or self-hosted SQLite use, the `Dockerfile` builds Next.js standalone output and `compose.yaml` supplies a persistent volume. Start one application instance and mount a persistent writable volume at `/data`. Accounts, SQLite records and private uploads live there. Do not expose or commit `/data` or environment files. Keep consistent database-native backups with the corresponding private uploads. Restoring accounts requires restoring this data. On Render, select an explicit backend; the free deployment must use `DATA_BACKEND=supabase`, not local SQLite.

On Render, request-origin validation automatically uses the documented `RENDER_EXTERNAL_URL`. Set `APP_ORIGIN` explicitly when serving a custom domain instead.

The owner declined paid hosting. The optional `deploy/render.paid.yaml.example` is inactive and must not be applied without new approval. The active root Blueprint uses free compute and the owner's Supabase Free project. Native Supabase Auth issues the cloud sessions. Next.js refreshes them through Proxy, validates identity with `auth.getUser()` and stores cookies as HttpOnly, SameSite and Secure in production. Row-level security restricts profiles, records and private files to the validated `auth.uid()`. Display names and preferred clients are not staff/admin permissions. No service-role or secret key is included or needed by the application.

For local Docker use:

```sh
docker compose up --build
```

Render's free filesystem loses changes on restart, so the free configuration keeps records and photos in Supabase instead. Free services can sleep; Supabase Free projects have quotas and pause after one week of inactivity. No paid service has been provisioned. See [Render free limits](https://render.com/docs/free) and [Supabase Free pricing](https://supabase.com/pricing). Another Node.js 24 / Docker host with the required database and storage is also supported.

GitHub Actions verifies types, a production build and integration tests. It does not deploy or buy a hosting plan automatically. A GitHub repository URL is a source-code link, not a running app URL. See [Verification](VERIFICATION.md) for checks and outstanding deployment work.

## Accounts and data

- Cloud mode uses Supabase Auth email/password registration, confirmation, sign-in, session refresh and local-device logout. The `/auth/callback` PKCE and `/auth/confirm` email-token routes reject invalid links and external return URLs. Supabase handles cloud authentication rate limits. SQLite mode retains scrypt password hashes and opaque per-device sessions with ten attempts per email per fifteen minutes. No OpenAI identity headers are trusted.
- Multiple device sessions access the same account's records. Supabase access JWTs can remain valid until expiry after sign-out; refresh-token revocation and browser-cookie clearing do not imply immediate revocation of every previously issued access token.
- Care data and uploaded files are scoped to the signed-in account. Switching clients changes the view within that account; separate accounts are isolated. Invitation-based sharing between different people's accounts is not implemented.
- Photos and videos are stored outside `public/`; access requires an authenticated owner session. Cloud objects live in a private bucket under the owner's user ID. Files have a 20 MB limit and MIME-signature validation; authenticated media responses are not cached.
- Email confirmation stays enabled. Before public registration, set the final site's Auth URL/redirect allowlist and an appropriate SMTP provider. Supabase's default email sender has recipient restrictions; a working email confirmation handler does not mean public email delivery has been configured. A password recovery UI is not included yet. No real patient data was exported from the old site; only original sample content is included.

The health cards are sample measurements, not live device readings. The music player uses labeled sound studies because original song audio was not provided. There are no native push notifications or app-store packages.

## Design provenance

The assets in `public/original` come from the user's original Illustrator and image designs. Fine-art assets are paintings, sculpture and gallery photographs. Preserve attribution and confirm distribution rights before wider release. Original fonts and the supplied brand artwork are included; no assets were substituted with unrelated couple photographs.
