"use client";

import { useRef, useState, type FormEvent } from "react";
import { navigateSession } from "@/lib/session-navigation";

export function Login() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        // Never render arbitrary server details on a public surface.
        setError(response.status === 401 ? "Incorrect password. Please try again."
          : response.status === 429 ? "Too many attempts. Try again in 15 minutes."
          : "Unable to sign in. Please try again later.");
        return;
      }
      navigateSession("/");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="gg-login">
      <section className="gg-login-card" aria-labelledby="login-title">
        <header className="gg-login-heading">
          <p className="gg-login-eyebrow">GG team · Private access</p>
          <h1 id="login-title">GG Outreach</h1>
          <p className="gg-login-subtitle">Private workspace for the GG team only</p>
        </header>
        <form className="gg-login-form" onSubmit={signIn} aria-busy={busy}>
          <label htmlFor="workspace-password">Workspace password</label>
          <div className="gg-login-password">
            <input id="workspace-password" name="password" autoFocus required
              autoComplete="current-password" spellCheck={false}
              type={visible ? "text" : "password"} value={password}
              aria-invalid={!!error} aria-describedby="login-error"
              onChange={event => { setPassword(event.target.value); setError(""); }} />
            <button type="button" className="gg-login-visibility"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible} aria-controls="workspace-password"
              onClick={() => setVisible(value => !value)}>
              {visible ? "Hide" : "Show"}
            </button>
          </div>
          <p id="login-error" className="gg-login-error" role="alert" aria-atomic="true">{error}</p>
          <button type="submit" className="gg-login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Log in"}
          </button>
        </form>
        <p className="gg-login-help">Ask your workspace administrator for access.</p>
      </section>
    </main>
  );
}
