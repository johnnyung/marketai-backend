import { query, transaction } from '../db/index.js';

interface FuturesContract {
  symbol: string;
  name: string;
  multiplier: number;
  initial_margin: number;
  maintenance_margin: number;
  day_trade_margin: number;
}

interface FuturesPosition {
  id: number;
  portfolio_id: number;
  symbol: string;
  contract_month: string;
  contracts: number;
  entry_price: number;
  current_price: number;
  multiplier: number;
  margin_per_contract: number;
  unrealized_pnl: number;
}

/**
 * Get futures contract specifications
 */
export async function getContractSpecs(symbol: string): Promise<FuturesContract> {
  const result = await query(
    'SELECT * FROM futures_contracts WHERE symbol = $1',
    [symbol]
  );

  if (result.rows.length === 0) {
    throw new Error(`Futures contract ${symbol} not found`);
  }

  return result.rows[0];
}

/**
 * Get all available futures contracts
 */
export async function getAllContracts(): Promise<FuturesContract[]> {
  const result = await query('SELECT * FROM futures_contracts ORDER BY symbol');
  return result.rows;
}

/**
 * Calculate margin requirement
 */
export function calculateMarginRequired(
  contracts: number,
  marginPerContract: number,
  isDayTrade: boolean = false
): number {
  const margin = isDayTrade ? marginPerContract * 0.5 : marginPerContract;
  return Math.abs(contracts) * margin;
}

/**
 * Calculate unrealized P&L
 */
export function calculateUnrealizedPnL(
  contracts: number,
  entryPrice: number,
  currentPrice: number,
  multiplier: number
): number {
  return contracts * (currentPrice - entryPrice) * multiplier;
}

/**
 * Open futures position
 */
export async function openPosition(
  portfolioId: number,
  symbol: string,
  contractMonth: string,
  contracts: number,
  entryPrice: number,
  isDayTrade: boolean = false
) {
  return await transaction(async (client) => {
    // Get contract specs
    const specs = await getContractSpecs(symbol);

    // Calculate margin required
    const marginRequired = calculateMarginRequired(
      contracts,
      isDayTrade ? specs.day_trade_margin : specs.initial_margin,
      isDayTrade
    );

    // Check available cash
    const portfolioResult = await client.query(
      'SELECT current_cash FROM portfolios WHERE id = $1',
      [portfolioId]
    );

    if (portfolioResult.rows.length === 0) {
      throw new Error('Portfolio not found');
    }

    const availableCash = parseFloat(portfolioResult.rows[0].current_cash);

    if (availableCash < marginRequired) {
      throw new Error(
        `Insufficient margin. Required: $${marginRequired.toFixed(2)}, Available: $${availableCash.toFixed(2)}`
      );
    }

    // Calculate expiration date (3rd Friday of contract month)
    const expiration = calculateExpirationDate(contractMonth);

    // Create or update position
    const existingPos = await client.query(
      'SELECT * FROM futures_positions WHERE portfolio_id = $1 AND symbol = $2 AND contract_month = $3',
      [portfolioId, symbol, contractMonth]
    );

    let position;

    if (existingPos.rows.length > 0) {
      // Update existing position
      const existing = existingPos.rows[0];
      const totalContracts = existing.contracts + contracts;
      const newAvgPrice =
        (existing.entry_price * existing.contracts + entryPrice * contracts) /
        totalContracts;

      const updateResult = await client.query(
        `UPDATE futures_positions 
         SET contracts = $1, entry_price = $2, current_price = $3, last_updated = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [totalContracts, newAvgPrice, entryPrice, existing.id]
      );

      position = updateResult.rows[0];
    } else {
      // Create new position
      const insertResult = await client.query(
        `INSERT INTO futures_positions 
         (portfolio_id, symbol, contract_month, contracts, entry_price, current_price, 
          multiplier, margin_per_contract, expiration_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          portfolioId,
          symbol,
          contractMonth,
          contracts,
          entryPrice,
          entryPrice,
          specs.multiplier,
          isDayTrade ? specs.day_trade_margin : specs.initial_margin,
          expiration,
        ]
      );

      position = insertResult.rows[0];
    }

    // Deduct margin from cash
    await client.query(
      'UPDATE portfolios SET current_cash = current_cash - $1 WHERE id = $2',
      [marginRequired, portfolioId]
    );

    // Record trade
    await client.query(
      `INSERT INTO trades 
       (portfolio_id, asset_type, symbol, action, quantity, price, total_cost)
       VALUES ($1, 'futures', $2, $3, $4, $5, $6)`,
      [
        portfolioId,
        symbol,
        contracts > 0 ? 'buy' : 'short',
        Math.abs(contracts),
        entryPrice,
        marginRequired,
      ]
    );

    return position;
  });
}

/**
 * Close futures position
 */
