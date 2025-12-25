/**
 * Investment Tracking - Google Apps Script
 *
 * This script fetches:
 * 1. Historical prices (monthly data) - Uses Yahoo Finance API
 * 2. Current prices - Uses Yahoo Finance API
 * 3. TER (Total Expense Ratio) for ETFs
 *
 * Usage:
 * - Historical: ?ticker=VWCE.DE&startDate=2021-01-01&endDate=2024-12-31
 * - Current: ?ticker=VWCE.DE&current=true
 * - TER: ?ticker=VWCE.DE&ter=true
 *
 * Supported tickers:
 * - ETFs: SWDA.MI, VWCE.DE, etc.
 * - Crypto: BTC-EUR, ETH-EUR, etc.
 */

function doGet(e) {
  const ticker = e.parameter.ticker;
  const startDate = e.parameter.startDate;
  const endDate = e.parameter.endDate;
  const current = e.parameter.current === 'true';
  const fetchTer = e.parameter.ter === 'true';

  // Log request for debugging
  Logger.log('Received request: ' + JSON.stringify(e.parameter));

  try {
    // Handle TER request
    if (fetchTer) {
      const terData = getTER(ticker);
      return ContentService.createTextOutput(JSON.stringify(terData))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle current price request
    if (current) {
      const priceData = getCurrentPriceYahoo(ticker);
      return ContentService.createTextOutput(JSON.stringify({
        ticker: ticker,
        currentPrice: priceData.price,
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        date: new Date().toISOString().split('T')[0],
        source: 'yahoo-finance'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Handle historical prices request
    if (!ticker || !startDate || !endDate) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Missing required parameters. Need: ticker, startDate, endDate'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const prices = getHistoricalPricesYahoo(ticker, startDate, endDate);

    return ContentService.createTextOutput(JSON.stringify({
      ticker: ticker,
      startDate: startDate,
      endDate: endDate,
      historicalPrices: prices,
      source: 'yahoo-finance'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Convert ticker to Yahoo Finance format
 * Examples:
 * - SWDA.MI -> SWDA.MI (already correct)
 * - BTC-EUR -> BTC-EUR (already correct)
 * - ACWIA.MI -> ACWIA.MI
 * - A500.MI -> A500.MI
 */
function convertToYahooTicker(ticker) {
  // Most tickers are already in Yahoo format
  // Handle some special cases

  // If ticker has BIT: prefix, convert to .MI
  if (ticker.startsWith('BIT:')) {
    return ticker.replace('BIT:', '') + '.MI';
  }

  // Handle crypto tickers
  const cryptoMap = {
    'BTCEUR': 'BTC-EUR',
    'ETHEUR': 'ETH-EUR',
    'BNBEUR': 'BNB-EUR',
    'SOLEUR': 'SOL-EUR',
    'ADAEUR': 'ADA-EUR',
    'SHIB-EUR': 'SHIB-EUR',
    'BTC-EUR': 'BTC-EUR',
    'ETH-EUR': 'ETH-EUR',
    'BNB-EUR': 'BNB-EUR',
    'SOL-EUR': 'SOL-EUR',
    'ADA-EUR': 'ADA-EUR'
  };

  if (cryptoMap[ticker]) {
    return cryptoMap[ticker];
  }

  return ticker;
}

/**
 * Get current price from Yahoo Finance API v8
 */
function getCurrentPriceYahoo(ticker) {
  try {
    const yahooTicker = convertToYahooTicker(ticker);
    Logger.log('Fetching current price for: ' + yahooTicker);

    // Yahoo Finance API v8 endpoint
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(yahooTicker) + '?interval=1d&range=1d';

    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Yahoo API error: ' + response.getResponseCode());
      // Fallback to Google Finance
      return { price: getCurrentPriceGoogle(ticker), change: 0, changePercent: 0 };
    }

    const data = JSON.parse(response.getContentText());
    const result = data.chart.result[0];
    const meta = result.meta;

    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    Logger.log('Current price for ' + yahooTicker + ': ' + price);

    return {
      price: price,
      change: change,
      changePercent: changePercent
    };

  } catch (error) {
    Logger.log('Error fetching current price from Yahoo: ' + error);
    // Fallback to Google Finance
    return { price: getCurrentPriceGoogle(ticker), change: 0, changePercent: 0 };
  }
}

/**
 * Fallback: Get current price using Google Finance
 */
function getCurrentPriceGoogle(ticker) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Prices') ||
                  SpreadsheetApp.getActive().getSheets()[0];

    const formula = '=GOOGLEFINANCE("' + ticker + '", "price")';
    sheet.getRange('A1').setFormula(formula);
    SpreadsheetApp.flush();

    const value = sheet.getRange('A1').getValue();
    sheet.getRange('A1').clear();

    if (typeof value === 'number' && value > 0) {
      return value;
    }

    return null;
  } catch (error) {
    Logger.log('Error fetching from Google Finance: ' + error);
    return null;
  }
}

/**
 * Get historical prices from Yahoo Finance API v8
 * Returns MONTHLY prices (last day of each month)
 */
function getHistoricalPricesYahoo(ticker, startDate, endDate) {
  try {
    const yahooTicker = convertToYahooTicker(ticker);
    Logger.log('Fetching historical prices for: ' + yahooTicker + ' from ' + startDate + ' to ' + endDate);

    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400; // Add 1 day to include end date

    // Yahoo Finance API v8 endpoint with monthly interval
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' +
                encodeURIComponent(yahooTicker) +
                '?period1=' + startTimestamp +
                '&period2=' + endTimestamp +
                '&interval=1mo'; // Monthly interval

    Logger.log('Yahoo API URL: ' + url);

    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Yahoo API error: ' + response.getResponseCode() + ' - ' + response.getContentText());
      // Fallback to Google Finance
      return getHistoricalPricesGoogle(ticker, startDate, endDate);
    }

    const data = JSON.parse(response.getContentText());

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      Logger.log('No data returned from Yahoo for ' + yahooTicker);
      return getHistoricalPricesGoogle(ticker, startDate, endDate);
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0];
    const closePrices = quotes.close || [];

    const prices = [];

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const closePrice = closePrices[i];

      if (timestamp && closePrice && closePrice > 0) {
        const date = new Date(timestamp * 1000);
        const dateStr = Utilities.formatDate(date, 'GMT', 'yyyy-MM-dd');

        prices.push({
          date: dateStr,
          price: closePrice
        });
      }
    }

    Logger.log('Fetched ' + prices.length + ' monthly prices from Yahoo for ' + yahooTicker);

    // If no prices from Yahoo, try Google Finance as fallback
    if (prices.length === 0) {
      Logger.log('No prices from Yahoo, trying Google Finance...');
      return getHistoricalPricesGoogle(ticker, startDate, endDate);
    }

    return prices;

  } catch (error) {
    Logger.log('Error fetching historical prices from Yahoo: ' + error);
    // Fallback to Google Finance
    return getHistoricalPricesGoogle(ticker, startDate, endDate);
  }
}

/**
 * Fallback: Get historical prices from Google Finance
 */
function getHistoricalPricesGoogle(ticker, startDate, endDate) {
  try {
    Logger.log('Fallback: Fetching from Google Finance for ' + ticker);

    const sheet = SpreadsheetApp.getActive().getSheetByName('HistoricalData') ||
                  SpreadsheetApp.getActive().getSheets()[0];

    sheet.clear();

    const formula = '=GOOGLEFINANCE("' + ticker + '", "price", DATE(' +
                    startDate.split('-')[0] + ',' +
                    startDate.split('-')[1] + ',' +
                    startDate.split('-')[2] + '), DATE(' +
                    endDate.split('-')[0] + ',' +
                    endDate.split('-')[1] + ',' +
                    endDate.split('-')[2] + '), "MONTHLY")';

    sheet.getRange('A1').setFormula(formula);
    SpreadsheetApp.flush();
    Utilities.sleep(2000);

    const data = sheet.getDataRange().getValues();

    const prices = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) {
        const date = Utilities.formatDate(new Date(row[0]), 'GMT', 'yyyy-MM-dd');
        const price = parseFloat(row[1]);

        if (price > 0) {
          prices.push({ date: date, price: price });
        }
      }
    }

    sheet.clear();
    Logger.log('Fetched ' + prices.length + ' prices from Google Finance');

    return prices;

  } catch (error) {
    Logger.log('Error fetching from Google Finance: ' + error);
    return [];
  }
}

/**
 * Get TER (Total Expense Ratio) for an ETF
 */
function getTER(ticker) {
  try {
    Logger.log('Fetching TER for: ' + ticker);

    // Try Yahoo Finance first
    const yahooTer = getTERFromYahoo(ticker);
    if (yahooTer !== null) {
      return {
        ticker: ticker,
        ter: yahooTer,
        source: 'yahoo-finance',
        lastUpdated: new Date().toISOString()
      };
    }

    // Try manual database
    const manualTer = getTERFromManualDatabase(ticker);
    if (manualTer !== null) {
      return {
        ticker: ticker,
        ter: manualTer,
        source: 'manual-database',
        lastUpdated: new Date().toISOString()
      };
    }

    return {
      ticker: ticker,
      ter: null,
      error: 'TER not found for this ticker',
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    Logger.log('Error fetching TER for ' + ticker + ': ' + error);
    return {
      ticker: ticker,
      ter: null,
      error: error.toString(),
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Get TER from Yahoo Finance
 */
function getTERFromYahoo(ticker) {
  try {
    const yahooTicker = convertToYahooTicker(ticker);
    const url = 'https://finance.yahoo.com/quote/' + yahooTicker;

    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.getResponseCode() !== 200) {
      return null;
    }

    const html = response.getContentText();

    const patterns = [
      /Expense Ratio[^>]*>\s*([0-9.]+)%/i,
      /Ongoing Charge[^>]*>\s*([0-9.]+)%/i,
      /Net Expense Ratio[^>]*>\s*([0-9.]+)%/i,
      /"expenseRatio"[^}]*"raw":\s*([0-9.]+)/i
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const ter = parseFloat(match[1]);
        Logger.log('Found TER from Yahoo: ' + ter + '%');
        return ter;
      }
    }

    return null;

  } catch (error) {
    Logger.log('Error fetching TER from Yahoo: ' + error);
    return null;
  }
}

/**
 * Manual database of TERs for common ETFs
 */
function getTERFromManualDatabase(ticker) {
  const terDatabase = {
    // Vanguard ETFs
    'VWCE.DE': 0.22,
    'VWRL.AS': 0.22,
    'VUSA.L': 0.07,
    'VUAA.L': 0.07,
    'VEUR.AS': 0.12,

    // iShares ETFs
    'IWDA.AS': 0.20,
    'SWDA.L': 0.20,
    'SWDA.MI': 0.20,
    'EIMI.L': 0.18,
    'EMIM.L': 0.18,
    'IUSN.DE': 0.07,

    // Invesco ETFs
    'EQQQ.L': 0.30,
    'EQQQ.DE': 0.30,
    'CMOD.MI': 0.19,

    // Xtrackers ETFs
    'XMME.DE': 0.19,
    'XDEM.DE': 0.25,

    // Amundi ETFs
    'ACWIA.MI': 0.20,
    'CW8.PA': 0.38,
    'LCCN.MI': 0.29,
    'LYQ7.DE': 0.09,
    'EMXC.BE': 0.20,

    // WisdomTree
    'PHAU.MI': 0.39,

    // iShares S&P 500
    'A500.MI': 0.07,
    'CSBGU7.MI': 0.07,
    'VECA.MI': 0.09,

    // Add more as needed
  };

  // Try exact match
  if (terDatabase[ticker] !== undefined) {
    Logger.log('Found TER in manual database: ' + terDatabase[ticker] + '%');
    return terDatabase[ticker];
  }

  // Try without exchange suffix
  const tickerBase = ticker.split('.')[0];
  for (const [key, value] of Object.entries(terDatabase)) {
    if (key.startsWith(tickerBase)) {
      Logger.log('Found TER in manual database (partial match): ' + value + '%');
      return value;
    }
  }

  return null;
}

/**
 * Helper function to test the script
 */
function testScript() {
  // Test current price - ETF
  Logger.log('=== Testing Current Price (ETF) ===');
  const etfPrice = getCurrentPriceYahoo('SWDA.MI');
  Logger.log('SWDA.MI price: ' + JSON.stringify(etfPrice));

  // Test current price - Crypto
  Logger.log('=== Testing Current Price (Crypto) ===');
  const btcPrice = getCurrentPriceYahoo('BTC-EUR');
  Logger.log('BTC-EUR price: ' + JSON.stringify(btcPrice));

  // Test historical prices - ETF
  Logger.log('=== Testing Historical Prices (ETF) ===');
  const etfHistory = getHistoricalPricesYahoo('SWDA.MI', '2024-01-01', '2024-12-31');
  Logger.log('SWDA.MI history: ' + etfHistory.length + ' months');
  Logger.log('First 3 months: ' + JSON.stringify(etfHistory.slice(0, 3)));

  // Test historical prices - Crypto
  Logger.log('=== Testing Historical Prices (Crypto) ===');
  const btcHistory = getHistoricalPricesYahoo('BTC-EUR', '2024-01-01', '2024-12-31');
  Logger.log('BTC-EUR history: ' + btcHistory.length + ' months');
  Logger.log('First 3 months: ' + JSON.stringify(btcHistory.slice(0, 3)));

  // Test TER
  Logger.log('=== Testing TER ===');
  const terData = getTER('SWDA.MI');
  Logger.log('SWDA.MI TER: ' + JSON.stringify(terData));
}
