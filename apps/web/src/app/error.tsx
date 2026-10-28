"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="site-shell">
      <main id="main">
        <div className="page-header">
          <h1>
            Something <em>broke</em>
          </h1>
          <p>
            The page could not be rendered. This has been logged; the rest of
            the archive is still available.
          </p>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <h2>Try again</h2>
            <p>{error.message}</p>
            <button
              type="button"
              className="button button--cobalt"
              onClick={reset}
            >
              Reload this page
            </button>
            <p style={{ marginTop: 24 }}>
              <Link href="/" className="text-link">
                Back to the archive
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
