/**
 * In-memory LRU cache for agent plan results.
 * Keyed by normalised task string (trimmed, lower-cased).
 * Entries expire after TTL_MS (default 10 minutes).
 */

const TTL_MS = 10 * 60 * 1000;   // 10 min
const MAX_ENTRIES = 200;

interface CacheEntry {
  plan: unknown;
  results: unknown[];
  summary: string;
  cachedAt: number;
}

const store = new Map<string, CacheEntry>();

function normalise(task: string): string {
  return task.trim().toLowerCase().replace(/\s+/g, " ");
}

function evict(): void {
  if (store.size < MAX_ENTRIES) return;
  // remove oldest entry
  const oldest = [...store.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt)[0];
  if (oldest) store.delete(oldest[0]);
}

export function getCached(task: string): CacheEntry | null {
  const key = normalise(task);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry;
}

export function setCached(
  task: string,
  plan: unknown,
  results: unknown[],
  summary: string,
): void {
  evict();
  store.set(normalise(task), { plan, results, summary, cachedAt: Date.now() });
}

export function clearCache(): void {
  store.clear();
}

export function cacheStats(): { size: number; keys: string[] } {
  return { size: store.size, keys: [...store.keys()] };
}
