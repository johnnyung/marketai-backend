// src/services/intelligenceCache.ts
// SMART CACHING: Only run AI analysis once per day or on manual refresh

interface CachedIntelligence {
  data: any;
  generatedAt: Date;
  expiresAt: Date;
}

class IntelligenceCacheService {
  private cache: CachedIntelligence | null = null;

  /**
   * Get cached intelligence or generate new if expired
   */
  async getIntelligence(forceRefresh: boolean = false): Promise<any> {
    // Check if we have valid cached data
    if (!forceRefresh && this.isValid()) {
      console.log('✅ Using cached intelligence (generated:', this.cache!.generatedAt.toLocaleString(), ')');
      return this.cache!.data;
    }

    // Cache expired or force refresh - return null to trigger new generation
    console.log('🔄 Cache expired or refresh requested - will generate new intelligence');
    return null;
  }

  /**
   * Save new intelligence to cache
   */
  saveIntelligence(data: any): void {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Expire at midnight

    this.cache = {
      data: data,
      generatedAt: now,
      expiresAt: tomorrow
    };

    console.log(`✅ Intelligence cached until: ${tomorrow.toLocaleString()}`);
  }

  /**
   * Check if cached data is still valid
   */
  private isValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const now = new Date();
    return now < this.cache.expiresAt;
  }

  /**
   * Manually invalidate cache
   */
  invalidate(): void {
    console.log('🗑️ Cache invalidated');
    this.cache = null;
  }

  /**
   * Get cache status
   */
  getStatus(): any {
    if (!this.cache) {
      return {
        cached: false,
        message: 'No cached data'
      };
    }

    return {
      cached: true,
      generatedAt: this.cache.generatedAt,
      expiresAt: this.cache.expiresAt,
      isValid: this.isValid()
    };
  }
}

export default new IntelligenceCacheService();
