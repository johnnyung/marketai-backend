// backend/src/services/fmpService.ts
// Financial Modeling Prep API Integration
// Complete financial data for 20-point vetting
// Free Tier: 250 calls/day
// API Docs: https://site.financialmodelingprep.com/developer/docs

import axios from 'axios';

const FMP_API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface CompanyProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  defaultImage: boolean;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

interface IncomeStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  grossProfitRatio: number;
  researchAndDevelopmentExpenses: number;
  generalAndAdministrativeExpenses: number;
  sellingAndMarketingExpenses: number;
  sellingGeneralAndAdministrativeExpenses: number;
  otherExpenses: number;
  operatingExpenses: number;
  costAndExpenses: number;
  interestIncome: number;
  interestExpense: number;
  depreciationAndAmortization: number;
  ebitda: number;
  ebitdaratio: number;
  operatingIncome: number;
  operatingIncomeRatio: number;
  totalOtherIncomeExpensesNet: number;
  incomeBeforeTax: number;
  incomeBeforeTaxRatio: number;
  incomeTaxExpense: number;
  netIncome: number;
  netIncomeRatio: number;
  eps: number;
  epsdiluted: number;
  weightedAverageShsOut: number;
  weightedAverageShsOutDil: number;
  link: string;
  finalLink: string;
}

interface BalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  cashAndShortTermInvestments: number;
  netReceivables: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  propertyPlantEquipmentNet: number;
  goodwill: number;
  intangibleAssets: number;
  goodwillAndIntangibleAssets: number;
  longTermInvestments: number;
  taxAssets: number;
  otherNonCurrentAssets: number;
  totalNonCurrentAssets: number;
  otherAssets: number;
  totalAssets: number;
  accountPayables: number;
  shortTermDebt: number;
  taxPayables: number;
  deferredRevenue: number;
  otherCurrentLiabilities: number;
  totalCurrentLiabilities: number;
  longTermDebt: number;
  deferredRevenueNonCurrent: number;
  deferredTaxLiabilitiesNonCurrent: number;
  otherNonCurrentLiabilities: number;
  totalNonCurrentLiabilities: number;
  otherLiabilities: number;
  capitalLeaseObligations: number;
  totalLiabilities: number;
  preferredStock: number;
  commonStock: number;
  retainedEarnings: number;
  accumulatedOtherComprehensiveIncomeLoss: number;
  othertotalStockholdersEquity: number;
  totalStockholdersEquity: number;
  totalEquity: number;
  totalLiabilitiesAndStockholdersEquity: number;
  minorityInterest: number;
  totalLiabilitiesAndTotalEquity: number;
  totalInvestments: number;
  totalDebt: number;
  netDebt: number;
  link: string;
  finalLink: string;
}

interface CashFlowStatement {
  date: string;
  symbol: string;
  reportedCurrency: string;
  cik: string;
  fillingDate: string;
  acceptedDate: string;
  calendarYear: string;
  period: string;
  netIncome: number;
  depreciationAndAmortization: number;
  deferredIncomeTax: number;
  stockBasedCompensation: number;
  changeInWorkingCapital: number;
  accountsReceivables: number;
  inventory: number;
  accountsPayables: number;
  otherWorkingCapital: number;
  otherNonCashItems: number;
  netCashProvidedByOperatingActivities: number;
  investmentsInPropertyPlantAndEquipment: number;
  acquisitionsNet: number;
  purchasesOfInvestments: number;
  salesMaturitiesOfInvestments: number;
  otherInvestingActivites: number;
  netCashUsedForInvestingActivites: number;
  debtRepayment: number;
  commonStockIssued: number;
  commonStockRepurchased: number;
  dividendsPaid: number;
  otherFinancingActivites: number;
  netCashUsedProvidedByFinancingActivities: number;
  effectOfForexChangesOnCash: number;
  netChangeInCash: number;
  cashAtEndOfPeriod: number;
  cashAtBeginningOfPeriod: number;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  link: string;
  finalLink: string;
}

