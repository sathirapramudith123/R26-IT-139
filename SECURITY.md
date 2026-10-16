# Security Policy

Lanka-Link (R26-IT-139) is a final-year research project (IT4010, SLIIT). It handles shop records and
agency-banking data, so security problems are taken seriously even though it is not a commercial product.

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` branch (latest) | ✅ |
| Older branches / commits | ❌ |

Fixes are made on the latest code only.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

1. Use GitHub's private reporting: **Security** tab of this repository → **Report a vulnerability**.
2. Describe what you found, the steps to reproduce it, and what an attacker could do with it.
3. Do not access, change or delete other people's data while testing, and do not run load / denial-of-service
   tests.

You can expect a first reply within **7 days**. If the report is confirmed, we fix it on `main` and tell you
when the fix is in; if it is declined, we explain why.

## How the system is protected

### Accounts and login
- Every API route except sign-in / sign-up / password reset requires a **JWT** (HS256, 8-hour expiry).
- Each user has a `token_version`: changing the password, resetting it, or **Sign out of all devices**
  increases it, so every older token stops working at once.
- Passwords are hashed with **bcrypt** and must be at least **12 characters** with upper case, lower case,
  a number and a symbol, and no spaces (checked on the server, with a live checklist in the apps).
- **Password reset:** a random 32-byte token, stored only as a SHA-256 hash, valid for **1 hour** and usable
  once. The reply is the same whether or not the email exists, and mail errors are not shown to the caller.
- **Sign in with Google:** the ID token is checked with Google (signature and expiry), and the server checks
  that it was issued for this app's client ID, by Google, for a verified email.

### Abuse limits (per IP)
| Endpoint | Limit |
|---|---|
| Login | 10 failed attempts per IP + email in 15 minutes |
| Forgot password | 5 per hour (stops inbox flooding) |
| Register, Google sign-in, reset / change password, sign out everywhere | 10 per hour |

### API and data
- Every request body is validated with **Joi** before it is used.
- Every database query is filtered by the signed-in user's id, so a shop sees only its own records.
- **CORS allowlist** (`CORS_ORIGINS`) and **Helmet** security headers.
- Agency-banking float and cash-pool updates run as **one Postgres transaction with a row lock**, so two
  requests at the same moment cannot corrupt a balance. CBSL daily limits are enforced on the server.
- The Supabase **service-role key**, JWT secret, SMTP password and Google Maps web-service key stay on the
  backend. The apps never call Supabase or the ML service directly; map search for the mobile app goes
  through the backend (`/api/v1/maps/...`).
- The mobile app keeps its token in the platform's secure storage (`flutter_secure_storage`).

### Secrets
`backend/.env`, `frontend/.env.local` and `mobile app/android/local.properties` are git-ignored. Never commit
real keys; if one is ever committed, **revoke it** (removing it from git history is not enough).

## Before deploying

- [ ] `NODE_ENV=production` (reset links are then never printed to the console).
- [ ] A long random `JWT_SECRET` (at least 32 characters), different from development.
- [ ] `CORS_ORIGINS` and `FRONTEND_URL` set to the hosted web address (HTTPS).
- [ ] `TRUST_PROXY=1` when running behind a hosting proxy, so rate limits see the real client IP.
- [ ] Google OAuth client: add the hosted origin; publish the consent screen or add test users.
- [ ] Google Maps keys restricted (Android app / server IP and the APIs they need).
- [ ] SMTP uses an App Password, not the account password.

## Known limitations

- Rate-limit counters are kept in memory: they reset when the server restarts and are not shared between
  several server instances (that would need Redis).
- The web app stores the JWT in `localStorage`, so a cross-site-scripting bug could read it. React escapes
  output by default and no user HTML is rendered, but an httpOnly cookie would be stronger.
- The datasets used to train the ML models are partly simulated (see the model cards in `ML model/`);
  predictions are decision support, not financial advice.
