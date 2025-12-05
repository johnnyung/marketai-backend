import tickerUniverseService from '../services/tickerUniverseService.js';

// Fallback blocklist for words that MIGHT be tickers but usually aren't in news contexts
// (Even if "A" or "IT" are valid tickers, we filter them in loose text analysis to reduce noise)
const NOISE_WORDS = new Set(['A', 'I', 'IT', 'ON', 'AT', 'GO', 'DO', 'ME', 'MY', 'UP', 'AM', 'OR', 'IS', 'BE', 'BY', 'OF', 'TO', 'IN', 'IF', 'NO', 'WE', 'SO', 'HE', 'AN', 'AS', 'CEO', 'CFO', 'USA', 'GDP', 'SEC', 'FDA', 'EPA', 'IRS', 'DOJ', 'THE', 'AND', 'FOR', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE', 'DAD', 'MOM', 'HEY', 'BIG', 'JOY', 'SAD', 'NEWS', 'INC', 'LTD', 'CORP']);

export const isValidTicker = (text: string): boolean => {
  if (!text) return false;
  const ticker = text.toUpperCase().trim();
  
  // 1. Basic Syntax Check
  if (ticker.length < 1 || ticker.length > 6) return false;
  if (!/^[A-Z0-9-]+$/.test(ticker)) return false;

  // 2. Noise Filter
  if (NOISE_WORDS.has(ticker)) return false;

  // 3. The "Industry Standard" Check
  // Does this ticker actually exist on an exchange?
  return tickerUniverseService.isValidTicker(ticker);
};
