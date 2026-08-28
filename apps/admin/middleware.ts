import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth gate for the whole admin app.
 *
 * This repo is public and its route paths are guessable — POST
 * /api/characters and POST /api/lora/train had no auth at all, and
 * /api/lora/train submits a real, billed fal.ai training job per call.
 * This is the simplest gate that gets a credential check in front of
 * every page and route before any of that goes further.
 *
 * /api/cron/* is excluded on purpose: it already authenticates via
 * CRON_SECRET as a bearer token (see app/api/cron/poll-training/route.ts),
 * and Vercel Cron does not send Basic Auth credentials — gating it here
 * too would just break the cron.
 *
 * /api/webhooks/* is excluded for the same reason — kie.ai calls these
 * routes directly to deliver generation results and won't send Basic Auth
 * either. They authenticate via a `?secret=` query param checked against
 * KIE_WEBHOOK_SECRET instead (see app/api/webhooks/kie/route.ts).
 */
export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !password) {
    return new NextResponse(
      "Server misconfigured: BASIC_AUTH_USER and BASIC_AUTH_PASSWORD are not set.",
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPassword = decoded.slice(separatorIndex + 1);
    if (suppliedUser === user && suppliedPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HSSND Admin"' },
  });
}

export const config = {
  matcher: ["/((?!api/cron|api/webhooks|_next/static|_next/image|favicon.ico).*)"],
};
