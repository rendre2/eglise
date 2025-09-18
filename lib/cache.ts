/**
 * Système de cache en mémoire avec TTL
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

export class Cache<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes en ms

  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    // Convertir l'itérateur en tableau pour éviter l'erreur de lint
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
