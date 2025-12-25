/**
 * Investment Tracking - Google Apps Script
 *
 * This script fetches:
 * 1. Historical prices (monthly data)
 * 2. Current prices
 * 3. TER (Total Expense Ratio) for ETFs
 *
 * Usage:
 * - Historical: ?ticker=VWCE.DE&startDate=2021-01-01&endDate=2024-12-31
 * - Current: ?ticker=VWCE.DE&current=true
 * - TER: ?ticker=VWCE.DE&ter=true
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
      const currentPrice = getCurrentPrice(ticker);
      return ContentService.createTextOutput(JSON.stringify({
        ticker: ticker,
        price: currentPrice,
        date: new Date().toISOString().split('T')[0],
        source: 'google-finance'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Handle historical prices request
    if (!ticker || !startDate || !endDate) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Missing required parameters. Need: ticker, startDate, endDate'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const prices = getHistoricalPrices(ticker, startDate, endDate);

    return ContentService.createTextOutput(JSON.stringify({
      ticker: ticker,
      startDate: startDate,
      endDate: endDate,
      historicalPrices: prices
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get current price for a ticker using GOOGLEFINANCE
 */
function getCurrentPrice(ticker) {
  try {
    // Try to get price directly
    const price = SpreadsheetApp.getActive().getSheetByName('Prices') ||
                  SpreadsheetApp.getActive().getSheets()[0];

    const formula = '=GOOGLEFINANCE("' + ticker + '", "price")';
    price.getRange('A1').setFormula(formula);
    SpreadsheetApp.flush();

    const value = price.getRange('A1').getValue();

    // Clean up
    price.getRange('A1').clear();

    if (typeof value === 'number' && value > 0) {
      return value;
    }

    return null;
  } catch (error) {
    Logger.log('Error fetching current price for ' + ticker + ': ' + error);
    return null;
  }
}

/**
 * Get historical prices for a ticker
 * Returns monthly prices from startDate to endDate
 */
function getHistoricalPrices(ticker, startDate, endDate) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('HistoricalData') ||
                  SpreadsheetApp.getActive().getSheets()[0];

    // Clear previous data
    sheet.clear();

    // Set up GOOGLEFINANCE formula
    const formula = '=GOOGLEFINANCE("' + ticker + '", "price", DATE(' +
                    startDate.split('-')[0] + ',' +
                    startDate.split('-')[1] + ',' +
                    startDate.split('-')[2] + '), DATE(' +
                    endDate.split('-')[0] + ',' +
                    endDate.split('-')[1] + ',' +
                    endDate.split('-')[2] + '), "DAILY")';

    sheet.getRange('A1').setFormula(formula);
    SpreadsheetApp.flush();

    // Wait for data to load
    Utilities.sleep(2000);

    // Get all data
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      Logger.log('No historical data returned for ' + ticker);
      return [];
    }

    // Convert to array of {date, price} objects
    const prices = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] && row[1]) {
        const date = Utilities.formatDate(new Date(row[0]), 'GMT', 'yyyy-MM-dd');
        const price = parseFloat(row[1]);

        if (price > 0) {
          prices.push({
            date: date,
            price: price
          });
        }
      }
    }

    Logger.log('Fetched ' + prices.length + ' historical prices for ' + ticker);

    // Clean up
    sheet.clear();

    return prices;

  } catch (error) {
    Logger.log('Error fetching historical prices for ' + ticker + ': ' + error);
    return [];
  }
}

/**
 * Get TER (Total Expense Ratio) for an ETF
 * Tries multiple sources:
 * 1. Yahoo Finance
 * 2. JustETF (for European ETFs)
 * 3. Manual database
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

    // Try JustETF for European ETFs
    if (ticker.includes('.DE') || ticker.includes('.MI') || ticker.includes('.PA') || ticker.includes('.AS')) {
      const justETFTer = getTERFromJustETF(ticker);
      if (justETFTer !== null) {
        return {
          ticker: ticker,
          ter: justETFTer,
          source: 'justetf',
          lastUpdated: new Date().toISOString()
        };
      }
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

    // Return null if not found
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
    // Convert European tickers to Yahoo format
    let yahooTicker = ticker;
    if (ticker.includes('.DE')) {
      yahooTicker = ticker; // Already correct format
    } else if (ticker.includes('.MI')) {
      yahooTicker = ticker; // Already correct format
    }

    // Fetch Yahoo Finance page
    const url = 'https://finance.yahoo.com/quote/' + yahooTicker;
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.getResponseCode() !== 200) {
      Logger.log('Yahoo Finance returned error code: ' + response.getResponseCode());
      return null;
    }

    const html = response.getContentText();

    // Look for expense ratio in the HTML
    // Yahoo shows it as "Expense Ratio (net)" or "Ongoing Charge"
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

    Logger.log('TER not found in Yahoo Finance page for ' + ticker);
    return null;

  } catch (error) {
    Logger.log('Error fetching TER from Yahoo: ' + error);
    return null;
  }
}

/**
 * Get TER from JustETF (for European ETFs)
 */
function getTERFromJustETF(ticker) {
  try {
    // JustETF uses ISIN, not ticker
    // This is a simplified approach - in reality, you'd need ISIN mapping
    Logger.log('JustETF lookup not fully implemented - requires ISIN mapping');
    return null;

  } catch (error) {
    Logger.log('Error fetching TER from JustETF: ' + error);
    return null;
  }
}

/**
 * Manual database of TERs for common ETFs
 * Update this as needed with your specific ETFs
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
    'EIMI.L': 0.18,
    'EMIM.L': 0.18,
    'IUSN.DE': 0.07,

    // Invesco ETFs
    'EQQQ.L': 0.30,
    'EQQQ.DE': 0.30,

    // Xtrackers ETFs
    'XMME.DE': 0.19,
    'XDEM.DE': 0.25,

    // Amundi ETFs
    'ACWIA.MI': 0.20,
    'CW8.PA': 0.38,

    // Add more ETFs here as needed
  };

  if (terDatabase[ticker] !== undefined) {
    Logger.log('Found TER in manual database: ' + terDatabase[ticker] + '%');
    return terDatabase[ticker];
  }

  return null;
}

/**
 * Helper function to test the script
 */
function testScript() {
  // Test current price
  const currentPrice = getCurrentPrice('VWCE.DE');
  Logger.log('Current price test: ' + currentPrice);

  // Test historical prices
  const historicalPrices = getHistoricalPrices('VWCE.DE', '2024-01-01', '2024-12-31');
  Logger.log('Historical prices test: ' + historicalPrices.length + ' prices');

  // Test TER
  const terData = getTER('VWCE.DE');
  Logger.log('TER test: ' + JSON.stringify(terData));
}
