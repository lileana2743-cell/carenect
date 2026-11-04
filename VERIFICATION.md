# Verification

Verified locally on 4 November 2026 with Node.js 24.22.1 and the included pnpm lockfile:

- TypeScript and generated Next.js route types: passed.
- Next.js 16.3.4 production build, including standalone output: passed.
- Complete local suite: 13 tests passed, 0 failed. This includes real production-server tests, an in-memory PostgreSQL migration/permissions suite and captured Supabase HTTP contract tests.
- All 76 original design assets match the existing Site source byte for byte.
- The Render Blueprint validates against the current official JSON Schema retrieved from `https://render.com/schema/render.yaml.json`.
- A fresh production build passes with `DATA_BACKEND=supabase` without requiring a real secret at build time. Runtime configuration is checked by the health endpoint.
- Network tests use Render's `RENDER_EXTERNAL_URL`, including a sign-in request carrying an internal proxy Host header. Cloud mode with missing credentials returns HTTP 503 and does not create a local fallback database.
- Original asset packs restore 78 files from an empty directory; every restored file matches the original. No server secret configuration or private account-table code appears in the public JavaScript bundle.

The integration suite verifies unauthenticated browsing of the three clients; rejection of spoofed OpenAI headers; real registration and password login; session-cookie attributes; two devices reading the same account's saved data; separate-account isolation; request-origin checks; password hashes; request-size limits; authenticated original-image upload; rejection of a falsely labeled image; uploaded-file ownership; and records, media and sessions surviving an actual server restart. Logout revokes only that device's session.

Windows sandbox restrictions prevented the first local service check and standalone link copying. The same production build and integration suite passed with approved local execution outside those restrictions.

Docker is not installed in this session, so the Docker image has not been run. Visual browser automation was blocked because the Windows browser URL could not be determined reliably; no new screenshot verification is claimed. The original client UI and asset files are retained, with login URLs and account copy changed for independent authentication.

No external host has been provisioned. The owner declined paid hosting. The active root `render.yaml` now specifies Render Free compute with Supabase durable data and no paid disk. It passes the current official Render JSON Schema. The paid SQLite/disk example remains inactive. No hosted accounts, private care data, uploaded files, credentials or local runtime state are included in this repository. A real Supabase project, private bucket and Render account authorization are still required before live deployment and real cloud end-to-end checks. Local PostgreSQL and HTTP contract tests do not claim that a remote Supabase project has been tested. There is no new live website URL yet.
