/**
 * binanceCsvService.js
 *
 * Parsing e analisi del CSV di storico transazioni Binance.
 * Formato: User ID, Time, Account, Operation, Coin, Change, Remark
 *
 * Categorizzazione operazioni:
 *   BUY          — acquisto con fiat o conversione entrata
 *   SELL         — vendita / conversione uscita
 *   STAKING      — Simple Earn Interest, Locked Rewards, WBETH Staking
 *   AIRDROP      — HODLer Airdrops, Launchpool, Distribution, Cashback, Asset Recovery
 *   DEPOSIT      — deposito da wallet esterno
 *   WITHDRAW     — prelievo verso wallet esterno
 *   FEE          — commissioni
 *   INTERNAL     — trasferimenti interni Binance (si cancellano a coppie)
 */

// ── Classificazione operazioni ────────────────────────────────────────────────

const OP_CATEGORY = {
  // Acquisti
  'Transaction Buy':            'BUY',
  'Buy Crypto With Fiat':       'BUY',
  'Auto-Invest Transaction':    'BUY',
  'P2P Trading':                'BUY',
  'Fiat Deposit':               'FIAT_IN',

  // Vendite / spend
  'Transaction Spend':          'SELL',
  'Tax Liquidation':            'SELL',

  // Fee
  'Transaction Fee':            'FEE',

  // Conversioni Binance
  'Binance Convert':            'CONVERT',

  // Staking / Earn
  'Simple Earn Flexible Interest':     'STAKING',
  'Simple Earn Locked Rewards':        'STAKING',
  'WBETH2.0 - Staking':               'STAKING',
  'Staking Rewards':                   'STAKING',
  'ETH 2.0 Staking Rewards':          'STAKING',
  'Savings Interest':                  'STAKING',
  'Locked Staking':                    'STAKING',
  'DeFi Staking Rewards':             'STAKING',

  // Airdrops / regali
  'HODLer Airdrops Distribution':              'AIRDROP',
  'Launchpool Airdrop - System Distribution':  'AIRDROP',
  'Airdrop Assets':                            'AIRDROP',
  'Distribution':                              'AIRDROP',
  'Cashback Voucher':                          'AIRDROP',
  'Asset Recovery':                            'AIRDROP',
  'Funds Transfer Request - Vega':             'AIRDROP',

  // Depositi / Prelievi
  'Deposit':    'DEPOSIT',
  'Withdraw':   'WITHDRAW',

  // Interni (si annullano)
  'Simple Earn Flexible Subscription':       'INTERNAL',
  'Simple Earn Flexible Redemption':         'INTERNAL',
  'Simple Earn Locked Subscription':         'INTERNAL',
  'Transfer Between Main and Funding Wallet':              'INTERNAL',
  'Transfer Between Main Account/Futures and Margin Account': 'INTERNAL',
};

// Coin da ignorare nell'analisi portfolio (fiat)
const FIAT_COINS = new Set(['EUR', 'USD', 'USDT', 'USDC', 'BUSD', 'TUSD', 'DAI', 'FDUSD']);

// CoinGecko ID map (esteso)
export const COINGECKO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', ADA: 'cardano',
  SOL: 'solana', DOT: 'polkadot', AVAX: 'avalanche-2', MATIC: 'matic-network',
  LINK: 'chainlink', UNI: 'uniswap', ATOM: 'cosmos', XRP: 'ripple',
  DOGE: 'dogecoin', SHIB: 'shiba-inu', LTC: 'litecoin', BCH: 'bitcoin-cash',
  ALGO: 'algorand', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
  WBETH: 'wrapped-beacon-eth', SXT: 'space-and-time', GALA: 'gala',
  NEAR: 'near', FTM: 'fantom', SAND: 'the-sandbox', MANA: 'decentraland',
  CRO: 'crypto-com-chain', VET: 'vechain', EOS: 'eos', TRX: 'tron',
  AAVE: 'aave', COMP: 'compound-governance-token', MKR: 'maker',
  SNX: 'synthetix-network-token', RUNE: 'thorchain', FIL: 'filecoin',
  ICP: 'internet-computer', HBAR: 'hedera-hashgraph', THETA: 'theta-token',
};

// ── Parser principale ─────────────────────────────────────────────────────────

/**
 * Parsa il testo CSV di Binance e restituisce array di transazioni normalizzate.
 * @param {string} csvText
 * @returns {Array<BinanceTx>}
 */
