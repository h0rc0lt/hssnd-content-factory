"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Browser-only Supabase client.
 *
 * Uses the public publishable key — safe to expose in client bundles by
 * design (unlike the service_role key in lib/supabase/server.ts). This
 * client is used for exactly one thing: calling
 * `storage.from(bucket).uploadToSignedUrl(...)` from NewCharacterForm.
 *
 * Per the storage-js SDK's own docs, uploadToSignedUrl requires *no* RLS
 * policy on `storage.objects` — the signed token itself is the
 * authorization, generated server-side with the service_role key (see
 * app/api/characters/[id]/upload-url/route.ts). So the publishable key
 * here doesn't need any bucket policy to work; it only exists to
 * construct the client instance.
 */
let cachedClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase browser credentials. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your environment."
    );
  }

  cachedClient = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
