# Rift v3 — sandbox widget demo

Smallest possible Vite + React app that signs a user in via the v3 sandbox widget.

## What it does

- Mounts `<RiftProvider environment="sandbox">` — auth flows through `widget.sandbox.riftfi.com`.
- Sandbox-built widget runs the OTP step **plus** a Touch ID / Face ID enrolment on signup, so new accounts are non-custodial out of the gate.
- After sign-in, the app reads `user.address` + `user.accessToken` from `useRift()`.

No SDK, no GIS script, no PasskeyHelper boilerplate in the demo — the widget handles all of it.

## Run it

```bash
npm install
cp .env.example .env       # then paste your sandbox project key
npm run dev                # opens http://localhost:5173
```

## Required env

| Var | Notes |
|---|---|
| `VITE_RIFT_API_KEY` | Sandbox project key from the Rift dashboard. |

The widget URL + backend URL are baked into `@rift-finance/react@0.3.0` via `environment="sandbox"`.

## Notes

- **Mobile responsive.** Single column, 440 px max-width, 48 px tap targets, safe-area padding.
- **The widget origin must be allow-listed** on your project (it already is for `widget.sandbox.riftfi.com` on the seed sandbox project).
- For prod, drop the `environment` prop — defaults to `"production"` and points at `widget.riftfi.xyz`.
