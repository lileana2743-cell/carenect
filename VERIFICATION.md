# Verification

Verified locally on 4 November 2026 with Node.js 24.22.1 and the included pnpm lockfile:

- TypeScript and generated Next.js route types: passed.
- Next.js 16.3.4 production build, including standalone output: passed.
- Real production-server integration suite: 6 tests passed, 0 failed.
- All 76 original design assets match the existing Site source byte for byte.
- The Render Blueprint validates against the current official JSON Schema retrieved from `https://render.com/schema/render.yaml.json`.
- A fresh production build and the complete six-test suite pass with Render's `RENDER_EXTERNAL_URL` environment configuration, including a sign-in request carrying an internal proxy Host header.

The integration suite verifies unauthenticated browsing of the three clients; rejection of spoofed OpenAI headers; real registration and password login; session-cookie attributes; two devices reading the same account's saved data; separate-account isolation; request-origin checks; password hashes; request-size limits; authenticated original-image upload; rejection of a falsely labeled image; uploaded-file ownership; and records, media and sessions surviving an actual server restart. Logout revokes only that device's session.

Windows sandbox restrictions prevented the first local service check and standalone link copying. The same production build and integration suite passed with approved local execution outside those restrictions.

Docker is not installed in this session, so the Docker image has not been run. Visual browser automation was blocked because the Windows browser URL could not be determined reliably; no new screenshot verification is claimed. The original client UI and asset files are retained, with login URLs and account copy changed for independent authentication.

No external host has been provisioned. The owner declined paid hosting, so the validated paid Render configuration is retained only as an inactive example at `deploy/render.paid.yaml.example`. Only official JSON Schema validation is claimed for that example, not live infrastructure validation. No hosted accounts, private care data, uploaded files, credentials or local runtime state are included in this repository. A running public website requires a separate hosting setup; there is no new live website URL yet.
