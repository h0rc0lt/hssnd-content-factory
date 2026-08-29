import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth gate for the whole admin app — TEMPORARILY DISABLED.
 *
 * A mistyped BASIC_AUTH_PASSWORD in Vercel's env vars locked the operator
 * out of their own app with no way to recover the working value (Vercel
 * doesn't allow revealing a saved sensitive env var). Disabled here as a
 * stopgap so the app is reachable again; the whole app is unauthenticated
 * in the meantime, including the billed endpoints this was written to
 * protect (/api/lora/train, /api/generate, /api/swap) — this is expected
 * to be re-enabled (or replaced) once BASIC_AUTH_USER/PASSWORD are reset
 * to known values in Vercel. See the repo's public-repo/guessable-routes
 * rationale in the README's Phase 2K-era Status entry.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/cron|api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
