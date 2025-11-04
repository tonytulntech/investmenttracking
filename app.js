// ==============================================
// Investment Portfolio Tracker - Main App
// ==============================================

// Global State
const state = {
    transactions: [],
    portfolio: [],
    platforms: [],
    assets: [],
    strategy: [],
    rebalancing: [],
    timestamps: [],
    currentPrices: {},
    charts: {},
    filters: {
        assetClass: '',
        strategy: '',
        platform: '',
        action: '',
        dateFrom: '',
        dateTo: '',
        search: ''
    }
};

// ==============================================
// Sample Data (Based on CSV Structure)
// ==============================================

const SAMPLE_TRANSACTIONS = [
    { date: '2021-01-14', action: 'Cash Deposit', asset: 'Cash', quantity: 1, price: 5000, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'Cash', sector: '', country: 'Italy', strategy: '', notes: '' },
    { date: '2021-01-14', action: 'Buy', asset: 'ACWIA.MI', quantity: 1, price: 125.41, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'United States', strategy: 'Core', notes: '' },
    { date: '2021-02-15', action: 'Buy', asset: 'PHAU.MI', quantity: 1, price: 162.72, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'United States', strategy: 'Core', notes: '' },
    { date: '2021-03-17', action: 'Buy', asset: 'BIT:A500', quantity: 2, price: 61.67, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'United States', strategy: 'Core', notes: '' },
    { date: '2021-05-20', action: 'Buy', asset: 'BIT:EMI', quantity: 1, price: 163.73, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'European Union', strategy: 'Core', notes: '' },
    { date: '2021-05-26', action: 'Buy', asset: 'BTCEUR', quantity: 0.00003, price: 32758, fees: 0, currency: 'EUR', platform: 'Crypto', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' },
    { date: '2021-05-26', action: 'Buy', asset: 'ADAEUR', quantity: 8, price: 1.43, fees: 0, currency: 'EUR', platform: 'Crypto', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' },
    { date: '2021-05-26', action: 'Buy', asset: 'ETHEUR', quantity: 0.004, price: 2332.5, fees: 0, currency: 'EUR', platform: 'Crypto', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' },
    { date: '2021-05-26', action: 'Buy', asset: 'SHIB-EUR', quantity: 1000000, price: 0.00000824, fees: 0, currency: 'EUR', platform: 'Crypto', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' },
    { date: '2024-07-13', action: 'Cash Deposit', asset: 'Cash', quantity: 1, price: 900, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'Cash', sector: '', country: 'Italy', strategy: '', notes: '' },
    { date: '2024-07-17', action: 'Buy', asset: 'BIT:SWDA', quantity: 1, price: 96.31, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'United States', strategy: 'Core', notes: '' },
    { date: '2025-03-04', action: 'Cash Deposit', asset: 'Cash', quantity: 1, price: 17000, fees: 0, currency: 'EUR', platform: 'BBVA', assetClass: 'Cash', sector: '', country: 'Italy', strategy: '', notes: '' },
    { date: '2025-03-04', action: 'Cash Deposit', asset: 'Cash', quantity: 1, price: 1700, fees: 0, currency: 'EUR', platform: 'Revolut', assetClass: 'Cash', sector: '', country: 'Italy', strategy: '', notes: '' },
    { date: '2025-06-01', action: 'Buy', asset: 'EMXC.BE', quantity: 16, price: 24.26, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'Japan', strategy: 'Core', notes: '' },
    { date: '2025-06-01', action: 'Buy', asset: 'LCCN.MI', quantity: 3, price: 17.15, fees: 0, currency: 'EUR', platform: 'Fineco', assetClass: 'ETF', sector: 'ETF', country: 'China', strategy: 'Core', notes: '' },
    { date: '2025-07-09', action: 'Buy', asset: 'ETHEUR', quantity: 0.1506, price: 2197.84, fees: 1, currency: 'EUR', platform: 'Binance', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' },
    { date: '2025-09-28', action: 'Buy', asset: 'SOLEUR', quantity: 0.0366, price: 176.13, fees: 0, currency: 'EUR', platform: 'Binance', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' },
    { date: '2025-09-28', action: 'Buy', asset: 'BNBEUR', quantity: 0.0071, price: 837.26, fees: 0, currency: 'EUR', platform: 'Binance', assetClass: 'Crypto', sector: 'Crypto', country: 'United States', strategy: 'Play', notes: '' }
];

const SAMPLE_PORTFOLIO = [
    { ticker: 'BIT:SWDA', quantity: 32, avgPrice: 97.98, currentPrice: 111.95, dailyChange: 0.12, totalCost: 3135.36, marketValue: 3582.40, unrealisedROI: 14.26, unrealisedPL: 447.04, realisedPL: 0, totalPL: 447.04, assetClass: 'ETF', country: 'United States', strategy: 'Core' },
    { ticker: 'PHAU.MI', quantity: 2, avgPrice: 213.38, currentPrice: 322.51, dailyChange: 0, totalCost: 426.75, marketValue: 645.02, unrealisedROI: 51.15, unrealisedPL: 218.27, realisedPL: 0, totalPL: 218.27, assetClass: 'ETF', country: 'United States', strategy: 'Core' },
    { ticker: 'ACWIA.MI', quantity: 3, avgPrice: 131.41, currentPrice: 200.05, dailyChange: 0, totalCost: 394.22, marketValue: 600.15, unrealisedROI: 52.24, unrealisedPL: 205.93, realisedPL: 0, totalPL: 205.93, assetClass: 'ETF', country: 'United States', strategy: 'Core' },
    { ticker: 'BIT:A500', quantity: 2, avgPrice: 61.67, currentPrice: 117.75, dailyChange: 0.17, totalCost: 123.34, marketValue: 235.50, unrealisedROI: 90.94, unrealisedPL: 112.16, realisedPL: 0, totalPL: 112.16, assetClass: 'ETF', country: 'United States', strategy: 'Core' },
    { ticker: 'EMXC.BE', quantity: 16, avgPrice: 24.26, currentPrice: 29.88, dailyChange: 0, totalCost: 388.16, marketValue: 478.08, unrealisedROI: 23.17, unrealisedPL: 89.92, realisedPL: 0, totalPL: 89.92, assetClass: 'ETF', country: 'Japan', strategy: 'Core' },
    { ticker: 'LCCN.MI', quantity: 20, avgPrice: 18.52, currentPrice: 20.70, dailyChange: 0, totalCost: 370.33, marketValue: 414.00, unrealisedROI: 11.79, unrealisedPL: 43.67, realisedPL: 0, totalPL: 43.67, assetClass: 'ETF', country: 'China', strategy: 'Core' },
    { ticker: 'BIT:EMI', quantity: 2, avgPrice: 164.99, currentPrice: 167.95, dailyChange: -0.10, totalCost: 329.97, marketValue: 335.90, unrealisedROI: 1.80, unrealisedPL: 5.93, realisedPL: 0, totalPL: 5.93, assetClass: 'ETF', country: 'European Union', strategy: 'Core' },
    { ticker: 'BIT:VECA', quantity: 3, avgPrice: 53.34, currentPrice: 53.27, dailyChange: -0.21, totalCost: 160.02, marketValue: 159.81, unrealisedROI: -0.13, unrealisedPL: -0.21, realisedPL: 0, totalPL: -0.21, assetClass: 'ETF', country: 'European Union', strategy: 'Core' },
    { ticker: 'BIT:CSBGU7', quantity: 1, avgPrice: 119.16, currentPrice: 123.37, dailyChange: 0.05, totalCost: 119.16, marketValue: 123.37, unrealisedROI: 3.53, unrealisedPL: 4.21, realisedPL: 0, totalPL: 4.21, assetClass: 'ETF', country: 'United States', strategy: 'Core' },
    { ticker: 'BIT:CMOD', quantity: 11, avgPrice: 18.49, currentPrice: 22.58, dailyChange: 0.94, totalCost: 203.35, marketValue: 248.38, unrealisedROI: 22.14, unrealisedPL: 45.03, realisedPL: 0, totalPL: 45.03, assetClass: 'ETF', country: 'United States', strategy: 'Core' },
    { ticker: 'BTCEUR', quantity: 0.01517, avgPrice: 55889.54, currentPrice: 92090.50, dailyChange: 0, totalCost: 847.94, marketValue: 1397.17, unrealisedROI: 64.77, unrealisedPL: 549.23, realisedPL: 44.31, totalPL: 593.54, assetClass: 'Crypto', country: 'United States', strategy: 'Play' },
    { ticker: 'ETHEUR', quantity: 0.2081, avgPrice: 2475.98, currentPrice: 3106.76, dailyChange: 0, totalCost: 514.58, marketValue: 645.68, unrealisedROI: 25.48, unrealisedPL: 131.09, realisedPL: 0, totalPL: 131.09, assetClass: 'Crypto', country: 'United States', strategy: 'Play' },
    { ticker: 'ADAEUR', quantity: 8, avgPrice: 1.43, currentPrice: 0.48, dailyChange: 0, totalCost: 11.45, marketValue: 3.82, unrealisedROI: -66.67, unrealisedPL: -7.63, realisedPL: 0, totalPL: -7.63, assetClass: 'Crypto', country: 'United States', strategy: 'Play' },
    { ticker: 'SHIB-EUR', quantity: 1000000, avgPrice: 0.00000824, currentPrice: 0.00000793, dailyChange: 0, totalCost: 8.24, marketValue: 7.93, unrealisedROI: -3.77, unrealisedPL: -0.31, realisedPL: 0, totalPL: -0.31, assetClass: 'Crypto', country: 'United States', strategy: 'Play' },
    { ticker: 'SOLEUR', quantity: 0.0366, avgPrice: 176.13, currentPrice: 143.22, dailyChange: 0, totalCost: 6.44, marketValue: 5.24, unrealisedROI: -18.68, unrealisedPL: -1.20, realisedPL: 0, totalPL: -1.20, assetClass: 'Crypto', country: 'United States', strategy: 'Play' },
    { ticker: 'BNBEUR', quantity: 0.0071, avgPrice: 837.26, currentPrice: 855.22, dailyChange: 0, totalCost: 5.96, marketValue: 6.09, unrealisedROI: 2.15, unrealisedPL: 0.13, realisedPL: 0, totalPL: 0.13, assetClass: 'Crypto', country: 'United States', strategy: 'Play' }
];

const SAMPLE_PLATFORMS = [
    { platform: 'Fineco', cashDeposits: 5900, cashWithdrawals: 0, netDeposit: 5900, accountValue: 6975.64, positions: 6822.61, cash: 153.03, dailyChange: 0.09, dailyChangeValue: 6.28, holdings: 10, numTrades: 29, weight: 15.97 },
    { platform: 'BBVA', cashDeposits: 14000, cashWithdrawals: 0, netDeposit: 14000, accountValue: 14000, positions: 0, cash: 14000, dailyChange: 0, dailyChangeValue: 0, holdings: 0, numTrades: 0, weight: 32.05 },
    { platform: 'Binance', cashDeposits: 0, cashWithdrawals: 0, netDeposit: 0, accountValue: 2370.89, positions: 2370.89, cash: 0, dailyChange: 0, dailyChangeValue: 0, holdings: 4, numTrades: 27, weight: 5.43 },
    { platform: 'Crypto', cashDeposits: 0, cashWithdrawals: 0, netDeposit: 0, accountValue: 26.85, positions: 26.85, cash: 0, dailyChange: 0, dailyChangeValue: 0, holdings: 4, numTrades: 4, weight: 0.06 },
    { platform: 'Revolut', cashDeposits: 11700, cashWithdrawals: 0, netDeposit: 11700, accountValue: 11700, positions: 0, cash: 11700, dailyChange: 0, dailyChangeValue: 0, holdings: 0, numTrades: 0, weight: 26.79 },
    { platform: 'Paypal', cashDeposits: 700, cashWithdrawals: 0, netDeposit: 700, accountValue: 700, positions: 0, cash: 700, dailyChange: 0, dailyChangeValue: 0, holdings: 0, numTrades: 0, weight: 1.60 },
    { platform: 'Mercury', cashDeposits: 2478.64, cashWithdrawals: 0, netDeposit: 2478.64, accountValue: 2433.42, positions: 0, cash: 2433.42, dailyChange: 0, dailyChangeValue: 0, holdings: 0, numTrades: 0, weight: 5.57 },
    { platform: 'Wise', cashDeposits: 5800, cashWithdrawals: 0, netDeposit: 5800, accountValue: 5800, positions: 0, cash: 5800, dailyChange: 0, dailyChangeValue: 0, holdings: 0, numTrades: 0, weight: 13.28 },
    { platform: 'Nexo', cashDeposits: 0, cashWithdrawals: 0, netDeposit: 0, accountValue: -448.77, positions: -448.77, cash: 0, dailyChange: 0, dailyChangeValue: 0, holdings: 1, numTrades: 7, weight: -1.03 },
    { platform: 'Youhodler', cashDeposits: 0, cashWithdrawals: 0, netDeposit: 0, accountValue: 116.95, positions: 116.95, cash: 0, dailyChange: 0, dailyChangeValue: 0, holdings: 1, numTrades: 1, weight: 0.27 }
];

const SAMPLE_STRATEGY = [
    { strategy: 'Core', macroAsset: 'Azionario', microAsset: 'Azionario Usa', ticker: 'BIT:A500', target: 4.50 },
    { strategy: 'Core', macroAsset: 'Azionario', microAsset: 'Azionario All Country', ticker: 'BIT:ACWI', target: 0.01 },
    { strategy: 'Core', macroAsset: 'Materie Prime', microAsset: 'Materie Prime', ticker: 'BIT:CMOD', target: 4.00 },
    { strategy: 'Core', macroAsset: 'Obbligazionario', microAsset: 'Obbligazionario Usa Middle Term', ticker: 'BIT:CSBGU7', target: 0.01 },
    { strategy: 'Core', macroAsset: 'Obbligazionario', microAsset: 'Obbligazionario Europa Inflazione', ticker: 'BIT:EMI', target: 9.00 },
    { strategy: 'Core', macroAsset: 'Azionario', microAsset: 'Azionario Emergenti Ex China', ticker: 'BIT:EMXC', target: 9.00 },
    { strategy: 'Core', macroAsset: 'Azionario', microAsset: 'Azionario China', ticker: 'BIT:LCCN', target: 4.50 },
    { strategy: 'Core', macroAsset: 'Materie Prime', microAsset: 'Oro', ticker: 'BIT:PHAU', target: 9.00 },
    { strategy: 'Core', macroAsset: 'Azionario', microAsset: 'Azionario Mondo Ex Em', ticker: 'BIT:SWDA', target: 39.00 },
    { strategy: 'Core', macroAsset: 'Obbligazionario', microAsset: 'Obbligazionario Europa Corporate', ticker: 'BIT:VECA', target: 1.00 },
    { strategy: 'YOLO', macroAsset: 'Cryptovalute', microAsset: 'Cryptovalute', ticker: 'BTCEUR', target: 16.00 },
    { strategy: 'YOLO', macroAsset: 'Cryptovalute', microAsset: 'Cryptovalute', ticker: 'ETHEUR', target: 2.00 },
    { strategy: 'YOLO', macroAsset: 'Cryptovalute', microAsset: 'Cryptovalute', ticker: 'ADAEUR', target: 1.00 },
    { strategy: 'YOLO', macroAsset: 'Cryptovalute', microAsset: 'Cryptovalute', ticker: 'SHIB-EUR', target: 1.00 }
];

// ==============================================
// Utility Functions
// ==============================================

function formatCurrency(value, decimals = 2) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

function formatPercentage(value, decimals = 2) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getValueClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
}

// ==============================================
// Yahoo Finance API Integration
// ==============================================

async function fetchRealTimePrice(ticker) {
    try {
        // Attempt to use Yahoo Finance API (CORS proxy needed in production)
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;

        const response = await fetch(corsProxy + encodeURIComponent(yahooURL));

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;

            const marketPrice = meta.regularMarketPrice || null;
            const previousClose = meta.previousClose || null;
            const change = marketPrice && previousClose ? ((marketPrice - previousClose) / previousClose * 100) : 0;

            return {
                price: marketPrice,
                change: change,
                success: true
            };
        }

        throw new Error('Invalid data structure');

    } catch (error) {
        console.warn(`Failed to fetch real-time price for ${ticker}:`, error.message);
        // Fallback: return calculated price with simulated variation
        return getFallbackPrice(ticker);
    }
}

function getFallbackPrice(ticker) {
    // Fallback logic simulating the Google Apps Script logic
    // Find the asset in portfolio to get its current price
    const asset = state.portfolio.find(a => a.ticker === ticker);

    if (!asset) {
        return { price: null, change: 0, success: false };
    }

    // Simulate small random variation (-2% to +2%)
    const variation = (Math.random() - 0.5) * 4;
    const newPrice = asset.currentPrice * (1 + variation / 100);

    return {
        price: newPrice,
        change: variation,
        success: false,
        fallback: true
    };
}

async function updateAllPrices() {
    showLoading();

    const tickers = [...new Set(state.portfolio.map(a => a.ticker))];
    const updates = [];

    for (const ticker of tickers) {
        if (ticker === 'Cash') continue;

        try {
            const priceData = await fetchRealTimePrice(ticker);
            updates.push({ ticker, ...priceData });

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error(`Error updating ${ticker}:`, error);
        }
    }

    // Apply updates to portfolio
    updates.forEach(update => {
        const asset = state.portfolio.find(a => a.ticker === update.ticker);
        if (asset && update.price) {
            const oldPrice = asset.currentPrice;
            asset.currentPrice = update.price;
            asset.dailyChange = update.change;
            asset.marketValue = asset.quantity * update.price;
            asset.unrealisedPL = asset.marketValue - asset.totalCost;
            asset.unrealisedROI = (asset.unrealisedPL / asset.totalCost) * 100;
            asset.totalPL = asset.unrealisedPL + asset.realisedPL;

            state.currentPrices[update.ticker] = {
                price: update.price,
                change: update.change,
                timestamp: new Date(),
                fallback: update.fallback || false
            };
        }
    });

    // Refresh UI
    updateDashboard();
    renderPortfolioTable();

    hideLoading();

    // Show notification
    showNotification(`Aggiornati ${updates.filter(u => u.success).length}/${tickers.length - 1} prezzi`);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==============================================
// Data Calculations
// ==============================================

function calculatePortfolioMetrics() {
    const totalMarketValue = state.portfolio.reduce((sum, asset) => sum + asset.marketValue, 0);
    const totalCost = state.portfolio.reduce((sum, asset) => sum + asset.totalCost, 0);
    const totalUnrealisedPL = state.portfolio.reduce((sum, asset) => sum + asset.unrealisedPL, 0);
    const totalRealisedPL = state.portfolio.reduce((sum, asset) => sum + asset.realisedPL, 0);
    const totalPL = totalUnrealisedPL + totalRealisedPL;
    const unrealisedROI = totalCost > 0 ? (totalUnrealisedPL / totalCost) * 100 : 0;
    const dailyChange = state.portfolio.reduce((sum, asset) => {
        const change = asset.marketValue * (asset.dailyChange / 100);
        return sum + change;
    }, 0);
    const dailyChangePercent = totalMarketValue > 0 ? (dailyChange / totalMarketValue) * 100 : 0;

    return {
        totalMarketValue,
        totalCost,
        totalUnrealisedPL,
        totalRealisedPL,
        totalPL,
        unrealisedROI,
        dailyChange,
        dailyChangePercent
    };
}

function getTopPerformers() {
    const assets = [...state.portfolio].filter(a => a.ticker !== 'Cash');

    // Today
    const topToday = assets.reduce((max, asset) =>
        asset.dailyChange > (max?.dailyChange || -Infinity) ? asset : max, null);
    const worstToday = assets.reduce((min, asset) =>
        asset.dailyChange < (min?.dailyChange || Infinity) ? asset : min, null);

    // Overall
    const topOverall = assets.reduce((max, asset) =>
        asset.unrealisedROI > (max?.unrealisedROI || -Infinity) ? asset : max, null);
    const worstOverall = assets.reduce((min, asset) =>
        asset.unrealisedROI < (min?.unrealisedROI || Infinity) ? asset : min, null);

    return { topToday, worstToday, topOverall, worstOverall };
}

function calculateRebalancing() {
    const metrics = calculatePortfolioMetrics();
    const totalValue = metrics.totalMarketValue;

    return SAMPLE_STRATEGY.map(strat => {
        const asset = state.portfolio.find(a => a.ticker === strat.ticker);
        const currentValue = asset ? asset.marketValue : 0;
        const currentWeight = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
        const delta = currentWeight - strat.target;
        const targetValue = totalValue * (strat.target / 100);
        const amountToBuySell = targetValue - currentValue;

        let status = 'Balanced';
        if (Math.abs(delta) > 1) {
            status = delta > 0 ? 'Overweight' : 'Underweight';
        }

        return {
            ...strat,
            currentValue,
            currentWeight,
            delta,
            status,
            targetValue,
            amountToBuySell,
            action: amountToBuySell > 0 ? 'Acquista' : amountToBuySell < 0 ? 'Vendi' : 'Mantieni'
        };
    });
}

// ==============================================
// UI Rendering Functions
// ==============================================

function updateDashboard() {
    const metrics = calculatePortfolioMetrics();
    const performers = getTopPerformers();

    // Update header stats
    document.getElementById('totalValue').textContent = formatCurrency(metrics.totalMarketValue);
    document.getElementById('totalROI').textContent = formatPercentage(metrics.unrealisedROI);
    document.getElementById('totalROI').className = `stat-value ${getValueClass(metrics.unrealisedROI)}`;
    document.getElementById('totalPL').textContent = formatCurrency(metrics.totalPL);
    document.getElementById('totalPL').className = `stat-value ${getValueClass(metrics.totalPL)}`;
    document.getElementById('dailyChange').textContent = formatPercentage(metrics.dailyChangePercent);
    document.getElementById('dailyChange').className = `stat-value ${getValueClass(metrics.dailyChangePercent)}`;

    // Update dashboard metrics
    document.getElementById('portfolioValue').textContent = formatCurrency(metrics.totalMarketValue);
    document.getElementById('portfolioCost').textContent = formatCurrency(metrics.totalCost);
    document.getElementById('unrealisedROI').textContent = formatPercentage(metrics.unrealisedROI);
    document.getElementById('unrealisedROI').className = `metric-value ${getValueClass(metrics.unrealisedROI)}`;
    document.getElementById('unrealisedPL').textContent = formatCurrency(metrics.totalUnrealisedPL);
    document.getElementById('unrealisedPL').className = `metric-value ${getValueClass(metrics.totalUnrealisedPL)}`;
    document.getElementById('realisedPL').textContent = formatCurrency(metrics.totalRealisedPL);
    document.getElementById('realisedPL').className = `metric-value ${getValueClass(metrics.totalRealisedPL)}`;
    document.getElementById('totalPLMetric').textContent = formatCurrency(metrics.totalPL);
    document.getElementById('totalPLMetric').className = `metric-value ${getValueClass(metrics.totalPL)}`;

    // Update performers
    if (performers.topToday) {
        document.getElementById('topPerformerToday').textContent = performers.topToday.ticker;
        document.getElementById('topPerformerTodayValue').textContent = formatPercentage(performers.topToday.dailyChange);
    }
    if (performers.worstToday) {
        document.getElementById('worstPerformerToday').textContent = performers.worstToday.ticker;
        document.getElementById('worstPerformerTodayValue').textContent = formatPercentage(performers.worstToday.dailyChange);
    }
    if (performers.topOverall) {
        document.getElementById('topPerformerOverall').textContent = performers.topOverall.ticker;
        document.getElementById('topPerformerOverallValue').textContent = formatPercentage(performers.topOverall.unrealisedROI);
    }
    if (performers.worstOverall) {
        document.getElementById('worstPerformerOverall').textContent = performers.worstOverall.ticker;
        document.getElementById('worstPerformerOverallValue').textContent = formatPercentage(performers.worstOverall.unrealisedROI);
    }

    // Update last update time
    document.getElementById('lastUpdate').textContent = new Date().toLocaleString('it-IT');
}

function renderPortfolioTable() {
    const tbody = document.getElementById('portfolioTableBody');
    tbody.innerHTML = '';

    let filteredData = [...state.portfolio];

    // Apply filters
    if (state.filters.assetClass) {
        filteredData = filteredData.filter(a => a.assetClass === state.filters.assetClass);
    }
    if (state.filters.strategy) {
        filteredData = filteredData.filter(a => a.strategy === state.filters.strategy);
    }
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filteredData = filteredData.filter(a =>
            a.ticker.toLowerCase().includes(search) ||
            a.assetClass.toLowerCase().includes(search) ||
            a.country.toLowerCase().includes(search)
        );
    }

    filteredData.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${asset.ticker}</strong></td>
            <td>${asset.quantity.toFixed(6)}</td>
            <td>${formatCurrency(asset.avgPrice)}</td>
            <td>${formatCurrency(asset.currentPrice)}</td>
            <td class="${getValueClass(asset.dailyChange)}">${formatPercentage(asset.dailyChange)}</td>
            <td>${formatCurrency(asset.totalCost)}</td>
            <td>${formatCurrency(asset.marketValue)}</td>
            <td class="${getValueClass(asset.unrealisedROI)}">${formatPercentage(asset.unrealisedROI)}</td>
            <td class="${getValueClass(asset.unrealisedPL)}">${formatCurrency(asset.unrealisedPL)}</td>
            <td class="${getValueClass(asset.realisedPL)}">${formatCurrency(asset.realisedPL)}</td>
            <td class="${getValueClass(asset.totalPL)}">${formatCurrency(asset.totalPL)}</td>
            <td><span class="badge badge-info">${asset.assetClass}</span></td>
            <td>${asset.country}</td>
            <td><span class="badge ${asset.strategy === 'Core' ? 'badge-success' : 'badge-warning'}">${asset.strategy}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    tbody.innerHTML = '';

    let filteredData = [...state.transactions];

    // Apply filters
    if (state.filters.action) {
        filteredData = filteredData.filter(t => t.action === state.filters.action);
    }
    if (state.filters.platform) {
        filteredData = filteredData.filter(t => t.platform === state.filters.platform);
    }
    if (state.filters.dateFrom) {
        filteredData = filteredData.filter(t => t.date >= state.filters.dateFrom);
    }
    if (state.filters.dateTo) {
        filteredData = filteredData.filter(t => t.date <= state.filters.dateTo);
    }
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filteredData = filteredData.filter(t =>
            t.asset.toLowerCase().includes(search) ||
            t.action.toLowerCase().includes(search) ||
            t.platform.toLowerCase().includes(search)
        );
    }

    // Sort by date descending
    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredData.forEach(tx => {
        const row = document.createElement('tr');
        const total = tx.quantity * tx.price;
        row.innerHTML = `
            <td>${formatDate(tx.date)}</td>
            <td><span class="badge ${tx.action === 'Buy' ? 'badge-success' : tx.action === 'Sell' ? 'badge-danger' : 'badge-info'}">${tx.action}</span></td>
            <td><strong>${tx.asset}</strong></td>
            <td>${tx.quantity.toFixed(6)}</td>
            <td>${formatCurrency(tx.price)}</td>
            <td>${formatCurrency(total)}</td>
            <td>${formatCurrency(tx.fees)}</td>
            <td>${tx.currency}</td>
            <td>${tx.platform}</td>
            <td><span class="badge badge-info">${tx.assetClass}</span></td>
            <td>${tx.strategy}</td>
            <td>${tx.notes}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderPlatformsTable() {
    const tbody = document.getElementById('platformsTableBody');
    tbody.innerHTML = '';

    state.platforms.forEach(platform => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${platform.platform}</strong></td>
            <td>${formatCurrency(platform.cashDeposits)}</td>
            <td>${formatCurrency(platform.cashWithdrawals)}</td>
            <td>${formatCurrency(platform.netDeposit)}</td>
            <td>${formatCurrency(platform.accountValue)}</td>
            <td>${formatCurrency(platform.positions)}</td>
            <td>${formatCurrency(platform.cash)}</td>
            <td class="${getValueClass(platform.dailyChange)}">${formatPercentage(platform.dailyChange)}</td>
            <td class="${getValueClass(platform.dailyChangeValue)}">${formatCurrency(platform.dailyChangeValue)}</td>
            <td>${platform.holdings}</td>
            <td>${platform.numTrades}</td>
            <td>${platform.weight.toFixed(2)}%</td>
        `;
        tbody.appendChild(row);
    });
}

function renderStrategyTable() {
    const tbody = document.getElementById('strategyTableBody');
    tbody.innerHTML = '';

    const rebalancingData = calculateRebalancing();

    rebalancingData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.strategy}</td>
            <td>${item.macroAsset}</td>
            <td>${item.microAsset}</td>
            <td><strong>${item.ticker}</strong></td>
            <td>${item.target.toFixed(2)}%</td>
            <td>${item.currentWeight.toFixed(2)}%</td>
            <td class="${getValueClass(item.delta)}">${formatPercentage(item.delta)}</td>
            <td><span class="badge ${item.status === 'Balanced' ? 'badge-success' : item.status === 'Underweight' ? 'badge-warning' : 'badge-info'}">${item.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function renderRebalancingTable() {
    const tbody = document.getElementById('rebalancingTableBody');
    tbody.innerHTML = '';

    const rebalancingData = calculateRebalancing();

    let underweight = 0, overweight = 0, balanced = 0;

    rebalancingData.forEach(item => {
        if (item.status === 'Underweight') underweight++;
        else if (item.status === 'Overweight') overweight++;
        else balanced++;

        const asset = state.portfolio.find(a => a.ticker === item.ticker);
        const quantityChange = asset ? item.amountToBuySell / asset.currentPrice : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${item.ticker}</strong></td>
            <td>${item.target.toFixed(2)}%</td>
            <td>${item.currentWeight.toFixed(2)}%</td>
            <td class="${getValueClass(item.delta)}">${formatPercentage(item.delta)}</td>
            <td><span class="badge ${item.status === 'Balanced' ? 'badge-success' : item.status === 'Underweight' ? 'badge-warning' : 'badge-info'}">${item.status}</span></td>
            <td>${formatCurrency(item.currentValue)}</td>
            <td>${formatCurrency(item.targetValue)}</td>
            <td>${quantityChange.toFixed(4)} units (${formatCurrency(Math.abs(item.amountToBuySell))})</td>
            <td><span class="badge ${item.action === 'Acquista' ? 'badge-success' : item.action === 'Vendi' ? 'badge-danger' : 'badge-info'}">${item.action}</span></td>
        `;
        tbody.appendChild(row);
    });

    // Update summary
    document.getElementById('underweightCount').textContent = underweight;
    document.getElementById('overweightCount').textContent = overweight;
    document.getElementById('balancedCount').textContent = balanced;
}

function renderAssetsTable() {
    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = '';

    // Combine portfolio with platform info
    const assetsWithPlatform = state.portfolio.map(asset => {
        // Find which platform holds this asset
        const platform = state.platforms.find(p => {
            // Simple heuristic: if asset is crypto and platform has crypto holdings, or ETF and platform is Fineco
            if (asset.assetClass === 'Crypto' && ['Binance', 'Crypto', 'Nexo', 'Youhodler'].includes(p.platform)) {
                return true;
            }
            if (asset.assetClass === 'ETF' && p.platform === 'Fineco') {
                return true;
            }
            return false;
        });

        return {
            ...asset,
            platform: platform ? platform.platform : 'Unknown'
        };
    });

    assetsWithPlatform.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${asset.platform}</td>
            <td><strong>${asset.ticker}</strong></td>
            <td>${asset.quantity.toFixed(6)}</td>
            <td>${formatCurrency(asset.avgPrice)}</td>
            <td>${formatCurrency(asset.currentPrice)}</td>
            <td class="${getValueClass(asset.dailyChange)}">${formatPercentage(asset.dailyChange)}</td>
            <td>${formatCurrency(asset.totalCost)}</td>
            <td>${formatCurrency(asset.marketValue)}</td>
            <td class="${getValueClass(asset.unrealisedROI)}">${formatPercentage(asset.unrealisedROI)}</td>
            <td class="${getValueClass(asset.unrealisedPL)}">${formatCurrency(asset.unrealisedPL)}</td>
            <td class="${getValueClass(asset.realisedPL)}">${formatCurrency(asset.realisedPL)}</td>
            <td class="${getValueClass(asset.totalPL)}">${formatCurrency(asset.totalPL)}</td>
            <td><span class="badge badge-info">${asset.assetClass}</span></td>
            <td>${asset.country}</td>
            <td>${asset.strategy}</td>
        `;
        tbody.appendChild(row);
    });
}

// ==============================================
// Charts
// ==============================================

function createPortfolioChart() {
    const ctx = document.getElementById('portfolioChart');
    if (!ctx) return;

    // Sample data for portfolio growth over time
    const months = ['Gen 21', 'Mar 21', 'Mag 21', 'Lug 21', 'Set 21', 'Nov 21', 'Gen 22', 'Mar 22', 'Mag 22', 'Lug 22', 'Set 22', 'Nov 22', 'Gen 23', 'Mar 23', 'Mag 23', 'Lug 23', 'Set 23', 'Nov 23', 'Gen 24', 'Mar 24', 'Mag 24', 'Lug 24', 'Set 24', 'Nov 24', 'Gen 25', 'Mar 25', 'Mag 25', 'Lug 25', 'Set 25', 'Nov 25'];
    const values = [5000, 5125, 5575, 5827, 6197, 6310, 6400, 6535, 6535, 6535, 6535, 6535, 6535, 6633, 6633, 6633, 6865, 6865, 6840, 6865, 6896, 8065, 8245, 8440, 8544, 28371, 36539, 48531, 50590, 43674];

    if (state.charts.portfolio) {
        state.charts.portfolio.destroy();
    }

    state.charts.portfolio = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Valore Portfolio (€)',
                data: values,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatCurrency(value, 0)
                    }
                }
            }
        }
    });
}

