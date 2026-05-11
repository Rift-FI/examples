# React example

Minimal Vite + React app showing **`@rift-finance/react`** end-to-end:

1. Sign in with Google, email, or phone (whichever the project has enabled — all three appear in one modal).
2. Display the user's wallet info (EVM address, BTC address, access token).
3. Send a transaction via Rift's `/transactions/send` endpoint.

## Run it

```bash
cp .env.example .env.local        # ships a working sandbox API key
npm install
npm run dev                       # http://localhost:5190
```

`.env.example` already contains a public test API key, so the copy
gives you a runnable app with zero edits. Open `.env.local` and swap
in your own `sk_…` from the [Rift dashboard](https://service.riftfi.xyz)
when you're ready to point at your own project.

> Vite reads `.env.local` (gitignored), not `.env.example`. The copy
> step is what wires Vite to your config.

## Where to look in the code

| File | What it does |
|---|---|
| [`src/App.tsx`](./src/App.tsx) | Whole UI — sign-in card, wallet info, send form. Read top to bottom. |
| [`src/main.tsx`](./src/main.tsx) | Mounts React. Nothing Rift-specific. |
| [`src/styles.css`](./src/styles.css) | Plain CSS — no framework. Replace however you like. |

The actual Rift glue is ~20 lines:

```tsx
<RiftProvider apiKey={API_KEY}>
  <RiftAuth />
  <Page />
</RiftProvider>

// inside Page:
const { user, isAuthenticated, open, signOut, getAccessToken } = useRift();
```

That's the whole API. `<RiftAuth />` renders nothing until you call `open()`. After sign-in, `user` is populated and `getAccessToken()` gives you a valid JWT for API calls.

## Auth methods

Google, Apple, email OTP, and phone OTP all appear in the modal automatically — zero setup. The widget UI surfaces every available method; merchant code doesn't pick.

## What's in this example

| Card | Endpoint | What it shows |
|---|---|---|
| Wallet info | — (purely from `useRift().user`) | The signed-in identity + addresses + token preview |
| Balances | `GET /wallet/chain-balance` | Live token balances per chain |
| Send a transaction | `POST /otp/send` → `POST /transaction/spend` | Two-step OTP-gated transfer |
| Sign a message | `POST /proxy-wallet/sign-message` | Arbitrary signing; swap to `/proxy-wallet/send-transaction` for smart-contract calls (pass raw calldata in `data`) |

All calls authenticate with `Authorization: Bearer <token>` from `useRift().getAccessToken()` (silently refreshes if near expiry) plus `X-API-Key: sk_…`.

## REST vs `@rift-finance/wallet`

This example uses raw `fetch` for clarity. The wallet SDK works in the browser too — see [`../README.md`](../README.md) for the bridging snippet and tradeoffs.
