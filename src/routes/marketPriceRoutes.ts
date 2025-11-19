// src/routes/marketPriceRoutes.ts
import express from 'express';
const router = express.Router();

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;

router.get('/price/:ticker', async (req, res) => {
  const { ticker } = req.params;
  
  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json() as any;
    const price = parseFloat(data['Global Quote']?.['05. price'] || '0');
    const change = parseFloat(data['Global Quote']?.['09. change'] || '0');
    const changePercent = parseFloat(data['Global Quote']?.['10. change percent']?.replace('%', '') || '0');
    
    res.json({ 
      success: true, 
      data: { 
        ticker, 
        price, 
        change, 
        changePercent,
        timestamp: new Date().toISOString()
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Price fetch failed' });
  }
});

export default router;
