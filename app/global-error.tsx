"use client";

// Last-resort error boundary. This catches errors thrown in the ROOT layout
// itself (which the normal error.tsx cannot). It must render its own <html>
// and <body> because it replaces the whole document when it fires.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#050508", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: "420px" }}>
            <h1 style={{ fontSize: "26px", fontWeight: 800, marginBottom: "10px" }}>Something went wrong</h1>
            <p style={{ color: "#9ca3af", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
              We hit an unexpected error. Please try again, or reload the page.
            </p>
            <button
              onClick={reset}
              style={{ background: "#7c3aed", color: "#fff", fontWeight: 600, padding: "12px 24px", borderRadius: "12px", border: "none", cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
