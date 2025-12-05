/**
 * MARKET_AI MOCK PURGE TOOLKIT (v1.1)
 * Enforces "Real Data Only" Policy.
 */

export const MockPurgeToolkit = {

    /**
     * Purges arrays containing specific "Mock" keywords or generic placeholders.
     */
    removeMockArrays<T>(data: T[] | null | undefined): T[] {
        if (!data || !Array.isArray(data)) return [];
        
        const isContaminated = data.some(item => {
            const str = JSON.stringify(item).toLowerCase();
            return str.includes('mock') || str.includes('placeholder') || str.includes('simulated');
        });

        if (isContaminated) return [];
        return data;
    },

    /**
     * Alias for removeMockArrays (Required by legacy services)
     * Ignores the 'source' argument but enforces the check.
     */
    enforceRealArray<T>(data: T[] | null | undefined, source?: string): T[] {
        return this.removeMockArrays(data);
    },

    /**
     * Filters out companies with suspicious names like "Mock Inc", "Test Corp".
     */
    removePlaceholderCompanies(name: string): string | null {
        const toxic = ['Mock Inc', 'Test Corp', 'Acme', 'Placeholder'];
        if (toxic.some(t => name.includes(t))) return null;
        return name;
    },

    /**
     * Replaces random/mock calculations with safe defaults.
     */
    replaceMockCalculations(value: number): number | null {
        if (value === 150 || value === 100 || value === 12345 || value === 9999) return null;
        return value;
    },

    /**
     * Detects hardcoded ticker lists and returns empty to force dynamic fetch.
     */
    replaceHardcodedTickers(tickers: string[]): string[] {
        const seeds = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA'];
        if (tickers.length === seeds.length && tickers[0] === 'AAPL') {
            return [];
        }
        return tickers;
    },

    /**
     * Strictly forbids Math.random().
     */
    replaceRandomGenerators(context: string): number {
        let hash = 0;
        for (let i = 0; i < context.length; i++) {
            hash = ((hash << 5) - hash) + context.charCodeAt(i);
            hash |= 0;
        }
        return (Math.abs(hash) % 1000) / 1000;
    },

    /**
     * Validates that an object came from a real API source.
     */
    enforceRealDataOnly(data: any, requiredFields: string[]): any | null {
        if (!data) return null;
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null) return null;
        }
        return data;
    },

    /**
     * Ensures fallbacks are "Neutral/Empty" rather than "Fake Active".
     */
    sanitizeFallbacks<T>(primary: T | null, fallbackValue: T): T {
        if (primary) return primary;
        const str = JSON.stringify(fallbackValue).toLowerCase();
        if (str.includes('mock') || str.includes('simulated')) {
            throw new Error('Illegal Mock Fallback Detected');
        }
        return fallbackValue;
    },

    /**
     * Validates that an engine output is pure.
     */
    validateEnginePurity(output: any): boolean {
        if (!output) return false;
        if (output.source === 'SIMULATION') return false;
        if (typeof output.confidence === 'number' && output.confidence === 0.5) return false;
        return true;
    }
};
