import fmpService from './fmpService.js';

/**
 * Minimal Futures Service
 * -----------------------
 * No margin logic
 * No portfolio logic
 * No position logic
 *
 * Only exposes:
 *   - getContractSpecs(symbol)
 *   - getAllContracts()
 */

class FuturesService {

    async getContractSpecs(symbol: string) {
        const quote = await fmpService.getPrice(symbol);

        return {
            symbol,
            name: quote?.name || symbol,
            price: quote?.price || 0,
            multiplier: 1,
            initial_margin: 0,
            maintenance_margin: 0
        };
    }

    async getAllContracts() {
        const contracts = ['CL=F', 'GC=F', 'SI=F', 'NG=F', 'ES=F', 'NQ=F'];
        const data = await fmpService.getBatchPrices(contracts);

        return data.map((d: any) => ({
            symbol: d.symbol,
            name: d.name,
            price: d.price
        }));
    }
}

export default new FuturesService();
