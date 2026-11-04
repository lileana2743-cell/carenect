# Free connected hosting

Use a Render Free web service for the Node app and a Supabase Free project for durable data. All three clients keep the same interface and use the same independent Carenect email/password accounts. Carenect does not use the Supabase administrator's sign-in as a customer account.

The root `render.yaml` provisions **free compute only**: no paid disk, database, or compute plan. Data, sessions, authentication limits and private photos are stored in Supabase. The app must never use an ephemeral local SQLite database for this deployment. In cloud mode, missing credentials fail the health check rather than silently falling back to local storage.

## Set up

1. Create a **Free** Supabase project in the intended owner organization, preferably near Render's Singapore region. If the account has exhausted its Free project allowance, stop; do not upgrade or create a paid project automatically.
2. Apply `supabase/migrations/202611040001_carenect.sql` using an authorized SQL migration tool. Review existing prefixed tables first if reusing an existing project. These tables are server-only: RLS is enabled, public/anonymous/authenticated grants are revoked, and only `service_role` can access them. Registration and authentication limits use server-only transaction functions.
3. Securely configure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` on the server or in an ignored local environment. The latter is a server-only Supabase secret key; the legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback. Never put either secret into a browser, a `NEXT_PUBLIC_*` variable, source control, a URL, chat or logs.
4. Run `node scripts/setup-cloud.mjs` in that environment. It checks the migrated database and creates the private `carenect-private` storage bucket with a 20 MB per-file limit and the app's accepted image/video MIME types. An existing public bucket is rejected for review instead of silently being used.
5. Deploy the pushed GitHub repository using the root `render.yaml`, reviewing that its plan remains `free`. Set the two server-only values in Render's environment configuration. `DATA_BACKEND=supabase` is already declared. No persistent Render disk is required.
6. After Render is live, check `/api/health`, register test accounts on the public HTTPS origin, verify separate-account isolation, upload/download a private photo, and restart the Render service. Records and photos must remain available after the restart. Do not declare the connected site verified until these live checks pass.

Render's generated HTTPS origin is detected via `RENDER_EXTERNAL_URL`. Set `APP_ORIGIN` when using a custom domain. The public origin is non-secret; the Supabase secret key must remain server-only.

## Limits and verification

Free hosting has quotas and idle behavior. Supabase currently includes 500 MB database storage and 1 GB file storage, and pauses inactive Free projects after one week. Render Free services may sleep and take time to wake. Confirm the current official terms before provisioning: [Supabase Free pricing](https://supabase.com/pricing), [Render Free limits](https://render.com/docs/free).

The repository tests private Postgres grants, registration rollback, authentication limits, owner-scoped HTTP requests, local account/media flows and safe failure when cloud storage is not configured. These checks do **not** replace testing a real Supabase project and a live Render deployment. Account connection and live deployment are still pending.
