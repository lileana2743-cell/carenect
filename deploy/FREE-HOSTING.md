# Free connected hosting

Use a Render Free web service for the Node app and a Supabase Free project for durable data. All three English clients use native Supabase Auth customer accounts. The Supabase administrator's dashboard login is separate from app users.

The root `render.yaml` provisions **free compute only**: no paid disk, database, or compute plan. Supabase handles authentication, records and private photos. The app must never use ephemeral local SQLite for this deployment. Missing cloud configuration fails the health check rather than silently falling back to local storage.

## Set up

1. The owner confirmed the organization and a **$0/month Free** project named `carenect` was created in Singapore: project reference `ousfghrrrzmkmczxzjkr`. Do not upgrade it automatically.
2. Both SQL migrations are applied. The first preserves the earlier custom-account schema; the second connects record ownership to `auth.users`, creates own-account profile/record RLS and a private `carenect-private` bucket. The unused legacy account/session tables remain closed to ordinary API roles. Existing custom accounts require reviewed identity migration rather than automatic reassignment.
3. The active Blueprint includes `DATA_BACKEND=supabase`, the project's URL and its **publishable** key. No secret or service-role key is required. For local cloud mode, copy these public connection values into an ignored `.env.local`. Never publish environment files or session tokens.
4. Run `node --env-file=.env.local scripts/setup-cloud.mjs` to check the database connection and anonymous data isolation. The migration creates the private bucket with a 20 MB limit and accepted image/video MIME types.
5. Deploy the pushed GitHub repository using the root `render.yaml`, retaining `plan: free`. Render authorization and selection of the intended workspace are still required. No persistent Render disk is needed.
6. Once the actual HTTPS hostname is known, set it as the Supabase Auth Site URL and allow `<origin>/auth/callback` (including return-query variants as appropriate). Keep email confirmation enabled. Configure SMTP for public recipients; Supabase's default email sender has restrictions. For cross-device confirmation links, the optional email template may use `<origin>/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/senior`.
7. Check `/api/health`, sign up, confirm the email and sign in on the actual origin. Verify all three protected clients, separate-account isolation, private-photo upload/download, session refresh/logout and persistence after Render restart. Do not claim these signed-in live checks passed before performing them.

Render's HTTPS origin is detected via `RENDER_EXTERNAL_URL`. Set `APP_ORIGIN` for a custom domain. The app uses only a publishable key and an authenticated user's session; RLS performs database and file authorization.

## Limits and verification

Free hosting has quotas and idle behavior. Supabase currently includes 500 MB database storage and 1 GB file storage, and pauses inactive Free projects after one week. Render Free services may sleep and take time to wake. Confirm the current official terms before provisioning: [Supabase Free pricing](https://supabase.com/pricing), [Render Free limits](https://render.com/docs/free).

The repository tests PostgreSQL grants, native Auth ownership policies, private object folders, registration rollback, local account/media flows, protected page redirects and safe failure when cloud storage is not configured. These checks do **not** replace signed-in tests on the live host. The Supabase connection is established; public frontend deployment and email delivery configuration remain pending.
