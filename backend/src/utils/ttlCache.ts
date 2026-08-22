type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * 프로세스 메모리 TTL 캐시.
 * TourAPI 트래픽을 줄이기 위해 12~24시간 주기로 응답을 재사용한다.
 */
export class TtlCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly defaultTtlMs = TWELVE_HOURS_MS,
    private readonly now: () => number = Date.now,
  ) {}

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (this.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    const ttl = Math.min(Math.max(ttlMs, 1), TWENTY_FOUR_HOURS_MS);
    this.store.set(key, { value, expiresAt: this.now() + ttl });
  }

  async wrap<T>(key: string, loader: () => Promise<T>, ttlMs = this.defaultTtlMs): Promise<T> {
    const hit = this.get<T>(key);
    if (hit !== undefined) return hit;
    const value = await loader();
    this.set(key, value, ttlMs);
    return value;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const tourApiCache = new TtlCache(TWELVE_HOURS_MS);
