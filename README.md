# Rift integration examples

Two runnable examples showing how to drop Rift into a frontend. Both
ship with a **public sandbox API key already wired in** — clone, run,
and you're hitting a real Rift project on your first click.

| Example | What it shows | Run with |
|---|---|---|
| [`react-app`](./react-app) | `@rift-finance/react` — provider, modal, hooks, send a transaction | `cd react-app && cp .env.example .env.local && npm install && npm run dev` |
| [`vanilla-html`](./vanilla-html) | `embed.js` on a static HTML page — same flow, no build step | `cd vanilla-html && npx serve .` |

Both examples support **email OTP, phone OTP, Google, and Apple** out of the box — zero setup. Rift handles OAuth and code delivery under the hood; the widget UI surfaces every method automatically.

## Pointing at your own project later

When you want to swap from the sandbox to your own Rift project:

1. Create a project in the [dashboard](https://service.riftfi.xyz) — you'll get an `sk_…` API key.
2. **React example**: open `react-app/.env.local` and replace the value of `VITE_RIFT_API_KEY`.
3. **Vanilla example**: open `vanilla-html/index.html` and replace the key in two places (the `data-project-key` attribute on the embed `<script>` and the `API_KEY` constant in the inline JS).
4. Make sure your local serving origin (e.g. `http://localhost:5190` for React, `http://localhost:3000` for vanilla) is in your project's **Domains** tab. The sandbox project has these origins allowlisted already.

## What each example does

1. **Sign in** — opens the Rift widget. User picks Google / email / phone; their wallet (an EVM smart account + a Bitcoin wallet) is auto-provisioned on first use.
2. **Show wallet info** — displays the signed-in user's id, EVM address, BTC address, and live access token.
3. **Token balances** — `GET /wallet/chain-balance?chain=…` to list all tokens on a chain. Pure read, JWT-authenticated.
4. **Send a transaction** — collects recipient/amount/token/chain → triggers `/otp/send` → user enters the 4-char OTP → `POST /transaction/spend` with the code. Backend signs and broadcasts. Every spend is OTP-gated.
5. **Sign a message** — `POST /proxy-wallet/sign-message` to sign arbitrary data with the user's EOA. Same endpoint family (`/proxy-wallet/send-transaction`) lets you make any smart contract call by passing raw `data` (calldata). No OTP since signing a message doesn't move funds.

Both examples are mobile-responsive (`@media (max-width: 640px)` stacks the grid, drops padding, keeps 44px touch targets).

## REST vs `@rift-finance/wallet` — when to use which on the frontend

After widget sign-in you have an access token. You can hit Rift's endpoints two ways:

| | **Raw REST (what the examples use)** | **`@rift-finance/wallet` SDK** |
|---|---|---|
| Bundle cost | 0 KB | ~50 KB extra |
| Boilerplate | `fetch` + headers per call | One typed method per action |
| Types | You write them | Comes with the package |
| Auth refresh | Use `useRift().getAccessToken()` (refreshes via hidden iframe) | SDK keeps the bearer in memory; no refresh logic — you set the token once |
| Designed for | Browser + server | Server-first; browser usable but not the primary target |

**Rule of thumb:** REST for browser apps that need a few endpoints, especially when you want the widget's silent-refresh behaviour. The wallet SDK shines on the server where you keep a long-lived bearer and want typed calls everywhere.

If you do want to use the wallet SDK in the browser after widget auth, the bridge is one line:

```ts
import Rift from "@rift-finance/wallet";

const rift = new Rift({ apiKey: VITE_RIFT_API_KEY });
const { getAccessToken } = useRift();
rift.setBearerToken(await getAccessToken());

// All typed methods work — auth, wallet, transactions, defi, signer, etc.
const balances = await rift.wallet.getChainBalance({ chain: "POLYGON" });
```

The catch: the SDK doesn't know about the widget's refresh mechanism, so re-call `setBearerToken` before any operation that might run past the token's expiry (or wrap it).
