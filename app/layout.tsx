import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BOBAO — Bob Agent Orchestration",
  description: "Monitor and orchestrate IBM Bob CLI agent sessions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans bg-bg text-txt">
        <Navbar />
        <main className="min-h-[calc(100vh-48px)]">{children}</main>
      </body>
    </html>
  );
}
