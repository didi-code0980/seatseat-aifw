import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/rooms", label: "Rooms" },
  { href: "/seats", label: "Seats" },
  { href: "/devices", label: "Devices" },
  { href: "/members", label: "Members" },
  { href: "/groups", label: "Groups" },
  { href: "/layout-designer", label: "Layout designer" },
  { href: "/requests", label: "Requests" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <nav data-testid="app-nav" className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-6 py-3">
          <Link href="/" className="mr-4 text-sm font-semibold tracking-tight">
            Seat &amp; Device
          </Link>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.href.slice(1)}`}
              className="rounded-pill px-3 py-1.5 text-sm text-muted hover:bg-canvas hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
