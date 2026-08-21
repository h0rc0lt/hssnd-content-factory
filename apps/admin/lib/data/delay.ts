/**
 * Artificial network latency for mock data functions, so loading states in
 * the UI are real (Suspense boundaries actually suspend) rather than
 * simulated. Remove once these functions hit Supabase, which will have its
 * own real latency.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
