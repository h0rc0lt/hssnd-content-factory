"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/ErrorState";

/**
 * Route-group error boundary. Catches errors thrown by lib/data/* Supabase
 * calls (missing credentials, connection failure, RLS blocking access with
 * no matching policy, etc.) — none of which were reachable in Phase 2A,
 * since mock data never errors.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <ErrorState
        title="Couldn't load this page"
        description="Something went wrong talking to the database. This is usually a missing or incorrect Supabase credential — check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        onRetry={reset}
      />
    </div>
  );
}
