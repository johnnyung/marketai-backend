# 🚀 MarketAI Backend API

Complete backend server for MarketAI with real-time market data, news, and AI chat.

## Features

✅ **Real-time Stock Prices** - Alpha Vantage API integration  
✅ **AI Chat Proxy** - Claude API (no CORS issues!)  
✅ **News Aggregation** - Latest market news via NewsAPI  
✅ **Game Mode API** - Trading simulator with P&L tracking  
✅ **Economic Calendar** - Events & earnings dates  

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

### 3. Run Development Server
```bash
npm run dev
```

Server runs on `http://localhost:3001`

---

## 🌐 Deploy to Railway (Production)

### 1. Sign up for Railway
- Go to [railway.app](https://railway.app)
- Sign up with GitHub (free)
- You get $5 credit/month (plenty for this!)

### 2. Deploy from GitHub
```bash
# Push this folder to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main

# In Railway:
# - Click "New Project"
# - Select "Deploy from GitHub repo"
# - Choose your repo
# - Railway auto-detects and deploys!
```

### 3. Add Environment Variables
In Railway dashboard:
- Go to your project → Variables
- Add each variable from `.env.example`
- Click "Deploy" to restart

### 4. Get Your API URL
Railway provides: `https://your-app.railway.app`

Copy this URL - you'll need it for the frontend!

---

## 📋 Getting API Keys (All FREE to start!)

### Alpha Vantage (Stock Prices)
1. Go to https://www.alphavantage.co/support/#api-key
2. Enter email
3. Get instant API key
4. Free tier: 500 calls/day (plenty!)

### NewsAPI (Market News)
1. Go to https://newsapi.org/register
2. Sign up free
3. Get API key
4. Free tier: 100 calls/day

### Claude API (AI Chat)
1. Go to https://console.anthropic.com/
2. Sign up
3. Add payment method (only charged for usage)
4. Create API key
5. Cost: ~$5-10/month based on chat usage

---

## 🔌 API Endpoints

### Market Data
```
GET  /api/market/price/:ticker       - Get current price
GET  /api/market/quote/:ticker       - Get detailed quote
POST /api/market/batch               - Get multiple prices
```

### News
```
GET  /api/news/latest                - Latest market news
GET  /api/news/company/:name         - Company-specific news
GET  /api/news/headlines             - Top business headlines
```

### AI Chat
```
POST /api/ai/chat                    - General chat
POST /api/ai/summarize               - Summarize article
POST /api/ai/analyze-trade           - Analyze trade decision
POST /api/ai/trading-advice          - Get position advice
```

### Game Mode
```
GET  /api/game/portfolio/:userId     - Get portfolio
POST /api/game/trade                 - Execute trade
POST /api/game/reset/:userId         - Reset portfolio
```

### Events
```
GET  /api/events/calendar            - Economic calendar
GET  /api/events/earnings            - Earnings calendar
```

---

## 🧪 Testing Endpoints

```bash
# Test health check
curl http://localhost:3001/health

# Test stock price
curl http://localhost:3001/api/market/price/ACHR

# Test AI chat (requires API key in .env)
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is CPI?"}]
  }'
```

---

## 💰 Cost Estimate

**Free Tier (Recommended to Start):**
- Railway: $5 credit/month (covers hosting)
- Alpha Vantage: Free (500 calls/day)
- NewsAPI: Free (100 calls/day)
- Claude API: ~$5-10/month (your usage)

**Total: ~$10-15/month**

**If you need more:**
- Railway: $20/month (more resources)
- Alpha Vantage Premium: $49/month (unlimited calls)
- Polygon.io: $29/month (real-time data)

---

## 🔧 Development Scripts

```bash
npm run dev          # Run development server with hot reload
npm run build        # Build for production
npm start            # Run production server
```

---

## 🐛 Troubleshooting

### "API key not configured"
- Check `.env` file exists
- Verify API keys are correct
- Restart server after adding keys

### "Rate limit exceeded"
- Alpha Vantage free tier: 500 calls/day
- Add small delays between calls
- Consider upgrading to paid tier

### CORS errors
- Check `FRONTEND_URL` in `.env`
- Must match your frontend URL exactly
- Include protocol (http:// or https://)

---

## 📚 Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Get API keys
3. ✅ Test all endpoints
4. ✅ Update frontend to use backend URL
5. ✅ Deploy frontend to Vercel
6. 🎉 MarketAI is LIVE!

---

## 🤝 Support

Questions? Check:
- Railway docs: https://docs.railway.app
- Alpha Vantage docs: https://www.alphavantage.co/documentation
- Claude API docs: https://docs.anthropic.com

---

Built with ❤️ for learning to trade without risk!
# Force rebuild
