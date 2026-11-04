import type { Metadata } from "next";
import "./globals.css";
import "./care.css";

export const metadata: Metadata = {
  title: "Carenect · Care, connected",
  description: "Connecting seniors, families and caregivers, with care in every day.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Carenect", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">{children}</body>
    </html>
  );
}
