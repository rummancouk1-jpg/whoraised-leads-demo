"use client";
import { useEffect } from "react";
import { report } from "@/components/shell/ErrorReporter";

/** Render errors inside the signed-in workspace: reported (scrubbed, counts-only) and recoverable without losing the session. */
export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { report(error.name, error.message); }, [error]);
  return <main id="main" className="gg-workspace" tabIndex={-1}><div className="gg-container"><div className="gg-empty" role="alert"><h1 className="gg-empty-title">Something went wrong on this page</h1><p>Your leads and edits are safe. We&apos;ve been notified.</p><button className="gg-button" onClick={reset}>Try again</button></div></div></main>;
}
