/**
 * Client-side data caching layer for admin components
 * Provides in-memory caching with TTL support to reduce API calls
 */

const CACHE_CONFIG = {
  dashboard: { ttl: 30000 }, // 30 seconds
  users: { ttl: 60000 }, // 1 minute
  bookings: { ttl: 30000 }, // 30 seconds
  disputes: { ttl: 30000 }, // 30 seconds
  contactMessages: { ttl: 60000 }, // 1 minute
  settings: { ttl: 120000 }, // 2 minutes
};

class DataCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Generate a cache key from endpoint and parameters
   */
  generateKey(endpoint, params = {}) {
    const paramString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return paramString ? `${endpoint}?${paramString}` : endpoint;
  }

  /**
   * Get cached data if available and not expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data with TTL
   */
  set(key, data, ttlMs) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (pattern === '*' || key.startsWith(pattern) || key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all cache entries
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get or fetch data with deduplication
   * Prevents multiple simultaneous requests for the same data
   */
  async getOrFetch(key, fetchFn, ttlMs, forceRefresh = false) {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached) {
        return { data: cached, fromCache: true };
      }
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Create new request promise
    const requestPromise = (async () => {
      try {
        const response = await fetchFn();
        const data = response.data?.data || response.data;
        
        // Cache the result
        this.set(key, data, ttlMs);
        
        return { data, fromCache: false };
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Update a specific cache entry
   */
  update(key, updateFn) {
    const entry = this.cache.get(key);
    if (entry) {
      const updatedData = updateFn(entry.data);
      entry.data = updatedData;
      entry.timestamp = Date.now();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalEntries = 0;
    let validEntries = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalEntries++;
      if (now <= entry.expiry) {
        validEntries++;
      }
      totalSize += JSON.stringify(entry.data).length;
    }

    return {
      totalEntries,
      validEntries,
      expiredEntries: totalEntries - validEntries,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Singleton instance
const dataCache = new DataCache();

// Export convenience methods for common cache operations
export const cacheKeys = {
  dashboard: () => 'admin:dashboard',
  users: (params = {}) => dataCache.generateKey('admin:users', params),
  bookings: (params = {}) => dataCache.generateKey('admin:bookings', params),
  bookingsSummary: () => 'admin:bookings:summary',
  disputes: (params = {}) => dataCache.generateKey('admin:disputes', params),
  disputesSummary: () => 'admin:disputes:summary',
  contactMessages: (params = {}) => dataCache.generateKey('admin:contactMessages', params),
  settings: () => 'admin:settings',
};

export const invalidateCache = {
  all: () => dataCache.invalidate('*'),
  dashboard: () => dataCache.invalidate('admin:dashboard'),
  users: () => dataCache.invalidate('admin:users'),
  bookings: () => dataCache.invalidate('admin:bookings'),
  disputes: () => dataCache.invalidate('admin:disputes'),
  contactMessages: () => dataCache.invalidate('admin:contactMessages'),
  settings: () => dataCache.invalidate('admin:settings'),
};

export { dataCache as default };