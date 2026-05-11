import { useState } from "react";
import {
  RiftProvider,
  RiftAuth,
  useRift,
  type RiftUser,
} from "@rift-finance/react";

// All three auth methods (Google, email OTP, phone OTP) are surfaced
// automatically by the Rift widget UI. We don't have to wire each one
// individually — whatever you've enabled in your project's Auth tab
// shows up inside the modal.

const API_KEY = (import.meta as any).env.VITE_RIFT_API_KEY as string;

// Hit the BACKEND directly (service.riftfi.xyz). The wrapper at
// developers.riftfi.xyz also works once its CORS deploy is live, but
// the backend is the canonical endpoint and is always CORS-permitted
// for the project's known_origins (which now includes widget.riftfi.xyz
// + whatever localhost ports you've added).
const BACKEND_URL = "https://service.riftfi.xyz";

// Decode a JWT's payload without verifying — we only need the identity
// claims (email / phoneNumber) to know which contact to send the OTP to.
// Server-side verification still happens on every authenticated call.
function decodeJwt(token: string): { email?: string; phoneNumber?: string } {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function App() {
  if (!API_KEY) {
    return (
      <div className="app">
        <Header />
        <div className="card" style={{ borderColor: "rgba(239,68,68,0.4)" }}>
          <p>
            Missing <code>VITE_RIFT_API_KEY</code>. Copy{" "}
            <code>.env.example</code> to <code>.env.local</code> and paste
            your project's API key from the{" "}
            <a href="https://service.riftfi.xyz" target="_blank" rel="noreferrer">
              Rift dashboard
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <RiftProvider apiKey={API_KEY}>
      <RiftAuth />
      <Page />
    </RiftProvider>
  );
}

function Header() {
  return (
    <div className="brand">
      <div className="brand-logo">R</div>
      <div>
        <div className="brand-name">Rift React Example</div>
      </div>
      <div style={{ flex: 1 }} />
      <span className="brand-tag">@rift-finance/react</span>
    </div>
  );
}

function Page() {
  const { user, isAuthenticated, open, signOut } = useRift();

  return (
    <div className="app">
      <Header />
      <h1>Wallet demo</h1>
      <p className="lede">
        Sign in with Google, email, or phone — Rift provisions a wallet on
        first use. Then send a test transaction from the form below.
      </p>

      {!isAuthenticated ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p className="card-title" style={{ margin: "0 0 20px" }}>
            Step 1 — Sign in
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => open({ mode: "signin" })}
          >
            Sign in with Rift
          </button>
          <p
            style={{
              marginTop: 14,
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            Google / Email / Phone — all in one modal.
          </p>
        </div>
      ) : (
        <>
          <WalletInfo user={user!} onSignOut={signOut} />
          <BalancesCard />
          <SendForm />
          <SignerCard />
        </>
      )}

      <Footer />
    </div>
  );
}

function WalletInfo({
  user,
  onSignOut,
}: {
  user: RiftUser;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="card">
      <p className="card-title">Signed in</p>
      <div className="row">
        <span className="row-label">User ID</span>
        <span className="row-value">{user.user}</span>
      </div>
      <div className="row">
        <span className="row-label">EVM address</span>
        <span className="row-value">{user.address}</span>
      </div>
      {user.btcAddress && (
        <div className="row">
          <span className="row-label">BTC address</span>
          <span className="row-value">{user.btcAddress}</span>
        </div>
      )}
      <div className="row">
        <span className="row-label">Access token</span>
        <span className="row-value">{user.accessToken.slice(0, 24)}…</span>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        style={{ marginTop: 16 }}
        onClick={() => onSignOut()}
      >
        Sign out
      </button>
    </div>
  );
}

function SendForm() {
  const { getAccessToken, user } = useRift();
  const [to, setTo] = useState("");
  const [value, setValue] = useState("1");
  const [token, setToken] = useState("USDC");
  const [chain, setChain] = useState("polygon");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [result, setResult] = useState<
    | { kind: "success"; hash: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  // Pull the user's signup contact (email or phone) off the JWT so we
  // know where to send the transaction-confirmation OTP. The token's
  // claims are what verifyTransactionOtp verifies the code against.
  const identity = user ? decodeJwt(user.accessToken) : {};
  const otpTarget = identity.email
    ? { email: identity.email }
    : identity.phoneNumber
      ? { phone: identity.phoneNumber }
      : null;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to || !value || !otpTarget) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/otp/send`, {
        method: "POST",
        headers: {
          "X-API-Key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(otpTarget),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }
      setStep("otp");
    } catch (err: any) {
      setResult({ kind: "error", message: err?.message || "Couldn't send OTP" });
    } finally {
      setBusy(false);
    }
  };

  const submitSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) return;
    setBusy(true);
    setResult(null);
    try {
      // getAccessToken silently refreshes if the current one is stale.
      const accessToken = await getAccessToken();
      // Backend mounts transactions at /transaction (singular). The
      // spend action requires `otpCode` collected via /otp/send above.
      const res = await fetch(`${BACKEND_URL}/transaction/spend`, {
        method: "POST",
        headers: {
          "X-API-Key": API_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, value, token, chain, otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      setResult({ kind: "success", hash: data.hash || JSON.stringify(data) });
      setStep("form");
      setOtpCode("");
    } catch (err: any) {
      setResult({ kind: "error", message: err?.message || "Send failed" });
    } finally {
      setBusy(false);
    }
  };

  if (!otpTarget) {
    return (
      <div className="card">
        <p className="card-title">Step 2 — Send a transaction</p>
        <div className="status status-error">
          ✗ Couldn't read email/phone from your access token. The /otp/send
          step needs one of those to deliver the confirmation code.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="card-title">Step 2 — Send a transaction</p>

      {step === "form" ? (
        <form onSubmit={sendOtp}>
          <div>
            <label htmlFor="to">Recipient address</label>
            <input
              id="to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
              required
            />
          </div>

          <div className="grid-2">
            <div>
              <label htmlFor="value">Amount</label>
              <input
                id="value"
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="token">Token</label>
              <select
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              >
                <option>USDC</option>
                <option>USDT</option>
                <option>ETH</option>
                <option>MATIC</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="chain">Chain</label>
            <select
              id="chain"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
            >
              <option value="polygon">Polygon</option>
              <option value="base">Base</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="ethereum">Ethereum</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || !to}
          >
            {busy ? "Sending code…" : `Continue — confirm with OTP`}
          </button>

          {result?.kind === "success" && (
            <div className="status status-success">
              ✓ Sent. Tx hash: <code>{result.hash}</code>
            </div>
          )}
          {result?.kind === "error" && (
            <div className="status status-error">✗ {result.message}</div>
          )}
        </form>
      ) : (
        <form onSubmit={submitSpend}>
          <div
            style={{
              padding: 14,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            Sending <strong>{value} {token}</strong> on <strong>{chain}</strong>{" "}
            to <code style={{ fontSize: 12 }}>{to.slice(0, 6)}…{to.slice(-4)}</code>.
            <br />
            A confirmation code was sent to{" "}
            <strong>{otpTarget.email ?? otpTarget.phone}</strong>.
          </div>

          <div>
            <label htmlFor="otp">Transaction OTP</label>
            <input
              id="otp"
              type="text"
              inputMode={otpTarget.email ? "text" : "numeric"}
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(
                  otpTarget.email
                    ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    : e.target.value.replace(/[^0-9]/g, "")
                )
              }
              maxLength={otpTarget.email ? 4 : 4}
              placeholder={otpTarget.email ? "ABCD" : "0000"}
              required
              autoFocus
              style={{
                textAlign: "center",
                letterSpacing: "0.5em",
                fontFamily: "ui-monospace, monospace",
                fontSize: 20,
                fontWeight: 600,
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || otpCode.length < 4}
          >
            {busy ? "Signing & broadcasting…" : "Confirm and send"}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => {
              setStep("form");
              setOtpCode("");
              setResult(null);
            }}
          >
            ← Back
          </button>

          {result?.kind === "error" && (
            <div className="status status-error">✗ {result.message}</div>
          )}
        </form>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// BalancesCard — read-only example. Demonstrates that any backend
// endpoint behind authenticateJWT is callable with the widget's
// access token. GET /wallet/chain-balance returns the user's token
// balances across registered chains.
// ────────────────────────────────────────────────────────────────────
interface Balance {
  amount: number;
  token: string;
  chain: string;
  chainName: string;
}

function BalancesCard() {
  const { getAccessToken } = useRift();
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [chain, setChain] = useState("polygon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const params = new URLSearchParams({ chain });
      const res = await fetch(
        `${BACKEND_URL}/wallet/chain-balance?${params}`,
        {
          headers: {
            "X-API-Key": API_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      setBalances(Array.isArray(data.data) ? data.data : []);
    } catch (e: any) {
      setError(e?.message || "Couldn't load balances");
      setBalances(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <span>Token balances</span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={fetchBalances}
          disabled={busy}
        >
          {busy ? "Loading…" : balances ? "Refresh" : "Load"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
        <select value={chain} onChange={(e) => setChain(e.target.value)}>
          <option value="polygon">Polygon</option>
          <option value="base">Base</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="ethereum">Ethereum</option>
          <option value="optimism">Optimism</option>
          <option value="bnb">BNB Chain</option>
        </select>
      </div>

      {error && <div className="status status-error">✗ {error}</div>}

      {balances && balances.length === 0 && (
        <div className="empty">
          No balances on {chain}. (Send some funds to your smart wallet to see them here.)
        </div>
      )}

      {balances && balances.length > 0 && (
        <div>
          {balances.map((b, i) => (
            <div key={i} className="balance-row">
              <div className="balance-meta">
                <span className="token-badge">{b.token}</span>
                <span className="chain-label">{b.chainName || b.chain}</span>
              </div>
              <div className="balance-amount">{formatAmount(b.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {!balances && !error && !busy && (
        <div className="empty">
          Click <strong>Load</strong> to fetch live balances for this chain.
        </div>
      )}
    </div>
  );
}

function formatAmount(n: number): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  if (n < 1) return n.toFixed(6).replace(/\.?0+$/, "");
  if (n < 1000) return n.toFixed(4).replace(/\.?0+$/, "");
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// ────────────────────────────────────────────────────────────────────
// SignerCard — proxy-wallet/sign-message demo. Shows that Rift can
// sign arbitrary data on behalf of the user's EOA. The same endpoint
// pattern (proxy-wallet/send-transaction) lets you make any smart
// contract call by passing raw `data` (calldata) — see README.
//
// No OTP required for sign-message; it doesn't move funds.
// ────────────────────────────────────────────────────────────────────
function SignerCard() {
  const { getAccessToken } = useRift();
  const [message, setMessage] = useState("Hello from Rift!");
  const [chain, setChain] = useState("ETHEREUM");
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sign = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSignature(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${BACKEND_URL}/proxy-wallet/sign-message`, {
        method: "POST",
        headers: {
          "X-API-Key": API_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chain, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }
      setSignature(data.signature || JSON.stringify(data));
    } catch (e: any) {
      setError(e?.message || "Sign failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <p className="card-title">Sign a message (arbitrary signing)</p>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
        Same model Rift uses for smart contract calls — your wallet signs whatever payload Rift's
        backend constructs. Try a personal message here; swap the endpoint to{" "}
        <code>/proxy-wallet/send-transaction</code> with raw calldata for an actual contract call.
      </p>

      <form onSubmit={sign}>
        <div className="grid-2">
          <div>
            <label htmlFor="signer-chain">Chain</label>
            <select
              id="signer-chain"
              value={chain}
              onChange={(e) => setChain(e.target.value)}
            >
              <option value="ETHEREUM">Ethereum</option>
              <option value="POLYGON">Polygon</option>
              <option value="BASE">Base</option>
              <option value="ARBITRUM">Arbitrum</option>
              <option value="OPTIMISM">Optimism</option>
            </select>
          </div>
          <div style={{ alignSelf: "end" }}>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={busy || !message}
            >
              {busy ? "Signing…" : "Sign message"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="signer-msg">Message</label>
          <textarea
            id="signer-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        {error && <div className="status status-error">✗ {error}</div>}
        {signature && (
          <div className="status status-success">
            ✓ Signed.<br />
            <code style={{ fontSize: 11 }}>{signature}</code>
          </div>
        )}
      </form>
    </div>
  );
}

function Footer() {
  return (
    <p className="footer">
      Built with{" "}
      <a
        href="https://www.npmjs.com/package/@rift-finance/react"
        target="_blank"
        rel="noreferrer"
      >
        @rift-finance/react
      </a>{" "}
      ·{" "}
      <a
        href="https://service.riftfi.xyz/docs"
        target="_blank"
        rel="noreferrer"
      >
        Docs
      </a>
    </p>
  );
}