interface FinancialRatios {
  symbol: string;
  date: string;
  period: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashConversionCycle: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEBT: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  fixedAssetTurnover: number;
  assetTurnover: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  payoutRatio: number;
  operatingCashFlowSalesRatio: number;
  freeCashFlowOperatingCashFlowRatio: number;
  cashFlowCoverageRatios: number;
  shortTermCoverageRatios: number;
  capitalExpenditureCoverageRatio: number;
  dividendPaidAndCapexCoverageRatio: number;
  dividendPayoutRatio: number;
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  dividendYield: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

class FMPService {
  
  /**
   * Get comprehensive company profile
   */
  async getCompanyProfile(ticker: string): Promise<CompanyProfile | null> {
    try {
      console.log(`🏢 FMP: Fetching profile for ${ticker}...`);
      
      const response = await axios.get<CompanyProfile[]>(`${BASE_URL}/profile/${ticker.toUpperCase()}`, {
        params: { apikey: FMP_API_KEY },
        timeout: 5000
      });

      if (!response.data || response.data.length === 0) {
        console.log(`  ⚠️ ${ticker}: No profile data`);
        return null;
      }

      const profile = response.data[0];
      console.log(`  ✓ ${ticker}: ${profile.companyName} | $${(profile.mktCap / 1e9).toFixed(2)}B market cap`);
      
      return profile;
      
    } catch (error: any) {
      console.error(`  ✗ FMP profile error for ${ticker}:`, error.message);
      return null;
    }
  }

