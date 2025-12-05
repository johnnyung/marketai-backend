import fmp from "./fmpService.js";

class TickerUniverseService {
  private cache: string[] | null = null;

  async refreshUniverse(): Promise<string[]> {
    // Try stable SP500 endpoint first
    try {
        const stableSP = await (fmp as any).getSP500Stable?.();
        if (Array.isArray(stableSP) && stableSP.length > 10) {
            console.log("[UNIVERSE] Loaded SP500 via Stable endpoint.");
            this.cache = stableSP.map((x: any) => x.symbol).filter(Boolean);
            return this.cache;
        }
    } catch (e) {}
    
    const sp = await fmp.getSP500Constituents();

    if (Array.isArray(sp) && sp.length > 0) {
      this.cache = sp.map((x: any) => x.symbol).filter(Boolean);
    } else {
      // Fallback list if FMP fails
      this.cache = ["AAPL","MSFT","NVDA","AMZN","GOOGL","META","TSLA","JPM","UNH","LLY"];
    }
    return this.cache;
  }

  async getUniverse(): Promise<string[]> {
    if (this.cache) return this.cache;
    return await this.refreshUniverse();
  }

  isValidTicker(ticker: string): boolean {
    if (!ticker) return false;
    // If cache isn't loaded, load it asynchronously (this check is synchronous, so we try best effort)
    // In a real app, this might need to be async or initialized on start.
    // For now, if cache exists, check it. If not, assume true to avoid blocking flow (soft validation).
    if (!this.cache) return true; 
    return this.cache.includes(ticker.toUpperCase());
  }
}

export default new TickerUniverseService();
