import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-only Supabase client, service role key.
 *
 * The `server-only` import throws a build error if this file is ever
 * pulled into a client bundle — a second line of defense on top of naming
 * convention, per the "never put secrets in client-side code" rule.
 *
 * Uses the service role key deliberately: reads in this app happen from
 * Server Components / Route Handlers only, and RLS is enabled with no
 * policies (see migration `enable_rls_no_policies`), so the anon key
 * cannot read anything at all right now. The service role key bypasses
 * RLS by design — this is the intended path until staff Auth + real
 * policies land in a later phase.
 */
let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "in your environment (.env.local locally, Vercel Project Settings in production)."
    );
  }

  cachedClient = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
