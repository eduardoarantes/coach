# Sign in with Apple (IdP)

Coach Watts uses **Sign in with Apple** on the Auth.js login surfaces (`/oauth/login`, `/login`, `/join`) so the official mobile companion satisfies [App Store Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services) when Google is also offered.

Mobile still uses OAuth 2.0 + PKCE against Coach Watts; SIWA runs in the **system browser** on the IdP page (same pattern as Google).

## Apple Developer setup (Watt Mind team)

1. **Identifiers → App IDs → `com.coachwatts.app`**  
   Enable **Sign In with Apple**.

2. **Identifiers → Services IDs → Create** — registered **`com.coachwatts.web`** (Coach Watts Web Auth)
   - Enable **Sign In with Apple** → Configure
   - Primary App ID: `com.coachwatts.app`
   - Domains: `coachwatts.com`
   - Return URL (Auth.js): `https://coachwatts.com/api/auth/callback/apple`
   - Note: Apple requires `https://` return URLs; local Auth.js Apple smoke uses production callback or a TLS tunnel.

3. **Keys → Create** (Sign in with Apple) — registered **Coach Watts Sign in with Apple**
   - Primary App ID: `com.coachwatts.app` (Services ID grouped)
   - **Key ID:** `4T63PU845X` · **Team ID:** `42K8S6866N`
   - Download the `.p8` once; store in the password manager — never commit

## Environment variables

Set on the hosted coach-wattz deploy (never commit the private key):

| Variable                            | Value                                            |
| ----------------------------------- | ------------------------------------------------ |
| `APPLE_ID`                          | Services ID (e.g. `com.coachwatts.web`)          |
| `APPLE_TEAM_ID`                     | `42K8S6866N`                                     |
| `APPLE_KEY_ID`                      | Key ID from step 3                               |
| `APPLE_PRIVATE_KEY`                 | Full PEM, `\n` escaped in single-line env stores |
| `APPLE_CLIENT_SECRET`               | Optional: pre-built JWT instead of key material  |
| `NUXT_PUBLIC_APPLE_SIGN_IN_ENABLED` | Optional `true` to force-show the button         |

When configured, `runtimeConfig.public.appleSignInEnabled` becomes true and the Apple button appears. The Auth.js client secret JWT is generated at process start via `server/utils/apple-client-secret.ts`.

`NUXT_AUTH_ORIGIN` must remain `https://coachwatts.com/api/auth` in production so the callback path matches Apple’s Return URL.

## Account linking

Apple uses `allowDangerousEmailAccountLinking: true` (same as Google). Stable identity is Apple `sub` on the `Account` row. Returning sign-ins may omit email; a synthetic `…@apple.coachwatts.com` email is only used when Apple does not return one (first-login Hide My Email still provides a relay address).

## App Review

There is **no** Coach Watts-native password. ASC Sign-In Information should hold a **dedicated Google** (or Apple ID) demo account. Notes must say: Safari → Sign in with Apple or Google → return via `coachwatts://oauth/callback`.
