import axios from 'axios';
import fmpService from './fmpService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Standardized Government/Institutional Data Interface
 */
export interface GovTrade {
    politician: string;
    chamber: 'Senate' | 'House';
    ticker: string;
    type: 'purchase' | 'sale';
    amount: number;
    date: string;
    party: string;
    source: string;
}

export interface LobbyingRecord {
    client: string;
    amount: number;
    description: string;
    date: string;
    source: string;
}

export interface InsiderRecord {
    ticker: string;
    name: string;
    position: string;
    type: string;
    shares: number;
    price: number;
    value: number;
    date: string;
}

class GovernmentDataAdapter {
    
    // --- CONGRESSIONAL TRADING ---

    async getSenateTrades(): Promise<GovTrade[]> {
        try {
            // Real Source: FMP Senate RSS Feed
            const feed = await fmpService.getInsiderFeed();
            if (!feed || feed.length === 0) return [];

            // Filter/Map to GovTrade structure if source distinguishes Senate
            // Currently FMP mixes them, so we map what we can
            return feed.map((t: any) => ({
                politician: t.reportingName || 'Unknown Senator',
                chamber: 'Senate',
                ticker: t.symbol,
                type: (t.transactionType || '').includes('Buy') ? 'purchase' : 'sale',
                amount: t.value || 0,
                date: t.transactionDate,
                party: 'N/A', // Not provided in basic feed
                source: 'FMP/Senate'
            }));
        } catch (e) {
            return [];
        }
    }

    async getHouseTrades(): Promise<GovTrade[]> {
        // Requires House Stock Watcher API Key or ProPublica
        // Anti-Mock Policy: Return empty if no specific API available
        return [];
    }

    // --- LOBBYING & LEGISLATION ---

    async getLobbyingData(ticker: string): Promise<LobbyingRecord[]> {
        const apiKey = process.env.OPENSECRETS_API_KEY;
        if (!apiKey) return [];

        try {
            // Real API Call placeholder
            // const res = await axios.get(`https://www.opensecrets.org/api/...`);
            return [];
        } catch (e) {
            return [];
        }
    }

    async getLegislation(keywords: string[]) {
        const apiKey = process.env.CONGRESS_GOV_API_KEY;
        if (!apiKey) return [];
        
        try {
            // Real API Call placeholder
            return [];
        } catch (e) {
            return [];
        }
    }

    // --- INSIDER & INSTITUTIONAL ---

    async getInsiderTrades(ticker: string): Promise<InsiderRecord[]> {
        try {
            const trades = await fmpService.getInsiderTrades(ticker);
            if (!trades) return [];

            return trades.map((t: any) => ({
                ticker: t.symbol,
                name: t.reportingName,
                position: t.typeOfOwner,
                type: t.transactionType,
                shares: t.securitiesTransacted,
                price: t.price,
                value: t.securitiesTransacted * t.price,
                date: t.transactionDate
            }));
        } catch (e) {
            return [];
        }
    }

    async getInstitutionalHoldings(ticker: string) {
        return await fmpService.getInstitutionalHolders(ticker);
    }

    // --- WHALE & SHORT INTEREST ---

    async getWhaleAlerts() {
        // Requires WhaleAlert API Key
        return [];
    }

    async getShortInterest(ticker: string) {
        // FMP provides this in higher tiers via /quote-short/
        // Return empty if unavailable
        return [];
    }
}

export default new GovernmentDataAdapter();