export function parseBinanceCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  // Rileva separatore (virgola o punto e virgola)
  const sep = lines[0].includes(';') ? ';' : ',';

  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

  const idx = {
    time:      headers.indexOf('Time'),
    account:   headers.indexOf('Account'),
    operation: headers.indexOf('Operation'),
    coin:      headers.indexOf('Coin'),
    change:    headers.indexOf('Change'),
    remark:    headers.indexOf('Remark'),
  };

  const txs = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parsing CSV robusto (gestisce virgole dentro virgolette)
    const cols = parseCSVLine(line, sep);
    if (cols.length < 5) continue;

    const operation = (cols[idx.operation] || '').trim();
    const coin      = (cols[idx.coin]      || '').trim().toUpperCase();
    const changeRaw = (cols[idx.change]    || '').trim().replace(',', '');
    const change    = parseFloat(changeRaw);
    const timeStr   = (cols[idx.time]      || '').trim();
    const account   = (cols[idx.account]   || '').trim();
    const remark    = (cols[idx.remark]    || '').trim();

    if (!operation || !coin || isNaN(change)) continue;

    const category = OP_CATEGORY[operation] || 'OTHER';
    const date     = parseDate(timeStr);

    txs.push({
      id:        i,
      date,
      dateStr:   timeStr,
      account,
      operation,
      category,
      coin,
      change,
      remark,
      isFiat:    FIAT_COINS.has(coin),
    });
  }

  // Ordina per data crescente
  txs.sort((a, b) => a.date - b.date);
  return txs;
}

function parseCSVLine(line, sep = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(str) {
  if (!str) return new Date(0);
  // Formato Binance: "21-12-01 14:31:59" (YY-MM-DD)
  const m = str.match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const [, yy, mo, dd, hh, mm, ss] = m;
    return new Date(`20${yy}-${mo}-${dd}T${hh}:${mm}:${ss}Z`);
  }
  return new Date(str);
}

// ── Calcolo holdings ──────────────────────────────────────────────────────────

/**
 * Calcola la quantità netta per ogni coin.
 * Include tutte le operazioni tranne i trasferimenti INTERNAL
 * (che si cancellano a coppie).
 */
export function computeHoldings(txs) {
  const holdings = {};

  for (const tx of txs) {
    if (tx.category === 'INTERNAL') continue;
    if (tx.isFiat) continue;

    if (!holdings[tx.coin]) holdings[tx.coin] = 0;
    holdings[tx.coin] += tx.change;
  }

  // Rimuovi quantità trascurabili (<0)
  const result = {};
  for (const [coin, qty] of Object.entries(holdings)) {
    if (qty > 0.0000001) result[coin] = qty;
  }
  return result;
}

// ── Calcolo costo EUR ─────────────────────────────────────────────────────────

/**
 * Calcola il totale EUR investito (fiat out).
 * Sono le righe dove Coin=EUR e Change<0, o acquisti con fiat.
 */
export function computeEurInvested(txs) {
  let total = 0;

  for (const tx of txs) {
    if (tx.coin === 'EUR' && tx.change < 0) {
      total += Math.abs(tx.change);
    }
    // Acquisto crypto con fiat non-EUR (USDT speso per acquistare)
    if (tx.coin === 'USDT' && tx.change < 0 &&
        ['BUY', 'CONVERT'].includes(tx.category)) {
      // Approssimazione 1:1 EUR/USDT per semplicità
      // In un sistema più avanzato si userebbe il tasso di cambio storico
      total += Math.abs(tx.change);
    }
  }

  return total;
}

// ── Calcolo redditi staking & airdrops ────────────────────────────────────────

/**
 * Raggruppa i redditi da staking e airdrops per anno e per coin.
 * @returns {{ byYear: { [year]: { [coin]: number } }, byCoin: { [coin]: number }, total_txs: number }}
 */
export function computePassiveIncome(txs) {
  const PASSIVE_CATEGORIES = new Set(['STAKING', 'AIRDROP']);
  const byYear  = {};
  const byCoin  = {};
  let   txCount = 0;

  for (const tx of txs) {
    if (!PASSIVE_CATEGORIES.has(tx.category)) continue;
    if (tx.change <= 0) continue;
    if (tx.isFiat) continue;

    const year = tx.date.getFullYear().toString();
    if (!byYear[year]) byYear[year] = {};
    byYear[year][tx.coin] = (byYear[year][tx.coin] || 0) + tx.change;
    byCoin[tx.coin] = (byCoin[tx.coin] || 0) + tx.change;
    txCount++;
  }

  return { byYear, byCoin, total_txs: txCount };
}

