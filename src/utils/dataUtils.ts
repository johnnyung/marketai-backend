import crypto from 'crypto';

export const generateContentHash = (source: string, title: string, date: string): string => {
  const str = `${source}-${title}-${date}`;
  return crypto.createHash('sha256').update(str).digest('hex');
};

export const extractTickers = (text: string): string[] => {
  if (!text) return [];
  const regex = /\b[A-Z]{2,5}\b/g;
  const matches = text.match(regex) || [];
  // Filter out common words that look like tickers
  const stopWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'CEO', 'CFO', 'USA', 'USD', 'GDP', 'CPI', 'NFT', 'ETF']);
  return [...new Set(matches.filter(t => !stopWords.has(t)))];
};