function createAllocationChart() {
    const ctx = document.getElementById('allocationChart');
    if (!ctx) return;

    // Group by asset class
    const allocation = {};
    state.portfolio.forEach(asset => {
        allocation[asset.assetClass] = (allocation[asset.assetClass] || 0) + asset.marketValue;
    });

    const labels = Object.keys(allocation);
    const data = Object.values(allocation);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

    if (state.charts.allocation) {
        state.charts.allocation.destroy();
    }

    state.charts.allocation = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createAssetClassChart() {
    const ctx = document.getElementById('assetClassChart');
    if (!ctx) return;

    // Performance by asset class
    const assetClasses = {};
    state.portfolio.forEach(asset => {
        if (!assetClasses[asset.assetClass]) {
            assetClasses[asset.assetClass] = { pl: 0, count: 0 };
        }
        assetClasses[asset.assetClass].pl += asset.unrealisedPL;
        assetClasses[asset.assetClass].count++;
    });

    const labels = Object.keys(assetClasses);
    const data = labels.map(key => assetClasses[key].pl);

    if (state.charts.assetClass) {
        state.charts.assetClass.destroy();
    }

    state.charts.assetClass = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'P/L per Asset Class (€)',
                data: data,
                backgroundColor: data.map(v => v >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: (value) => formatCurrency(value, 0)
                    }
                }
            }
        }
    });
}