// ── Statistiche acquisti ──────────────────────────────────────────────────────

/**
 * Statistiche sugli acquisti per coin.
 * Restituisce: { [coin]: { totalBought, avgPrice_eur, txCount } }
 * Nota: avgPrice è stimato dal fiat speso diviso le unità acquistate.
 */
export function computeBuyStats(txs) {
  // Raggruppa BUY per "gruppo di transazione" (stesso timestamp ≈ stesso ordine)
  const stats = {};
  const eurSpentByTs = {}; // timestamp → EUR speso

  // Prima passata: raccogli EUR spesi per timestamp
  for (const tx of txs) {
    if (tx.coin === 'EUR' && tx.change < 0) {
      const tsKey = tx.date.getTime();
      eurSpentByTs[tsKey] = Math.abs(tx.change);
    }
  }

  // Seconda passata: ogni BUY non-fiat
  for (const tx of txs) {
    if (!['BUY', 'AUTO-INVEST'].includes(tx.category?.toUpperCase()) &&
        tx.operation !== 'Auto-Invest Transaction' &&
        tx.operation !== 'Transaction Buy' &&
        tx.operation !== 'Buy Crypto With Fiat') continue;
    if (tx.isFiat || tx.change <= 0) continue;

    if (!stats[tx.coin]) {
      stats[tx.coin] = { totalBought: 0, totalEur: 0, txCount: 0 };
    }

    const tsKey = tx.date.getTime();
    const eurSpent = eurSpentByTs[tsKey] || 0;

    stats[tx.coin].totalBought += tx.change;
    stats[tx.coin].totalEur   += eurSpent;
    stats[tx.coin].txCount    += 1;
  }

  // Calcola prezzo medio
  for (const coin of Object.keys(stats)) {
    const s = stats[coin];
    s.avgPrice_eur = s.totalBought > 0 && s.totalEur > 0
      ? s.totalEur / s.totalBought
      : null;
  }

  return stats;
}

// ── Timeline per grafici ───────────────────────────────────────────────────────

/**
 * Raggruppa i redditi passivi per mese (per grafico a barre).
 * @returns Array<{ month: 'YYYY-MM', staking: number, airdrop: number, coinBreakdown: {...} }>
 */
