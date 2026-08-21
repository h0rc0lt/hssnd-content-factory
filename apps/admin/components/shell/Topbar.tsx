"use client";

import { Menu, Search } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-void/70 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-mist hover:bg-white/[0.06] hover:text-paper md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist" strokeWidth={1.75} />
        <input
          type="text"
          disabled
          placeholder="Search characters, media, workflows… (soon)"
          className="w-full rounded-lg border border-border bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-mist placeholder:text-mist/70 disabled:cursor-not-allowed"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-right text-xs leading-tight text-mist sm:block">
          <span className="block font-medium text-paper">Staff Admin</span>
          Internal tool
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-gradient-to-br from-flow/30 to-pulse/30 text-xs font-semibold text-paper">
          SA
        </div>
      </div>
    </header>
  );
}
