# Account setup

Copy `.env.example` to `.env`, enter the project's Supabase URL and publishable (or legacy anon) key, and restart the local server. Do not use a service-role or secret key.

In Supabase Authentication settings, enable anonymous sign-ins. Username-only accounts are guest users in Supabase Auth: the username is stored in `auth.users.raw_user_meta_data.username` alongside the unique user ID. No public table or SQL migration is needed. Display names are not unique login credentials or permission identifiers.

The Supabase SDK stores and refreshes the browser's session. Clearing browser storage or using another device loses access to an anonymous account; Google/email identity linking is a separate follow-up. This does not connect a YouTube account.

Rebuild the locally served client after editing onboarding.js:

`npx esbuild onboarding.js --bundle --format=esm --minify --outfile=onboarding.bundle.js`

Live account verification is pending an available active Supabase project. Creation and restoration were blocked by Supabase's account-wide free-project limit. The interface never reports a cloud save when no project is configured.