function createGeographyChart() {
    const ctx = document.getElementById('geographyChart');
    if (!ctx) return;

    // Group by country
    const geography = {};
    state.portfolio.forEach(asset => {
        if (asset.country) {
            geography[asset.country] = (geography[asset.country] || 0) + asset.marketValue;
        }
    });

    const labels = Object.keys(geography);
    const data = Object.values(geography);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

    if (state.charts.geography) {
        state.charts.geography.destroy();
    }

    state.charts.geography = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

function createPlatformChart() {
    const ctx = document.getElementById('platformChart');
    if (!ctx) return;

    const labels = state.platforms.map(p => p.platform);
    const data = state.platforms.map(p => p.accountValue);

    if (state.charts.platform) {
        state.charts.platform.destroy();
    }

    state.charts.platform = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valore Account (€)',
                data: data,
                backgroundColor: '#667eea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => formatCurrency(context.parsed.x)
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: (value) => formatCurrency(value, 0)
                    }
                }
            }
        }
    });
}

function createStrategyChart() {
    const ctx = document.getElementById('strategyChart');
    if (!ctx) return;

    const rebalancing = calculateRebalancing();
    const labels = rebalancing.map(r => r.ticker);
    const targetData = rebalancing.map(r => r.target);
    const actualData = rebalancing.map(r => r.currentWeight);

    if (state.charts.strategy) {
        state.charts.strategy.destroy();
    }

    state.charts.strategy = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Target %',
                    data: targetData,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)'
                },
                {
                    label: 'Actual %',
                    data: actualData,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

function createAssetPerformanceChart() {
    const ctx = document.getElementById('assetPerformanceChart');
    if (!ctx) return;

    const assets = [...state.portfolio].filter(a => a.ticker !== 'Cash').sort((a, b) => b.unrealisedROI - a.unrealisedROI);
    const labels = assets.map(a => a.ticker);
    const data = assets.map(a => a.unrealisedROI);

    if (state.charts.assetPerformance) {
        state.charts.assetPerformance.destroy();
    }

    state.charts.assetPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ROI %',
                data: data,
                backgroundColor: data.map(v => v >= 0 ? '#10b981' : '#ef4444')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => formatPercentage(context.parsed.x)
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

function createCategoryPerformanceChart() {
    const ctx = document.getElementById('categoryPerformanceChart');
    if (!ctx) return;

    // Group by strategy
    const categories = {};
    state.portfolio.forEach(asset => {
        if (asset.strategy) {
            if (!categories[asset.strategy]) {
                categories[asset.strategy] = { value: 0, pl: 0 };
            }
            categories[asset.strategy].value += asset.marketValue;
            categories[asset.strategy].pl += asset.unrealisedPL;
        }
    });

    const labels = Object.keys(categories);
    const valueData = labels.map(key => categories[key].value);
    const plData = labels.map(key => categories[key].pl);

    if (state.charts.categoryPerformance) {
        state.charts.categoryPerformance.destroy();
    }

    state.charts.categoryPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Valore (€)',
                    data: valueData,
                    backgroundColor: '#667eea',
                    yAxisID: 'y'
                },
                {
                    label: 'P/L (€)',
                    data: plData,
                    backgroundColor: '#10b981',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        callback: (value) => formatCurrency(value, 0)
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: (value) => formatCurrency(value, 0)
                    }
                }
            }
        }
    });
}

