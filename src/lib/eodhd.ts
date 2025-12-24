const API_KEY = process.env.NEXT_PUBLIC_EODHD_API_KEY;
const BASE_URL = 'https://eodhd.com/api';

// Types for EODHD API responses
export interface EODHDQuote {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  change_p: number;
}

export interface EODHDHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

export interface EODHDFundamentals {
  General: {
    Code: string;
    Type: string;
    Name: string;
    Exchange: string;
    CurrencyCode: string;
    CurrencyName: string;
    CurrencySymbol: string;
    CountryName: string;
    CountryISO: string;
    Description: string;
    Category: string;
    UpdatedAt: string;
  };
  ETF_Data?: {
    ISIN: string;
    Company_Name: string;
    Company_URL: string;
    ETF_URL: string;
    Domicile: string;
    Index_Name: string;
    Yield: string;
    Dividend_Paying_Frequency: string;
    Inception_Date: string;
    Max_Annual_Mgmt_Charge: string;
    Ongoing_Charge: string;
    Date_Ongoing_Charge: string;
    NetExpenseRatio: string;
    AnnualHoldingsTurnover: string;
    TotalAssets: string;
    Holdings_Count: number;
    Asset_Allocation: Record<string, { Long: string; Short: string; Net: string }>;
    World_Regions: Record<string, { Equity: string; Fixed_Income: string }>;
    Sector_Weights: Record<string, { Equity: string; Fixed_Income: string }>;
    Top_10_Holdings: Record<string, {
      Code: string;
      Exchange: string;
      Name: string;
      Sector: string;
      Industry: string;
      Country: string;
      Region: string;
      Assets_: string;
    }>;
  };
}

// Get real-time quote for a symbol
export async function getQuote(symbol: string, exchange: string = 'US'): Promise<EODHDQuote | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/real-time/${symbol}.${exchange}?api_token=${API_KEY}&fmt=json`
    );
    if (!response.ok) throw new Error('Failed to fetch quote');
    return await response.json();
  } catch (error) {
    console.error('Error fetching quote:', error);
    return null;
  }
}

// Get historical prices
export async function getHistoricalPrices(
  symbol: string,
  exchange: string = 'US',
  from?: string,
  to?: string
): Promise<EODHDHistoricalPrice[]> {
  try {
    let url = `${BASE_URL}/eod/${symbol}.${exchange}?api_token=${API_KEY}&fmt=json`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch historical prices');
    return await response.json();
  } catch (error) {
    console.error('Error fetching historical prices:', error);
    return [];
  }
}

// Get ETF fundamentals (holdings, allocation, etc.)
export async function getETFFundamentals(
  symbol: string,
  exchange: string = 'US'
): Promise<EODHDFundamentals | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/fundamentals/${symbol}.${exchange}?api_token=${API_KEY}&fmt=json`
    );
    if (!response.ok) throw new Error('Failed to fetch fundamentals');
    return await response.json();
  } catch (error) {
    console.error('Error fetching fundamentals:', error);
    return null;
  }
}

// Search for symbols
export async function searchSymbols(query: string): Promise<Array<{
  Code: string;
  Exchange: string;
  Name: string;
  Type: string;
  Country: string;
  Currency: string;
  ISIN: string;
}>> {
  try {
    const response = await fetch(
      `${BASE_URL}/search/${query}?api_token=${API_KEY}&fmt=json`
    );
    if (!response.ok) throw new Error('Failed to search symbols');
    return await response.json();
  } catch (error) {
    console.error('Error searching symbols:', error);
    return [];
  }
}

// Get multiple quotes at once (for portfolio) - uses server-side API route to avoid CORS
// This counts as 1 API call regardless of how many tickers
export async function getBulkQuotes(
  tickers: string[]
): Promise<Record<string, EODHDQuote>> {
  const results: Record<string, EODHDQuote> = {};

  if (tickers.length === 0) return results;

  try {
    // Use our API route to avoid CORS issues
    const tickerString = tickers.join(',');
    const response = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickerString)}`);

    if (!response.ok) throw new Error('Failed to fetch bulk quotes');

    const data = await response.json();

    // If single ticker, response is an object. If multiple, it's an array
    if (Array.isArray(data)) {
      for (const quote of data) {
        if (quote.code) {
          results[quote.code] = quote;
        }
      }
    } else if (data.code) {
      results[data.code] = data;
    }

    console.log(`[EODHD] Fetched ${Object.keys(results).length} quotes in 1 bulk call`);
  } catch (error) {
    console.error('Error fetching bulk quotes:', error);
  }

  return results;
}

// Helper to parse ticker string like "VWCE.XETRA" into symbol and exchange
export function parseTicker(ticker: string): { symbol: string; exchange: string } {
  const parts = ticker.split('.');
  if (parts.length >= 2) {
    return {
      symbol: parts[0],
      exchange: parts.slice(1).join('.'),
    };
  }
  return { symbol: ticker, exchange: 'US' };
}
