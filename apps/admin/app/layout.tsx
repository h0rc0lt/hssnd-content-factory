import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HSSND Content Factory",
  description:
    "Multi-character AI influencer content operating system — manage every character, reference set, generation workflow, and publishing schedule in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