function createTransactionTimelineChart() {
    const ctx = document.getElementById('transactionTimelineChart');
    if (!ctx) return;

    // Group transactions by month
    const monthlyTransactions = {};
    state.transactions.forEach(tx => {
        const date = new Date(tx.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyTransactions[monthKey] = (monthlyTransactions[monthKey] || 0) + 1;
    });

    const labels = Object.keys(monthlyTransactions).sort();
    const data = labels.map(key => monthlyTransactions[key]);

    if (state.charts.transactionTimeline) {
        state.charts.transactionTimeline.destroy();
    }

    state.charts.transactionTimeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Numero Transazioni',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function createROITimelineChart() {
    const ctx = document.getElementById('roiTimelineChart');
    if (!ctx) return;

    // Simplified ROI timeline - in real scenario, this would come from historical data
    const months = ['Gen 21', 'Mar 21', 'Mag 21', 'Lug 21', 'Set 21', 'Nov 21', 'Gen 24', 'Mar 24', 'Mag 24', 'Lug 24', 'Set 24', 'Nov 24'];
    const roi = [0, 2.5, 11.5, 16.5, 24, 26.2, 27.8, 26.5, 27.9, 61, 64.5, 67.8];

    if (state.charts.roiTimeline) {
        state.charts.roiTimeline.destroy();
    }

    state.charts.roiTimeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'ROI %',
                data: roi,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => formatPercentage(context.parsed.y)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => value + '%'
                    }
                }
            }
        }
    });
}