export function computeIncomeTimeline(txs, prices = {}) {
  const PASSIVE_CATEGORIES = new Set(['STAKING', 'AIRDROP']);
  const byMonth = {};

  for (const tx of txs) {
    if (!PASSIVE_CATEGORIES.has(tx.category)) continue;
    if (tx.change <= 0 || tx.isFiat) continue;

    const d = tx.date;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (!byMonth[month]) {
      byMonth[month] = { month, staking: 0, airdrop: 0, eurValue: 0, coinBreakdown: {} };
    }

    const price = prices[tx.coin] || 0;
    const eurVal = tx.change * price;

    byMonth[month].eurValue += eurVal;
    byMonth[month].coinBreakdown[tx.coin] = (byMonth[month].coinBreakdown[tx.coin] || 0) + tx.change;

    if (tx.category === 'STAKING') byMonth[month].staking += eurVal;
    else byMonth[month].airdrop += eurVal;
  }

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Raggruppa i redditi passivi per anno (per la tabella riepilogativa).
 */
export function computeIncomeByYear(txs, prices = {}) {
  const PASSIVE_CATEGORIES = new Set(['STAKING', 'AIRDROP']);
  const byYear = {};

  for (const tx of txs) {
    if (!PASSIVE_CATEGORIES.has(tx.category)) continue;
    if (tx.change <= 0 || tx.isFiat) continue;

    const year = tx.date.getFullYear().toString();
    if (!byYear[year]) {
      byYear[year] = { year, staking: 0, airdrop: 0, eurValue: 0, txCount: 0, coins: {} };
    }

    const price = prices[tx.coin] || 0;
    const eurVal = tx.change * price;

    byYear[year].eurValue += eurVal;
    byYear[year].txCount  += 1;
    byYear[year].coins[tx.coin] = (byYear[year].coins[tx.coin] || 0) + tx.change;

    if (tx.category === 'STAKING') byYear[year].staking += eurVal;
    else byYear[year].airdrop += eurVal;
  }

  return Object.values(byYear).sort((a, b) => a.year.localeCompare(b.year));
}

// ── Filtraggio transazioni per la tabella ─────────────────────────────────────

export function filterTransactions(txs, filter) {
  if (filter === 'ALL') return txs.filter(t => !t.isFiat && t.category !== 'INTERNAL');

  const MAP = {
    BUY:      t => ['BUY'].includes(t.category) && t.change > 0 && !t.isFiat,
    STAKING:  t => t.category === 'STAKING' && t.change > 0,
    AIRDROP:  t => t.category === 'AIRDROP' && t.change > 0,
    CONVERT:  t => t.category === 'CONVERT',
    WITHDRAW: t => t.category === 'WITHDRAW',
    SELL:     t => t.category === 'SELL' || (t.change < 0 && !['INTERNAL','FEE'].includes(t.category) && !t.isFiat),
  };

  const fn = MAP[filter];
  return fn ? txs.filter(fn) : txs;
}

// ── Fetch prezzi CoinGecko ────────────────────────────────────────────────────

/**
 * Scarica i prezzi attuali in EUR per una lista di coin da CoinGecko.
 * @param {string[]} coins
 * @returns {Promise<{ [coin]: number }>}
 */
export async function fetchPrices(coins) {
  const relevant = coins.filter(c => !FIAT_COINS.has(c) && COINGECKO_IDS[c]);
  if (relevant.length === 0) return {};

  const ids = [...new Set(relevant.map(c => COINGECKO_IDS[c]))].join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const prices = {};
    for (const coin of relevant) {
      const id   = COINGECKO_IDS[coin];
      const info = data[id];
      if (info) {
        prices[coin] = {
          price:     info.eur,
          change24h: info.eur_24h_change || 0,
        };
      }
    }
    // Stablecoin = 1 EUR
    for (const c of ['USDT', 'USDC', 'BUSD', 'DAI', 'FDUSD', 'TUSD']) {
      prices[c] = { price: 1, change24h: 0 };
    }
    return prices;
  } catch (e) {
    console.warn('[binanceCsvService] fetchPrices fallito:', e.message);
    return {};
  }
}

// ── Dati per i KPI cards ──────────────────────────────────────────────────────

/**
 * Calcola tutti i KPI del portfolio crypto.
 */
export function computePortfolioKPIs(holdings, prices, eurInvested, passiveIncome) {
  let totalValue = 0;
  let totalPassiveEur = 0;

  for (const [coin, qty] of Object.entries(holdings)) {
    const p = prices[coin]?.price || 0;
    totalValue += qty * p;
  }

  // Valore dei redditi passivi ai prezzi attuali
  for (const [coin, qty] of Object.entries(passiveIncome.byCoin || {})) {
    const p = prices[coin]?.price || 0;
    totalPassiveEur += qty * p;
  }

  const pnl    = totalValue - eurInvested;
  const pnlPct = eurInvested > 0 ? (pnl / eurInvested) * 100 : 0;

  return {
    totalValue,
    eurInvested,
    pnl,
    pnlPct,
    totalPassiveEur,
  };
}

// ── Dati per la tabella holdings ──────────────────────────────────────────────

export function buildHoldingsRows(holdings, prices, buyStats, passiveIncome) {
  const rows = [];

  for (const [coin, qty] of Object.entries(holdings)) {
    const priceInfo = prices[coin];
    const price     = priceInfo?.price || 0;
    const change24h = priceInfo?.change24h || 0;
    const value     = qty * price;

    const bs = buyStats[coin];
    const avgBuyPrice = bs?.avgPrice_eur || null;
    const pnl = avgBuyPrice ? (price - avgBuyPrice) * qty : null;
    const pnlPct = avgBuyPrice ? ((price - avgBuyPrice) / avgBuyPrice) * 100 : null;

    const passiveQty = passiveIncome.byCoin?.[coin] || 0;
    const passiveEur = passiveQty * price;

    rows.push({
      coin,
      qty,
      price,
      change24h,
      value,
      avgBuyPrice,
      pnl,
      pnlPct,
      passiveQty,
      passiveEur,
      hasPrice: price > 0,
    });
  }

  // Ordina per valore decrescente
  return rows.sort((a, b) => b.value - a.value);
}
