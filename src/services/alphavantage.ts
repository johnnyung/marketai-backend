import fetch from 'node-fetch';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

interface StockPrice {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface StockQuote {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  previousClose: number;
  change: number;
  changePercent: number;
}

/**
 * Get real-time stock price
 */
export async function getStockPrice(ticker: string): Promise<StockPrice> {
  if (!API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`;
  
  const response = await fetch(url);
  const data: any = await response.json();

  if (data['Error Message']) {
    throw new Error(`Invalid ticker: ${ticker}`);
  }

  if (data['Note']) {
    // API rate limit hit
    throw new Error('API rate limit exceeded. Please try again in a minute.');
  }

  const quote = data['Global Quote'];
  
  if (!quote || !quote['05. price']) {
    throw new Error(`No data found for ticker: ${ticker}`);
  }

  return {
    ticker: ticker.toUpperCase(),
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    timestamp: quote['07. latest trading day'],
  };
}

/**
 * Get detailed stock quote
 */
export async function getStockQuote(ticker: string): Promise<StockQuote> {
  if (!API_KEY) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`;
  
  const response = await fetch(url);
  const data: any = await response.json();

  if (data['Error Message']) {
    throw new Error(`Invalid ticker: ${ticker}`);
  }

  const quote = data['Global Quote'];
  
  if (!quote || !quote['05. price']) {
    throw new Error(`No data found for ticker: ${ticker}`);
  }

  return {
    ticker: ticker.toUpperCase(),
    price: parseFloat(quote['05. price']),
    open: parseFloat(quote['02. open']),
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    volume: parseInt(quote['06. volume']),
    previousClose: parseFloat(quote['08. previous close']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
  };
}

/**
 * Get multiple stock prices at once (batched)
 */
export async function getBatchPrices(tickers: string[]): Promise<StockPrice[]> {
  // Alpha Vantage free tier doesn't support batch requests
  // So we'll call them sequentially with a delay
  const prices: StockPrice[] = [];
  
  for (const ticker of tickers) {
    try {
      const price = await getStockPrice(ticker);
      prices.push(price);
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
      // Continue with other tickers
    }
  }
  
  return prices;
}

export const alphaVantageService = {
  getStockPrice,
  getStockQuote,
  getBatchPrices,
};