export async function closePosition(
  portfolioId: number,
  positionId: number,
  exitPrice: number
) {
  return await transaction(async (client) => {
    // Get position
    const posResult = await client.query(
      'SELECT * FROM futures_positions WHERE id = $1 AND portfolio_id = $2',
      [positionId, portfolioId]
    );

    if (posResult.rows.length === 0) {
      throw new Error('Position not found');
    }

    const position = posResult.rows[0];

    // Calculate P&L
    const pnl = calculateUnrealizedPnL(
      position.contracts,
      position.entry_price,
      exitPrice,
      position.multiplier
    );

    // Return margin to cash
    const marginToReturn =
      Math.abs(position.contracts) * position.margin_per_contract;

    // Update portfolio cash (margin + P&L)
    await client.query(
      'UPDATE portfolios SET current_cash = current_cash + $1 WHERE id = $2',
      [marginToReturn + pnl, portfolioId]
    );

    // Record closing trade
    await client.query(
      `INSERT INTO trades 
       (portfolio_id, asset_type, symbol, action, quantity, price, total_cost, notes)
       VALUES ($1, 'futures', $2, $3, $4, $5, $6, $7)`,
      [
        portfolioId,
        position.symbol,
        position.contracts > 0 ? 'sell' : 'cover',
        Math.abs(position.contracts),
        exitPrice,
        pnl,
        `Closed position. P&L: $${pnl.toFixed(2)}`,
      ]
    );

    // Delete position
    await client.query('DELETE FROM futures_positions WHERE id = $1', [
      positionId,
    ]);

    return { pnl, position };
  });
}

/**
 * Update position prices and P&L
 */
export async function updatePositionPrices(
  portfolioId: number,
  prices: Record<string, number>
) {
  const positions = await query(
    'SELECT * FROM futures_positions WHERE portfolio_id = $1',
    [portfolioId]
  );

  for (const position of positions.rows) {
    const currentPrice = prices[position.symbol];
    if (currentPrice !== undefined) {
      const unrealizedPnl = calculateUnrealizedPnL(
        position.contracts,
        position.entry_price,
        currentPrice,
        position.multiplier
      );

      await query(
        `UPDATE futures_positions 
         SET current_price = $1, unrealized_pnl = $2, last_updated = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [currentPrice, unrealizedPnl, position.id]
      );
    }
  }
}

/**
 * Get portfolio futures positions
 */
export async function getPortfolioPositions(
  portfolioId: number
): Promise<FuturesPosition[]> {
  const result = await query(
    'SELECT * FROM futures_positions WHERE portfolio_id = $1',
    [portfolioId]
  );
  return result.rows;
}

/**
 * Calculate total margin used
 */
export async function calculateTotalMargin(
  portfolioId: number
): Promise<number> {
  const result = await query(
    `SELECT SUM(ABS(contracts) * margin_per_contract) as total_margin
     FROM futures_positions WHERE portfolio_id = $1`,
    [portfolioId]
  );

  return parseFloat(result.rows[0]?.total_margin || '0');
}

/**
 * Calculate expiration date (3rd Friday of month)
 */
function calculateExpirationDate(contractMonth: string): string {
  // contractMonth format: "Dec2024", "Mar2025"
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const month = contractMonth.slice(0, 3);
  const year = parseInt(contractMonth.slice(3));
  const monthNum = monthMap[month];

  // Find 3rd Friday
  const date = new Date(year, monthNum, 1);
  let fridays = 0;

  while (fridays < 3) {
    if (date.getDay() === 5) fridays++;
    if (fridays < 3) date.setDate(date.getDate() + 1);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Check for margin calls
 */
export async function checkMarginCall(portfolioId: number): Promise<boolean> {
  const positions = await getPortfolioPositions(portfolioId);
  const portfolio = await query(
    'SELECT current_cash FROM portfolios WHERE id = $1',
    [portfolioId]
  );

  const availableCash = parseFloat(portfolio.rows[0].current_cash);
  
  // Calculate total unrealized P&L
  const totalUnrealizedPnL = positions.reduce(
    (sum, pos) => sum + parseFloat(pos.unrealized_pnl.toString()),
    0
  );

  // Calculate maintenance margin requirement
  const maintenanceMarginRequired = positions.reduce(
    (sum, pos) => sum + Math.abs(pos.contracts) * pos.margin_per_contract * 0.75,
    0
  );

  const accountValue = availableCash + totalUnrealizedPnL;

  return accountValue < maintenanceMarginRequired;
}

export const futuresService = {
  getContractSpecs,
  getAllContracts,
  calculateMarginRequired,
  calculateUnrealizedPnL,
  openPosition,
  closePosition,
  updatePositionPrices,
  getPortfolioPositions,
  calculateTotalMargin,
  checkMarginCall,
};
