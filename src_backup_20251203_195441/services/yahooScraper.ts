import axios from 'axios';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
];

export async function scrapeRealPrice(ticker: string): Promise<number | null> {
    try {
        // DETERMINISTIC: Rotate based on current minute (0, 1, 2)
        const agentIndex = new Date().getMinutes() % USER_AGENTS.length;
        const agent = USER_AGENTS[agentIndex];

        const response = await axios.get(`https://finance.yahoo.com/quote/${ticker}`, {
            headers: { 'User-Agent': agent },
            timeout: 5000
        });
        
        const match = response.data.match(/regularMarketPrice":{"raw":([\d.]+)/);
        return match ? parseFloat(match[1]) : null;
    } catch (e) {
        return null;
    }
}
