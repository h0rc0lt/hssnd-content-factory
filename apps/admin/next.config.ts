import type { NextConfig } from "next";

/**
 * HSSND Content Factory — admin app config.
 *
 * Intentionally minimal for Phase 2A (UI shell only). Image remote patterns,
 * redirects, and env-based provider config will be added as real Supabase /
 * n8n / media-CDN integrations land in later phases.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
