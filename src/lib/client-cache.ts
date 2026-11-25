type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const dataCache = new Map<string, CacheEntry<unknown>>();
const inFlightCache = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 30_000;

/**
 * Deduplicates simultaneous in-flight requests and caches results briefly in memory
 * so navigating back and forth or mounting sidebar + page together triggers only one fetch.
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = dataCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = inFlightCache.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const promise = fetcher()
    .then((result) => {
      dataCache.set(key, { data: result, expiresAt: Date.now() + ttlMs });
      return result;
    })
    .finally(() => {
      inFlightCache.delete(key);
    });

  inFlightCache.set(key, promise);
  return promise;
}

/**
 * Invalidates cached entries matching a prefix and notifies listeners if requested.
 */
export function invalidateClientCache(keyPrefix: string, eventName?: string) {
  for (const key of dataCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      dataCache.delete(key);
    }
  }
  if (eventName && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}
