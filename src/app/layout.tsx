import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Seat & Device Tracking",
  description: "Seat assignments, network port mapping, and device ownership.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