  /**
   * Get income statements (annual)
   */
  async getIncomeStatement(ticker: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<IncomeStatement[]> {
    try {
      console.log(`💰 FMP: Fetching income statement for ${ticker} (${period})...`);
      
      const response = await axios.get<IncomeStatement[]>(`${BASE_URL}/income-statement/${ticker.toUpperCase()}`, {
        params: {
          period,
          limit,
          apikey: FMP_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.length} ${period} statements for ${ticker}`);
      return response.data;
      
    } catch (error: any) {
      console.error(`  ✗ FMP income statement error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get balance sheets
   */
  async getBalanceSheet(ticker: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<BalanceSheet[]> {
    try {
      console.log(`📊 FMP: Fetching balance sheet for ${ticker} (${period})...`);
      
      const response = await axios.get<BalanceSheet[]>(`${BASE_URL}/balance-sheet-statement/${ticker.toUpperCase()}`, {
        params: {
          period,
          limit,
          apikey: FMP_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.length} ${period} balance sheets for ${ticker}`);
      return response.data;
      
    } catch (error: any) {
      console.error(`  ✗ FMP balance sheet error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get cash flow statements
   */
  async getCashFlowStatement(ticker: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<CashFlowStatement[]> {
    try {
      console.log(`💵 FMP: Fetching cash flow for ${ticker} (${period})...`);
      
      const response = await axios.get<CashFlowStatement[]>(`${BASE_URL}/cash-flow-statement/${ticker.toUpperCase()}`, {
        params: {
          period,
          limit,
          apikey: FMP_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.length} ${period} cash flow statements for ${ticker}`);
      return response.data;
      
    } catch (error: any) {
      console.error(`  ✗ FMP cash flow error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get financial ratios (CRITICAL for vetting!)
   */
  async getFinancialRatios(ticker: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5): Promise<FinancialRatios[]> {
    try {
      console.log(`📐 FMP: Fetching ratios for ${ticker} (${period})...`);
      
      const response = await axios.get<FinancialRatios[]>(`${BASE_URL}/ratios/${ticker.toUpperCase()}`, {
        params: {
          period,
          limit,
          apikey: FMP_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.length} ${period} ratio sets for ${ticker}`);
      return response.data;
      
    } catch (error: any) {
      console.error(`  ✗ FMP ratios error for ${ticker}:`, error.message);
      return [];
    }
  }

  /**
   * Get complete fundamentals package (ONE CALL to get everything!)
   */
  async getCompleteFundamentals(ticker: string): Promise<{
    profile: CompanyProfile | null;
    incomeStatement: IncomeStatement[];
    balanceSheet: BalanceSheet[];
    cashFlow: CashFlowStatement[];
    ratios: FinancialRatios[];
  }> {
    console.log(`\n📦 FMP: Fetching complete fundamentals package for ${ticker}...`);
    
    const [profile, incomeStatement, balanceSheet, cashFlow, ratios] = await Promise.all([
      this.getCompanyProfile(ticker),
      this.getIncomeStatement(ticker, 'annual', 3),
      this.getBalanceSheet(ticker, 'annual', 3),
      this.getCashFlowStatement(ticker, 'annual', 3),
      this.getFinancialRatios(ticker, 'annual', 3)
    ]);

    console.log(`✅ Complete fundamentals retrieved for ${ticker}\n`);
    
    return {
      profile,
      incomeStatement,
      balanceSheet,
      cashFlow,
      ratios
    };
  }

  /**
   * Calculate key metrics for 20-point vetting
   */
  calculateKeyMetrics(fundamentals: {
    profile: CompanyProfile | null;
    incomeStatement: IncomeStatement[];
    balanceSheet: BalanceSheet[];
    cashFlow: CashFlowStatement[];
    ratios: FinancialRatios[];
  }): {
    profitability: {
      netMargin: number;
      grossMargin: number;
      operatingMargin: number;
      roe: number;
      roa: number;
    };
    liquidity: {
      currentRatio: number;
      quickRatio: number;
      cashRatio: number;
    };
    leverage: {
      debtToEquity: number;
      debtRatio: number;
      interestCoverage: number;
    };
    efficiency: {
      assetTurnover: number;
      inventoryTurnover: number;
      receivablesTurnover: number;
    };
    growth: {
      revenueGrowth: number;
      earningsGrowth: number;
      fcfGrowth: number;
    };
    valuation: {
      pe: number;
      pb: number;
      ps: number;
      priceToFCF: number;
    };
  } | null {
    const { profile, incomeStatement, balanceSheet, cashFlow, ratios } = fundamentals;
    
    if (!ratios || ratios.length === 0) {
      return null;
    }

    const latest = ratios[0];
    const latestIncome = incomeStatement[0];
    const previousIncome = incomeStatement[1];
    const latestCF = cashFlow[0];
    const previousCF = cashFlow[1];

    // Calculate growth rates
    const revenueGrowth = latestIncome && previousIncome
      ? ((latestIncome.revenue - previousIncome.revenue) / previousIncome.revenue) * 100
      : 0;

    const earningsGrowth = latestIncome && previousIncome
      ? ((latestIncome.netIncome - previousIncome.netIncome) / Math.abs(previousIncome.netIncome)) * 100
      : 0;

    const fcfGrowth = latestCF && previousCF
      ? ((latestCF.freeCashFlow - previousCF.freeCashFlow) / Math.abs(previousCF.freeCashFlow)) * 100
      : 0;

    return {
      profitability: {
        netMargin: latest.netProfitMargin || 0,
        grossMargin: latest.grossProfitMargin || 0,
        operatingMargin: latest.operatingProfitMargin || 0,
        roe: latest.returnOnEquity || 0,
        roa: latest.returnOnAssets || 0
      },
      liquidity: {
        currentRatio: latest.currentRatio || 0,
        quickRatio: latest.quickRatio || 0,
        cashRatio: latest.cashRatio || 0
      },
      leverage: {
        debtToEquity: latest.debtEquityRatio || 0,
        debtRatio: latest.debtRatio || 0,
        interestCoverage: latest.interestCoverage || 0
      },
      efficiency: {
        assetTurnover: latest.assetTurnover || 0,
        inventoryTurnover: latest.inventoryTurnover || 0,
        receivablesTurnover: latest.receivablesTurnover || 0
      },
      growth: {
        revenueGrowth,
        earningsGrowth,
        fcfGrowth
      },
      valuation: {
        pe: latest.priceEarningsRatio || 0,
        pb: latest.priceToBookRatio || 0,
        ps: latest.priceToSalesRatio || 0,
        priceToFCF: latest.priceToFreeCashFlowsRatio || 0
      }
    };
  }

  /**
   * Check API health
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const profile = await this.getCompanyProfile('AAPL');
      return profile !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get usage info
   */
  getUsageInfo(): string {
    return `
FMP FREE Tier:
- Rate Limit: 250 calls/day
- Company profiles ✓
- Income statements ✓
- Balance sheets ✓
- Cash flow statements ✓
- Financial ratios ✓
- Historical prices ✓

Premium: $29/month for unlimited calls
    `.trim();
  }
}

export default new FMPService();
