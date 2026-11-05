# Verification

Updated 5 November 2026 (Asia/Shanghai).

Verified with Node.js 24.22.1 and the committed pnpm lockfile:

- TypeScript and Next.js route generation passed.
- Next.js 16.3.4 production build and standalone output passed with native Supabase Auth enabled.
- 17 local tests passed: production-server account/data/media flows, protected redirects, legacy SQL permissions, native Auth RLS and private object folder isolation, plus SDK HTTP ownership predicates.
- All 78 packed design/font/icon assets restore with matching SHA-256 checksums.
- The active Render Blueprint uses Free compute only and no persistent disk. It includes public Supabase connection values, not administrator credentials.

## Real Supabase project

The owner approved organization `wespxxlguzqfijvefihz`. Project `ousfghrrrzmkmczxzjkr` (`carenect`) was created in Singapore on the Free plan, quoted at $0/month. Both migrations were applied. Profiles and records have RLS enabled with `auth.uid()` ownership checks; UPDATE has both USING and WITH CHECK. Storage is private, limited to 20 MB and accepted MIME types, with per-user folder policies. Identity is validated by Supabase Auth, not by user-editable metadata or OpenAI headers.

Read-only SQL verified deployed RLS policies and private bucket settings. Security Advisor found only INFO notices for the three unused, intentionally closed legacy account/session/rate-limit tables; no ordinary API grants or policies expose those tables. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

The actual project passed the connection/anonymous-isolation script. A production Next.js server connected to that real project passed protected redirects for all three clients, anonymous record/media rejection, spoofed-header rejection, real Auth wrong-password rejection and invalid email-confirmation-link handling. No account was created and no email was sent. Repeat with `node --env-file=.env.local scripts/setup-cloud.mjs` and `node --env-file=.env.local scripts/check-cloud.mjs` after building.

## Not yet verified or deployed

Successful native Auth sign-up, email delivery, confirmation, authenticated cloud CRUD/media, refresh and logout have not been tested with real users. The temporary administrator fixture deployment was rejected by automatic review; it was not deployed, and that test path was stopped. Local SQLite sign-in/logout tests do not establish that native Supabase sign-in has been exercised.

A public frontend host is not yet deployed. Render CLI still requires account login. After provisioning the actual origin, configure Supabase Auth Site URL/redirect URLs and an SMTP sender for public recipients, then perform signed-in checks and verify persistence after a Render restart. Email confirmation has not been disabled. Password recovery UI and invitation-based cross-account sharing are not implemented.

Docker is unavailable locally, so the Docker image has not been run. No new visual browser verification is claimed. Original English client UI and supplied artwork are retained. No paid hosting was provisioned; no new live website URL is claimed.