// ==============================================
// Event Handlers
// ==============================================

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Filters
    document.getElementById('assetClassFilter')?.addEventListener('change', (e) => {
        state.filters.assetClass = e.target.value;
        renderPortfolioTable();
    });

    document.getElementById('strategyFilter')?.addEventListener('change', (e) => {
        state.filters.strategy = e.target.value;
        renderPortfolioTable();
    });

    document.getElementById('portfolioSearch')?.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderPortfolioTable();
    });

    document.getElementById('transactionSearch')?.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderTransactionsTable();
    });

    document.getElementById('actionFilter')?.addEventListener('change', (e) => {
        state.filters.action = e.target.value;
        renderTransactionsTable();
    });

    document.getElementById('platformFilter')?.addEventListener('change', (e) => {
        state.filters.platform = e.target.value;
        renderTransactionsTable();
    });

    document.getElementById('dateFromFilter')?.addEventListener('change', (e) => {
        state.filters.dateFrom = e.target.value;
        renderTransactionsTable();
    });

    document.getElementById('dateToFilter')?.addEventListener('change', (e) => {
        state.filters.dateTo = e.target.value;
        renderTransactionsTable();
    });

    // Refresh prices button
    document.getElementById('refreshPricesBtn')?.addEventListener('click', () => {
        updateAllPrices();
    });

    // Table sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            sortTable(th.closest('table'), sortKey);
        });
    });
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName)?.classList.add('active');

    // Load tab-specific data
    switch(tabName) {
        case 'dashboard':
            createPortfolioChart();
            createAllocationChart();
            createAssetClassChart();
            createGeographyChart();
            break;
        case 'platforms':
            createPlatformChart();
            break;
        case 'strategy':
            createStrategyChart();
            break;
        case 'performance':
            createAssetPerformanceChart();
            createCategoryPerformanceChart();
            createTransactionTimelineChart();
            createROITimelineChart();
            break;
    }
}

function sortTable(table, key) {
    // Simple sorting implementation
    console.log('Sorting by:', key);
    // In a full implementation, this would re-sort the data and re-render the table
}

// ==============================================
// Loading State
// ==============================================

function showLoading() {
    document.getElementById('loadingOverlay')?.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay')?.classList.add('hidden');
}

// ==============================================
// Initialization
// ==============================================

function init() {
    showLoading();

    // Load sample data
    state.transactions = SAMPLE_TRANSACTIONS;
    state.portfolio = SAMPLE_PORTFOLIO;
    state.platforms = SAMPLE_PLATFORMS;
    state.strategy = SAMPLE_STRATEGY;

    // Initialize UI
    updateDashboard();
    renderPortfolioTable();
    renderTransactionsTable();
    renderPlatformsTable();
    renderStrategyTable();
    renderRebalancingTable();
    renderAssetsTable();

    // Create charts
    createPortfolioChart();
    createAllocationChart();
    createAssetClassChart();
    createGeographyChart();

    // Setup event listeners
    setupEventListeners();

    hideLoading();
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
