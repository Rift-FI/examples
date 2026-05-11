# Vanilla HTML example

A single self-contained HTML file showing the **`embed.js`** loader end-to-end:

1. Sign in with Google, email, or phone (all surfaced inside the widget modal).
2. Display the user's wallet info (EVM address, BTC address, access token).
3. Send a transaction via Rift's `/transactions/send` endpoint.

No build step. No framework. Open `index.html` in a browser and you're done.

## Run it

Replace `sk_YOUR_PROJECT_API_KEY` in **two** places near the bottom of [`index.html`](./index.html):

- The `data-project-key` attribute on the `<script>` tag
- The `API_KEY` constant in the inline JS (needed for the send-tx call)

Then either:

```bash
# Option A: Just open the file
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

```bash
# Option B: Serve it (recommended — some browsers limit fetch on file://)
npx serve .            # http://localhost:3000
```

> **Important:** for the widget to recognise the host page, your domain must be added to your project's **Domains** tab in the dashboard. Local dev: add `http://localhost:3000` (or whatever port `serve` picked).

## What the integration looks like

The entire Rift glue is two pieces:

**1. Drop the loader on the page:**

```html
<script
  src="https://widget.riftfi.xyz/embed.js"
  data-project-key="sk_..."
  async
></script>

<button data-rift-trigger>Sign in</button>
```

**2. Listen for `signin-success`:**

```js
Rift.on("signin-success", (user) => {
  // user = { user, address, btcAddress, accessToken }
});
```

That's all the merchant code. The widget owns the modal UI, the auth flow, and the wallet provisioning.

## Auth methods

The widget surfaces what's available — you don't pick in code:

- **Email + OTP**: always on. Rift sends the code from its own infrastructure.
- **Phone + OTP**: always on. Same.
- **Google**: only appears when *you* register your own Google OAuth Client ID and paste it into the project's **Auth** tab in the Rift dashboard. You do not use a Rift-owned Client ID — each project uses its own, which is how Rift's backend strictly scopes Google tokens per project (preventing cross-tenant replay).

Apple Sign In follows the same pattern as Google.

## What's in this example

| Card | Endpoint | What it shows |
|---|---|---|
| Wallet info | — (from `signin-success` event) | User id + addresses + token preview |
| Balances | `GET /wallet/chain-balance` | Live token balances per chain |
| Send a transaction | `POST /otp/send` → `POST /transaction/spend` | Two-step OTP-gated transfer |
| Sign a message | `POST /proxy-wallet/sign-message` | Arbitrary signing; swap to `/proxy-wallet/send-transaction` for smart-contract calls (pass raw calldata in `data`) |

All authenticated calls pass `Authorization: Bearer <user.accessToken>` (from the `signin-success` event) and `X-API-Key: sk_…`.

The whole thing is ~600 lines of HTML + inline JS in one file — no build step, no framework.
