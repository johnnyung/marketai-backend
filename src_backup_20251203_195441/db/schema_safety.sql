-- News Table
CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    title TEXT,
    summary TEXT,
    source TEXT,
    published_at TIMESTAMP,
    tickers TEXT[],
    sentiment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insider Table
CREATE TABLE IF NOT EXISTS insider_trades (
    id SERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    filing_date TIMESTAMP,
    transaction_date TIMESTAMP,
    reporting_name TEXT,
    transaction_type TEXT,
    securities_transacted NUMERIC,
    price NUMERIC,
    link TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Macro Table
CREATE TABLE IF NOT EXISTS macro_indicators (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    value NUMERIC,
    period TEXT,
    date TIMESTAMP,
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, date)
);
