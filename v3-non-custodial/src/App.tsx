/**
 * Rift v3 non-custodial demo — widget edition.
 *
 * Drops the SDK auth ceremony in favour of <RiftAuth>: the sandbox
 * widget runs the OTP + passkey enrolment for us, then hands back an
 * accessToken + address. The whole flow stays in one tab — no SDK,
 * no GIS script load, no PasskeyHelper boilerplate in this file.
 *
 * Read top-to-bottom; it's intentionally tiny so the wiring is obvious.
 */

import { RiftProvider, RiftAuth, useRift } from "@rift-finance/react";

const RIFT_API_KEY = import.meta.env.VITE_RIFT_API_KEY ?? "";

// Set VITE_WIDGET_URL when you're testing against a local sandbox
// widget (`npm run dev` in Rift-FI/sandbox-widget, which serves on
// http://localhost:6001 by default). Wins over `environment` — that's
// how rift-react's prop precedence works.
//
// Leave it unset to use the deployed widget for the chosen
// environment (widget.sandbox.riftfi.com for sandbox).
const WIDGET_URL = import.meta.env.VITE_WIDGET_URL || undefined;

export function App() {
  if (!RIFT_API_KEY) {
    return (
      <Page>
        <Card>
          <h2 style={s.h2}>Missing API key</h2>
          <p style={s.sub}>
            Set <code style={s.code}>VITE_RIFT_API_KEY</code> to a sandbox
            project key, then re-run <code style={s.code}>npm run dev</code>.
          </p>
        </Card>
      </Page>
    );
  }

  return (
    <RiftProvider
      apiKey={RIFT_API_KEY}
      environment="sandbox"
      widgetUrl={WIDGET_URL}
    >
      <Shell />
      <RiftAuth />
    </RiftProvider>
  );
}

function Shell() {
  const { user, isOpen, open, signOut, error } = useRift();

  return (
    <Page>
      <header style={s.header}>
        <h1 style={s.h1}>Rift v3</h1>
        <span style={s.subtitle}>sandbox · widget auth</span>
      </header>

      {error && <div style={s.error}>{error}</div>}

      {!user ? (
        <Card>
          <h2 style={s.h2}>Sign in</h2>
          <p style={s.sub}>
            Tap below to open the Rift widget. New accounts on the sandbox
            build are minted as v3 — the widget asks for Touch ID / Face ID
            after the OTP step, and the key never leaves your device.
          </p>
          <button
            style={s.btnPrimary}
            onClick={() => open({ mode: "signup" })}
            disabled={isOpen}
          >
            {isOpen ? "opening…" : "Sign in / create account"}
          </button>
        </Card>
      ) : (
        <Card>
          <h2 style={s.h2}>Signed in</h2>
          <Field label="user id" value={user.user} mono />
          <Field label="EVM address" value={user.address} mono />
          {user.btcAddress && (
            <Field label="BTC address" value={user.btcAddress} mono />
          )}
          {user.expiresAt && (
            <Field
              label="access token expires"
              value={new Date(user.expiresAt).toLocaleString()}
            />
          )}
          <button style={s.btnGhost} onClick={() => signOut()}>
            Sign out
          </button>
        </Card>
      )}

      <footer style={s.footer}>
        backend: <code style={s.code}>sandbox.riftfi.com</code>
      </footer>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div style={s.page}>{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={s.card}>{children}</div>;
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={s.field}>
      <div style={s.fieldLabel}>{label}</div>
      <div style={{ ...s.fieldValue, fontFamily: mono ? s.mono : undefined }}>
        {value}
      </div>
    </div>
  );
}

const s = {
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  page: {
    colorScheme: "dark",
    background: "#0a0a0b",
    color: "#e7e7ea",
    minHeight: "100vh",
    padding: "max(24px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom))",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  } as React.CSSProperties,
  header: {
    width: "100%",
    maxWidth: 440,
    display: "flex",
    alignItems: "baseline",
    gap: 10,
  } as React.CSSProperties,
  h1: { margin: 0, fontWeight: 600, letterSpacing: "-0.02em", fontSize: 28 } as React.CSSProperties,
  subtitle: { color: "#888892", fontSize: 13 } as React.CSSProperties,
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#14141a",
    border: "1px solid #2a2a35",
    borderRadius: 14,
    padding: "22px 20px",
    boxSizing: "border-box",
  } as React.CSSProperties,
  h2: { fontSize: 18, fontWeight: 600, margin: "0 0 8px" } as React.CSSProperties,
  sub: { color: "#9ca3af", fontSize: 14, marginTop: 0, lineHeight: 1.5 } as React.CSSProperties,
  field: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #20202a",
  } as React.CSSProperties,
  fieldLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#6b7280",
    marginBottom: 4,
  } as React.CSSProperties,
  fieldValue: {
    fontSize: 13,
    color: "#e7e7ea",
    wordBreak: "break-all",
    lineHeight: 1.5,
  } as React.CSSProperties,
  btnPrimary: {
    width: "100%",
    background: "#7c5cff",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "14px 16px",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 14,
    minHeight: 48,
  } as React.CSSProperties,
  btnGhost: {
    width: "100%",
    background: "transparent",
    color: "#e7e7ea",
    border: "1px solid #2a2a35",
    borderRadius: 10,
    padding: "12px 16px",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 18,
    minHeight: 44,
  } as React.CSSProperties,
  error: {
    width: "100%",
    maxWidth: 440,
    background: "#3a1414",
    border: "1px solid #6b2424",
    color: "#fca5a5",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
  } as React.CSSProperties,
  footer: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 8,
  } as React.CSSProperties,
  code: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "0.9em",
    background: "#1a1a22",
    padding: "1px 6px",
    borderRadius: 4,
  } as React.CSSProperties,
};
