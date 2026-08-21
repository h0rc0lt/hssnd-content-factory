"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AmbientBackground } from "./AmbientBackground";

/**
 * Top-level app chrome: sidebar + topbar + responsive content area.
 * Desktop-first (this is a dense internal ops tool), with a slide-in drawer
 * for the sidebar below the md breakpoint rather than a broken layout.
 *
 * Pure layout/composition — no data fetching, no business logic. Pages
 * decide what goes in the content area.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen">
      <AmbientBackground />

      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-void/80 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar onNavigate={() => setMobileNavOpen(false)} />
          </div>
          <button
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="absolute right-4 top-5 rounded-lg p-2 text-mist hover:bg-white/[0.06] hover:text-paper"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
