import Link from "next/link";

import { DATA_SOURCE } from "@/lib/data";

export default function HomePage() {
  return (
    <main data-testid="home-page" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Seat &amp; Device Tracking</h1>
      <p className="mt-3 text-muted">
        Seat assignments, network port mapping, and device ownership across organizational rooms.
      </p>
      <p className="mt-6 text-sm text-muted">
        Data source: <span data-testid="home-data-source" className="code">{DATA_SOURCE}</span>
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/rooms"
          data-testid="home-enter-app"
          className="inline-flex items-center rounded-pill bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Open the app
        </Link>
        <Link
          href="/login"
          data-testid="home-login"
          className="inline-flex items-center rounded-pill border border-border bg-surface px-4 py-2 text-sm font-medium"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
