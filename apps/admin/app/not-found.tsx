import Link from "next/link";
import { Sparkles, Home } from "lucide-react";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { Button } from "@/components/ui/button";

/** Global 404 — outside the (dashboard) route group, so it renders without
 *  the authenticated app chrome (sidebar/topbar assume a logged-in staff
 *  session; an unmatched route shouldn't imply one). */
export default function GlobalNotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <AmbientBackground />
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-signal to-pulse shadow-glow-signal">
          <Sparkles className="h-5 w-5 text-void" strokeWidth={2.25} />
        </span>
        <h1 className="font-display text-xl font-semibold text-paper">Page not found</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-mist">
          This route doesn&apos;t exist in HSSND Content Factory.
        </p>
        <Link href="/" className="mt-6 inline-block">
          <Button size="sm">
            <Home className="h-3.5 w-3.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
