/**
 * csvImportService.js
 * Multi-platform CSV import engine for Investment Tracker.
 *
 * Supported platforms:
 *   trading212  — Trading 212 activity export
 *   degiro      — DeGiro transactions (Italian & English)
 *   fineco      — Fineco Bank trades
 *   binance     — Binance spot trading history (two export formats)
 *   cryptocom   — Crypto.com app CSV
 *   ibkr        — Interactive Brokers Activity Statement
 *   generic     — App's own export format (re-import)
 *   unknown     — Falls through with a warning
 *
 * Each platform parser returns:
 *   { transactions: [...], skipped: [{ rowIndex, reason, rawRow }] }
 *
 * Top-level parseCSVFile() returns:
 *   { platform, platformLabel, transactions, skipped, warnings }
 */

import Papa from 'papaparse';
import { lookupISIN } from './isinMapping';
import { isCrypto } from './coinGecko';
import { getCompositionProfile } from '../data/etfComposition';

// ── Crypto ETP / ETC / ETN database ──────────────────────────────────────────
// Prodotti exchange-traded che tracciano crypto ma hanno ISIN e tradano come ETF/ETC.

const CRYPTO_ETP_ISINS = new Set([
  // 21Shares
  'DE000A27Z304',  // 21Shares Bitcoin ETP (ABTC)
  'DE000A3GPSP7',  // 21Shares Crypto Basket (HODL)
  'XS2376095977',  // 21Shares Ethereum ETP
  'XS2376090564',  // 21Shares Solana ETP
  'XS2376092727',  // 21Shares Polkadot ETP
  'XS2706720603',  // 21Shares XRP ETP
  'XS2714392027',  // 21Shares Cardano ETP
  // ETC Group
  'DE000A27Z2Y6',  // ETC Group Bitcoin ETP (BTCE)
  'DE000A3GQ5X4',  // ETC Group Ethereum ETP (ZETH)
  'DE000A3G0OE1',  // ETC Group Digital Assets ETP
  // CoinShares
  'GB00BLD4ZL17',  // CoinShares Physical Bitcoin (CBTC)
  'GB00BJYDH618',  // CoinShares Physical Ethereum (CETH)
  'GB00BH4SXB88',  // CoinShares Physical Staked Cardano
  // WisdomTree
  'JE00B4ND3602',  // WisdomTree Physical Bitcoin (BTCW)
  'JE00B6SGH468',  // WisdomTree Physical Ethereum
  // VanEck
  'DE000A28M8D0',  // VanEck Bitcoin ETN
  'DE000A3GPHZ1',  // VanEck Ethereum ETN
  // Invesco
  'XS2530201916',  // Invesco Physical Bitcoin (BTIC)
  // iShares / Fidelity (US, su piattaforme internazionali)
  'US4642873560',  // iShares Bitcoin Trust (IBIT)
  'US31617X2009',  // Fidelity Wise Origin Bitcoin ETF (FBTC)
]);

const CRYPTO_ETP_KEYWORDS = [
  'bitcoin etp', 'bitcoin etc', 'bitcoin etn', 'bitcoin etf', 'bitcoin trust',
  'ethereum etp', 'ethereum etc', 'ethereum etn', 'ethereum etf',
  'btc etp', 'btc etc', 'btc etn', 'btc etf',
  'eth etp', 'eth etc', 'eth etn', 'eth etf',
  'crypto basket etp', 'crypto index etp', 'crypto etp',
  '21shares bitcoin', '21shares ethereum', '21shares crypto',
  'wisdomtree bitcoin', 'wisdomtree ethereum',
  'coinshares physical bitcoin', 'coinshares physical ethereum',
  'vaneck bitcoin', 'vaneck ethereum',
  'etc group bitcoin', 'etc group ethereum',
  'invesco physical bitcoin', 'grayscale bitcoin',
];

// ─────────────────────────────────────────────────────────────────────────────
// SAFE HELPERS — never throw, never produce NaN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a number from a cell that may be formatted as:
 *   "1.234,56"  →  European with dot-thousands, comma-decimal
 *   "1,234.56"  →  US format
 *   "€ 25,00"   →  with currency symbol
 *   "-0.005"    →  plain negative
 *   ""          →  fallback
 */
export function safeFloat(v, fallback = 0) {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim()
    .replace(/[€$£¥₿%\s]/g, '');  // strip currency/percent symbols

  if (s === '' || s === '-' || s === '+') return fallback;

  const hasDot   = s.includes('.');
  const hasComma = s.includes(',');

  // Both separators → last one is the decimal: "1.234,56" vs "1,234.56"
  if (hasDot && hasComma) {
    return (s.lastIndexOf(',') > s.lastIndexOf('.'))
      ? parseFloat(s.replace(/\./g, '').replace(',', '.')) || fallback   // European
      : parseFloat(s.replace(/,/g, ''))                   || fallback;   // US
  }

  // Only commas → European decimal comma: "1234,56" or "1.234,56" already handled above
  if (hasComma) {
    return parseFloat(s.replace(',', '.')) || fallback;
  }

  // Only dots → check for European thousands: MUST have 2+ groups "1.234.567"
  // A single dot-group like "104.101" is ambiguous — treat as US decimal (safer for CSV exports)
  if (hasDot) {
    if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
      return parseFloat(s.replace(/\./g, '')) || fallback; // e.g. "1.234.567" → 1234567
    }
    return parseFloat(s) || fallback; // e.g. "104.101" → 104.101, "94.3504" → 94.3504
  }

  // Plain integer
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

/**
 * Normalize a date string to YYYY-MM-DD.
 * Handles: ISO, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD HH:mm:ss,
 *          "2023-01-15, 14:23:00" (IBKR), DD-MM-YYYY (DeGiro)
 */
export function safeDate(v) {
  if (!v) return null;
  const s = String(v).trim();

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // ISO with time: "2023-01-15 14:23:00" or "2023-01-15T14:23:00"
  if (/^\d{4}-\d{2}-\d{2}[T ]/.test(s)) return s.substring(0, 10);

  // Binance 2-digit year: "21-12-01 14:31:59"
  const binance2y = s.match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (binance2y) return `20${binance2y[1]}-${binance2y[2]}-${binance2y[3]}`;

  // IBKR: "2023-01-15, 14:23:00"
  if (/^\d{4}-\d{2}-\d{2},/.test(s)) return s.substring(0, 10);

  // DeGiro: "15-01-2023"
  const dash = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dash) return `${dash[3]}-${dash[2]}-${dash[1]}`;

  // DD/MM/YYYY or DD/MM/YYYY HH:mm
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const d = slash[1].padStart(2, '0');
    const m = slash[2].padStart(2, '0');
    return `${slash[3]}-${m}-${d}`;
  }

  // MM/DD/YYYY (US): ambiguous if day ≤ 12, but try JS Date as fallback
  const parsed = new Date(s);
  if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];

  return null;
}

/** Strip exchange suffix from ticker: "VOO.US" → "VOO" */
function stripExchange(ticker) {
  if (!ticker) return '';
  return ticker.replace(/\.(US|DE|MI|AS|PA|L|LON|XET|XETRA|F|BE|AMS|BR)$/i, '').toUpperCase().trim();
}

/** Map Binance pair "BTCEUR" → ticker "BTC", quote "EUR" */
function parseBinancePair(pair) {
  const quotes = ['EUR', 'USDT', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB', 'USDC'];
  for (const q of quotes) {
    if (pair.endsWith(q)) {
      return { base: pair.slice(0, -q.length), quote: q };
    }
  }
  return { base: pair, quote: 'USDT' };
}

/**
 * Infer { macro, micro } from name / ISIN / ticker.
 * Priority: crypto ETP ISIN → crypto ETP name → spot crypto ticker → ETF → bond → stock
 */
function inferMacro(name = '', isin = '', ticker = '') {
  const n = (name + ' ' + ticker).toLowerCase();
  // Strip quote suffix from crypto pairs: BTC-EUR → BTC, BTCUSDT → BTC handled by isCrypto
  const t = ticker.toUpperCase().replace(/[-/](EUR|USD|USDT|USDC|GBP|CHF|BTC|ETH)$/i, '').trim();

  // 1. Known crypto ETP/ETC/ETN ISIN
  if (isin && CRYPTO_ETP_ISINS.has(isin)) return { macro: 'ETF', micro: 'Crypto ETF' };

  // 2. Crypto ETP/ETC/ETN by name keywords
  if (CRYPTO_ETP_KEYWORDS.some(k => n.includes(k))) return { macro: 'ETF', micro: 'Crypto ETF' };

  // 3. Spot crypto by ticker (CoinGecko map + extended pattern)
  const EXTRA_CRYPTO = /^(XRP|SOL|ADA|DOT|AVAX|MATIC|LINK|UNI|AAVE|ATOM|ALGO|XLM|NEAR|FTM|GRT|CHZ|MANA|SAND|AXS|FLOW|HBAR|VET|THETA|ICP|FIL|ZEC|XMR|TRX|XTZ|CRV|MKR|COMP|SUSHI|APE|IMX|LRC|BAT|ZRX|ENJ|GALA|RVN|SC|DCR|DGB|BTT|HOT|JASMY|CAKE|BNB|SXT)$/;
  if (t && (isCrypto(t) || EXTRA_CRYPTO.test(t))) return { macro: 'Crypto', micro: '' };

  // 4. ETF by name keywords
  const etfWords = ['ishares', 'vanguard', 'spdr', 'xtrackers', 'amundi', 'lyxor',
    'wisdomtree', 'invesco', 'fidelity', 'msci', 'ftse', 'ucits', '(acc)', '(dist)', 'etf'];
  if (etfWords.some(k => n.includes(k))) return { macro: 'ETF', micro: '' };

  // 5. Bonds (XS ISIN = international bond)
  if (isin.startsWith('XS')) return { macro: 'Obbligazioni', micro: '' };

  return { macro: 'Azioni', micro: '' };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORMS = {
  trading212: {
    label: 'Trading 212',
    detect: (h) => h.includes('action') && h.includes('no. of shares') && h.includes('isin'),
  },
  degiro: {
    label: 'DeGiro',
    detect: (h) =>
      h.some(x => x.includes('commissioni di transazione') || x.includes('tipo transazione')) ||
      (h.includes('prodotto') && h.includes('borsa') && h.includes('quantità')),
  },
  fineco: {
    label: 'Fineco Bank',
    detect: (h) =>
      h.some(x => x.includes('controvalore')) ||
      (h.some(x => x.includes('tipo ordine')) && h.some(x => x.includes('commissioni'))) ||
      // Export "Lista Titoli" — colonne: Operazione, Data valuta, Titolo, Isin, Segno, Quantita, Divisa, Prezzo, Controvalore
      (h.some(x => x === 'isin' || x === 'isin ') && h.some(x => x === 'segno') && h.some(x => x === 'divisa')),
  },
  binance_spot: {
    label: 'Binance (Spot Trading)',
    detect: (h) =>
      // Format classico: Pair + Side + Executed
      (h.includes('pair') && h.includes('side') && h.includes('executed')) ||
      // Format nuovo (2024): Date(UTC) + Pair + Side senza "executed"
      (h.some(x => x === 'date(utc)' || x === 'date(utc):') && h.includes('pair') && h.includes('side')) ||
      // Trade history con Order Amount
      (h.includes('pair') && h.includes('side') && h.some(x => x.includes('order') && x.includes('amount'))),
  },
  binance_history: {
    label: 'Binance (Transaction History)',
    detect: (h) =>
      // Format classico
      (h.includes('utc_time') && h.includes('operation') && h.includes('coin') && h.includes('change')) ||
      // Format con Account column
      (h.some(x => x.includes('utc')) && h.includes('operation') && h.includes('coin') && h.includes('change')) ||
      // Format Binance App export (Account, Operation, Coin, Change, Remark)
      (h.includes('account') && h.includes('operation') && h.includes('coin') && h.includes('change')),
  },
  cryptocom: {
    label: 'Crypto.com',
    detect: (h) => h.includes('transaction kind') && h.includes('native currency'),
  },
  ibkr: {
    label: 'Interactive Brokers',
    detect: (h) =>
      (h.includes('t. price') && h.includes('comm/fee')) ||
      (h.includes('symbol') && h.includes('t. price')),
  },
  revolut: {
    label: 'Revolut',
    detect: (h) =>
      h.includes('started date') && h.includes('completed date') &&
      (h.includes('fiat amount') || h.includes('base currency')),
  },
  generic: {
    label: 'Formato generico (export app)',
    detect: (h) => h.includes('ticker') && h.includes('price') && h.includes('quantity') && h.includes('type'),
  },
};

export function detectPlatform(headers) {
  // Strip BOM (﻿) and normalize whitespace — common in Binance/Excel exports
  const h = headers.map(x => String(x).toLowerCase().trim().replace(/^﻿/, '').replace(/\s+/g, ' '));
  for (const [key, def] of Object.entries(PLATFORMS)) {
    if (def.detect(h)) return key;
  }
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSERS
// ─────────────────────────────────────────────────────────────────────────────

function parseTrading212(rows) {
  const transactions = [];
  const skipped = [];

  // ── Pre-scan corporate actions ──────────────────────────────────────────────
  // Una migrazione di ticker (es. Carnival PLC → Carnival Corp) appare come:
  //   Market sell a prezzo 0 (colonna Result = perdita = costo di carico)
  //   + Stock acquisition a prezzo 0 (stessa quantità, stessa data)
  // Ricaviamo il costo di carico per azione dalla vendita e lo trasferiamo,
  // così la nuova posizione NON parte da costo €0 (che darebbe ROI infinito).
  const corpActionCost = {}; // key: `${date}|${qty}` -> costo per azione
  rows.forEach(row => {
    const action = String(row['Action'] || '').trim();
    if (action === 'Market sell' || action === 'Limit sell') {
      const price  = safeFloat(row['Price / share']);
      const qty    = safeFloat(row['No. of shares']);
      const result = safeFloat(row['Result']);
      // vendita a prezzo ~0 con un Result → disposal da corporate action
      if (price === 0 && qty > 0 && result !== 0) {
        const costBasis = Math.abs(result); // proventi 0 → costo = -result
        const key = `${safeDate(row['Time'])}|${qty.toFixed(4)}`;
        corpActionCost[key] = costBasis / qty;
      }
    }
  });

  rows.forEach((row, i) => {
    try {
      const action   = String(row['Action'] || '').trim();
      const date     = safeDate(row['Time']);
      const sourceId = String(row['ID'] || '').trim(); // T212 unique transaction ID
      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      // Cash deposit
      if (action === 'Deposit') {
        const amount = Math.abs(safeFloat(row['Total']));
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Importo deposito zero', rawRow: row }); return; }
        transactions.push({ ticker: 'CASH', name: 'Deposito', isin: '', macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: 'EUR', notes: row['Notes'] || '', type: 'buy', sourceId });
        return;
      }

      // Cash withdrawal
      if (action === 'Withdrawal') {
        const amount = Math.abs(safeFloat(row['Total']));
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Importo prelievo zero', rawRow: row }); return; }
        transactions.push({ ticker: 'CASH', name: 'Prelievo', isin: '', macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: 'EUR', notes: row['Notes'] || '', type: 'sell', sourceId });
        return;
      }

      // Interest on cash / Lending interest → cash income
      if (action === 'Interest on cash' || action === 'Lending interest') {
        const amount = Math.abs(safeFloat(row['Total']));
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Importo interesse zero', rawRow: row }); return; }
        const label = action === 'Lending interest' ? 'Share Lending Interest' : 'Interest on Cash';
        transactions.push({ ticker: 'CASH', name: label, isin: '', macroCategory: 'Cash', microCategory: 'Interessi', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: 'EUR', notes: `T212 ${label}`, type: 'buy', sourceId });
        return;
      }

      // Dividend → cash income tagged as dividend
      if (action === 'Dividend (Dividend)' || action.startsWith('Dividend')) {
        const amount      = Math.abs(safeFloat(row['Total']));
        const withholding = Math.abs(safeFloat(row['Withholding tax']));
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Importo dividendo zero', rawRow: row }); return; }
        const name   = String(row['Name'] || '').trim();
        const isin   = String(row['ISIN'] || '').trim();
        const isinData = lookupISIN(isin);
        const ticker = isinData ? isinData.ticker : stripExchange(row['Ticker'] || '');
        const notesParts = [`Dividendo da ${ticker || name}`];
        if (withholding > 0) notesParts.push(`Ritenuta: €${withholding.toFixed(2)}`);
        transactions.push({ ticker: ticker || 'CASH', name: `Dividendo ${name}`, isin, macroCategory: 'Cash', microCategory: 'Dividendi', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: 'EUR', notes: notesParts.join(' | '), type: 'buy', isDividend: true, dividendTicker: ticker, sourceId });
        return;
      }

      // Stock acquisition (corporate action, es. migrazione ticker)
      if (action === 'Stock acquisition') {
        const quantity = safeFloat(row['No. of shares']);
        if (quantity <= 0) { skipped.push({ rowIndex: i, reason: 'Stock acquisition: quantità zero', rawRow: row }); return; }
        const name   = String(row['Name'] || '').trim();
        const isin   = String(row['ISIN'] || '').trim();
        const isinData = lookupISIN(isin);
        const ticker = isinData ? isinData.ticker : stripExchange(row['Ticker'] || '');
        const { macro, micro } = isinData ? { macro: isinData.macroCategory, micro: isinData.microCategory || '' } : inferMacro(name, isin, ticker);
        // Trasferisci il costo di carico dalla vendita corporate-action associata
        const key = `${date}|${quantity.toFixed(4)}`;
        const costPerShare = corpActionCost[key] || 0;
        const noteBase = costPerShare > 0
          ? `Corporate action — costo trasferito €${costPerShare.toFixed(2)}/az.`
          : 'Corporate action / Stock acquisition (T212)';
        transactions.push({ ticker: ticker || name.substring(0, 10).toUpperCase(), name, isin, macroCategory: macro, microCategory: micro, date, price: parseFloat(costPerShare.toFixed(6)), quantity, commission: 0, currency: 'EUR', notes: noteBase, type: 'buy', sourceId });
        return;
      }

      const isBuy  = action === 'Market buy'  || action === 'Limit buy';
      const isSell = action === 'Market sell' || action === 'Limit sell';
      if (!isBuy && !isSell) { skipped.push({ rowIndex: i, reason: `Azione ignorata: "${action}"`, rawRow: row }); return; }

      const quantity = safeFloat(row['No. of shares']);
      const total    = Math.abs(safeFloat(row['Total']));
      // Allow sell with total=0 (corporate delisting / forced exit)
      if (quantity <= 0) { skipped.push({ rowIndex: i, reason: 'Quantità zero', rawRow: row }); return; }
      if (total <= 0 && isBuy) { skipped.push({ rowIndex: i, reason: 'Totale zero su acquisto', rawRow: row }); return; }

      // Vendita corporate-action a prezzo 0: usa il costo di carico come prezzo
      // così la "vendita" chiude a costo (realized ≈ 0), niente falsa perdita.
      const corpKey = `${date}|${quantity.toFixed(4)}`;
      const corpCost = (isSell && total === 0) ? (corpActionCost[corpKey] || 0) : 0;
      const price      = total > 0 ? total / quantity : corpCost;
      const commission = safeFloat(row['Currency conversion fee']) + safeFloat(row['Charge amount']) + safeFloat(row['Stamp duty reserve tax']);
      const name       = String(row['Name'] || '').trim();
      const isin       = String(row['ISIN'] || '').trim();
      const currency   = String(row['Currency (Price / share)'] || 'EUR').trim();

      const isinData = lookupISIN(isin);
      const ticker = isinData ? isinData.ticker : stripExchange(row['Ticker'] || '');
      const { macro, micro } = isinData
        ? { macro: isinData.macroCategory, micro: isinData.microCategory || '' }
        : inferMacro(name, isin, ticker);

      const notesParts = [];
      if (commission > 0) notesParts.push(`Comm FX: €${commission.toFixed(2)}`);
      if (currency !== 'EUR') notesParts.push(`Valuta: ${currency}`);
      if (!isinData && row['Ticker']) notesParts.push(`T212 ticker: ${row['Ticker']}`);
      if (total === 0 && isSell) notesParts.push('Uscita forzata/delisting');

      transactions.push({ ticker: ticker || name.substring(0, 10).toUpperCase(), name, isin, macroCategory: macro, microCategory: micro, date, price: parseFloat(price.toFixed(6)), quantity, commission: parseFloat(commission.toFixed(4)), currency: 'EUR', notes: notesParts.join(' | '), type: isBuy ? 'buy' : 'sell', sourceId });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseDeGiro(rows) {
  const transactions = [];
  const skipped = [];

  rows.forEach((row, i) => {
    try {
      // DeGiro uses Italian or English headers
      const dateRaw = row['Data'] || row['Date'] || '';
      const date    = safeDate(dateRaw);
      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      const name     = String(row['Prodotto'] || row['Product'] || '').trim();
      const isin     = String(row['ISIN'] || '').trim();
      const qtyRaw   = row['Quantità'] || row['Quantity'] || '0';
      const qty      = safeFloat(qtyRaw);
      const priceRaw = row['Prezzo'] || row['Price'] || '0';
      const price    = safeFloat(priceRaw);
      const comm     = Math.abs(safeFloat(row['Commissioni di transazione (EUR)'] || row['Transaction costs'] || row['Commissioni'] || 0));
      const currency = String(row['Valuta'] || row['Currency'] || 'EUR').trim();
      const tipoRaw  = String(row['Tipo transazione'] || row['Transaction type'] || row['Descrizione'] || '').toLowerCase();

      if (qty === 0 && !tipoRaw.includes('deposito') && !tipoRaw.includes('deposit')) {
        skipped.push({ rowIndex: i, reason: 'Quantità zero', rawRow: row }); return;
      }

      // Deposits / withdrawals
      if (tipoRaw.includes('deposito') || tipoRaw.includes('deposit')) {
        const amount = Math.abs(safeFloat(row['Valore'] || row['Value'] || row['Variazione'] || 0));
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Deposito importo zero', rawRow: row }); return; }
        transactions.push({ ticker: 'CASH', name: 'Deposito', isin: '', macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: 'EUR', notes: 'DeGiro deposito', type: 'buy' });
        return;
      }

      if (price <= 0 && qty === 0) { skipped.push({ rowIndex: i, reason: 'Prezzo e quantità zero', rawRow: row }); return; }

      const isBuy = qty > 0 || tipoRaw.includes('acquisto') || tipoRaw.includes('buy');
      const absQty = Math.abs(qty);

      const isinData = lookupISIN(isin);
      const ticker = isinData ? isinData.ticker : (isin ? isin.substring(0, 8) : name.substring(0, 8).toUpperCase().replace(/\s/g, ''));
      const { macro, micro } = isinData
        ? { macro: isinData.macroCategory, micro: isinData.microCategory || '' }
        : inferMacro(name, isin, ticker || '');

      transactions.push({ ticker, name, isin, macroCategory: macro, microCategory: micro, date, price: Math.abs(price), quantity: absQty, commission: comm, currency, notes: `DeGiro | ${row['Borsa'] || row['Exchange'] || ''}`.trim(), type: isBuy ? 'buy' : 'sell' });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseFineco(rows) {
  const transactions = [];
  const skipped = [];

  rows.forEach((row, i) => {
    try {
      // Fineco ha più formati (Trading, Lista Titoli, Estratto conto); resilienza sui nomi
      const dateRaw = row['Data Ora'] || row['Data valuta'] || row['Data Valuta'] || row['Data'] || row['Date'] || row['DATA'] || '';
      const date    = safeDate(dateRaw);
      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      // Filtra righe non-operative (dividendi, cedole, spese) se presenti
      const opRaw = String(row['Operazione'] || row['Descrizione'] || '').toLowerCase();
      if (opRaw && !opRaw.includes('compravendita') && !opRaw.includes('titoli') && !opRaw.includes('trade')
          && (opRaw.includes('dividendo') || opRaw.includes('cedola') || opRaw.includes('bollo') || opRaw.includes('interessi'))) {
        skipped.push({ rowIndex: i, reason: `Operazione ignorata: "${opRaw}"`, rawRow: row });
        return;
      }

      // "Segno" nel formato Lista Titoli: A = Acquisto, V = Vendita
      const segno    = String(row['Segno'] || '').trim().toUpperCase();
      const tipoRaw  = String(row['Tipo Ordine'] || row['TIPO_OPERAZIONE'] || '').toLowerCase();
      const ticker   = String(row['Ticker'] || row['TICKER'] || row['Strumento'] || row['Titolo'] || '').trim().toUpperCase();
      const isin     = String(row['Isin'] || row['ISIN'] || '').trim();
      const name     = String(row['Titolo'] || row['Descrizione'] || row['Nome'] || ticker).trim();
      const qty      = safeFloat(row['Quantità'] || row['QUANTITA'] || row['Quantita'] || 0);
      const price    = safeFloat(row['Prezzo Unitario'] || row['Prezzo'] || row['PREZZO'] || 0);
      // Commissioni: possono essere in diverse colonne
      const comm     = safeFloat(row['Commissioni'] || row['COMMISSIONI'] || row['Spese'] || row['Commissioni amministrato'] || 0)
                     + safeFloat(row['Commissioni Fondi Sw/Ingr/Uscita'] || 0)
                     + safeFloat(row['Commissioni Fondi Banca Corrispondente'] || 0)
                     + safeFloat(row['Spese Fondi Sgr'] || 0);
      const currency = String(row['Divisa'] || row['Valuta'] || row['VALUTA'] || 'EUR').trim();

      if (qty <= 0 || price <= 0) { skipped.push({ rowIndex: i, reason: 'Quantità o prezzo zero', rawRow: row }); return; }

      // Determina buy/sell: prima da Segno (A/V), poi da tipoRaw
      const isSellF = segno === 'V' || segno === 'S'
                   || tipoRaw.includes('vendita') || tipoRaw.includes('sell') || tipoRaw === 'v' || tipoRaw === 's';

      const isinData = lookupISIN(isin);
      const resolvedTicker = isinData ? isinData.ticker : (ticker || isin.substring(0, 8));
      const { macro, micro } = isinData
        ? { macro: isinData.macroCategory, micro: isinData.microCategory || '' }
        : inferMacro(name, isin, ticker);

      // sourceId univoco: data + ISIN + qty + prezzo (Fineco non ha ID transazione)
      const sourceId = `fineco:${row['Data valuta'] || row['Data'] || dateRaw}|${isin}|${qty}|${price}`;

      transactions.push({ ticker: resolvedTicker, name: name || resolvedTicker, isin, macroCategory: macro, microCategory: micro, date, price, quantity: qty, commission: Math.abs(comm), currency, notes: `Fineco | ${row['Mercato'] || ''}`.trim(), type: isSellF ? 'sell' : 'buy', sourceId });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseBinanceSpot(rows) {
  const transactions = [];
  const skipped = [];

  // Normalize row keys: build a case-insensitive lookup for each row
  const get = (row, ...keys) => {
    const lc = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim().replace(/^﻿/, ''), v]));
    for (const k of keys) {
      const v = lc[k.toLowerCase()];
      if (v !== undefined && v !== '') return v;
    }
    return '';
  };

  rows.forEach((row, i) => {
    try {
      const date = safeDate(get(row, 'Date(UTC)', 'Date', 'Timestamp', 'Time'));
      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      const pair     = String(get(row, 'Pair', 'Market', 'Symbol') || '').trim().toUpperCase();
      const side     = String(get(row, 'Side', 'Type', 'Order Type') || '').trim().toUpperCase();
      const isBuy    = side.includes('BUY');
      const isSell   = side.includes('SELL');
      if (!isBuy && !isSell) { skipped.push({ rowIndex: i, reason: `Lato ignorato: "${side}"`, rawRow: row }); return; }

      const qty      = safeFloat(get(row, 'Executed', 'Exec. Qty', 'Quantity', 'Amount') || 0);
      const price    = safeFloat(get(row, 'Price', 'Avg. Price', 'T. Price', 'Trade Price') || 0);
      const feeRaw   = safeFloat(get(row, 'Fee', 'Commission') || 0);
      const feeCoin  = String(get(row, 'Fee Coin', 'Fee Currency', 'Fee Asset') || '').trim().toUpperCase();

      if (qty <= 0 || price <= 0) { skipped.push({ rowIndex: i, reason: 'Quantità o prezzo zero', rawRow: row }); return; }

      const { base } = parseBinancePair(pair);
      // Convert fee to EUR/USD approximation if fee is in crypto — store as note
      const commission = feeCoin === 'BNB' || feeCoin === base ? 0 : feeRaw;
      const feeNote    = feeRaw > 0 ? `Fee: ${feeRaw} ${feeCoin}` : '';

      transactions.push({
        ticker: base,
        name: base,
        isin: '',
        macroCategory: 'Crypto',
        microCategory: 'Crypto',
        date,
        price,
        quantity: qty,
        commission,
        currency: 'USD',
        notes: `Binance | ${pair}${feeNote ? ' | ' + feeNote : ''}`,
        type: isBuy ? 'buy' : 'sell',
      });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseBinanceHistory(rows) {
  const transactions = [];
  const skipped = [];

  const get = (row, ...keys) => {
    const lc = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim().replace(/^﻿/, ''), v]));
    for (const k of keys) {
      const v = lc[k.toLowerCase()];
      if (v !== undefined && v !== '') return v;
    }
    return '';
  };

  rows.forEach((row, i) => {
    try {
      const date = safeDate(get(row, 'UTC_Time', 'Date(UTC)', 'Date', 'Time'));
      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      const op       = String(get(row, 'Operation', 'Type', 'Transaction Type') || '').trim();
      const coin     = String(get(row, 'Coin', 'Asset', 'Currency') || '').trim().toUpperCase();
      const change   = safeFloat(get(row, 'Change', 'Amount', 'Quantity') || 0);

      // Deposits / withdrawals
      if (op.toLowerCase().includes('deposit') || op.toLowerCase().includes('fiat deposit')) {
        const amount = Math.abs(change);
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Deposito importo zero', rawRow: row }); return; }
        transactions.push({ ticker: 'CASH', name: 'Deposito Binance', isin: '', macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: coin === 'EUR' ? 'EUR' : 'USD', notes: `Binance deposito ${coin}`, type: 'buy' });
        return;
      }
      if (op.toLowerCase().includes('withdraw')) {
        const amount = Math.abs(change);
        if (amount <= 0) { skipped.push({ rowIndex: i, reason: 'Prelievo importo zero', rawRow: row }); return; }
        transactions.push({ ticker: 'CASH', name: 'Prelievo Binance', isin: '', macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true, date, price: 1, quantity: amount, commission: 0, currency: coin === 'EUR' ? 'EUR' : 'USD', notes: `Binance prelievo ${coin}`, type: 'sell' });
        return;
      }

      const opLow = op.toLowerCase();

      // ── Skip internal account transfers (earn subscribe/redeem offset each other) ──
      const SKIP_OPS = [
        'simple earn flexible subscription', 'simple earn locked subscription',
        'simple earn flexible redemption',   'simple earn locked redemption',
        'pos savings purchase', 'pos savings redemption',
        'transfer between spot account', 'transfer between main account',
        'transfer between futures', 'transfer between funding',
        'realize profit and loss', 'pnl', 'commission fee shared with you',
        'referral kickback', 'token swap - redenomination',
        'fee', 'transaction fee',
      ];
      if (SKIP_OPS.some(s => opLow.includes(s))) {
        skipped.push({ rowIndex: i, reason: `Operazione interna ignorata: "${op}"`, rawRow: row }); return;
      }

      // ── Stablecoin/fiat leg — skip entirely (both sides of a trade) ──
      const stableCoins = ['USDT', 'BUSD', 'USDC', 'DAI', 'TUSD', 'FDUSD', 'EUR', 'USD', 'GBP', 'TRY', 'BRL', 'TRX'];
      if (stableCoins.includes(coin)) {
        skipped.push({ rowIndex: i, reason: `Fiat/stablecoin ignorato: ${coin}`, rawRow: row }); return;
      }

      // ── Classify as buy/sell based on operation name + change sign ──
      const BUY_OPS = [
        'buy', 'transaction buy', 'large otc trading', 'small assets exchange bnb',
        'binance convert', 'convert',
        'distribution', 'crypto box', 'token swap - distribution',
        'cash voucher distribution', 'mission reward distribution',
        'simple earn flexible interest', 'simple earn locked interest',
        'staking rewards', 'pos savings interest', 'eth 2.0 staking rewards',
        'bnb vault rewards', 'super bnb mining', 'launchpool earn',
        'referral commission', 'commission history',
      ];
      const SELL_OPS = ['sell', 'transaction spend', 'transaction revenue'];

      const looksLikeBuy  = BUY_OPS.some(s => opLow.includes(s)) || change > 0;
      const looksLikeSell = SELL_OPS.some(s => opLow.includes(s)) || change < 0;

      if (!looksLikeBuy && !looksLikeSell) {
        skipped.push({ rowIndex: i, reason: `Operazione ignorata: "${op}"`, rawRow: row }); return;
      }

      if (Math.abs(change) <= 0) { skipped.push({ rowIndex: i, reason: 'Cambio zero', rawRow: row }); return; }

      const qty  = Math.abs(change);
      const type = looksLikeSell && change < 0 ? 'sell' : 'buy';

      // Label staking/rewards so user can distinguish
      const isReward = opLow.includes('interest') || opLow.includes('reward') ||
                       opLow.includes('earn') || opLow.includes('staking') ||
                       opLow.includes('mining') || opLow.includes('distribution');

      transactions.push({
        ticker: coin,
        name: coin,
        isin: '',
        macroCategory: 'Crypto',
        microCategory: isReward ? 'Staking / Rewards' : '',
        date,
        price: 0,
        quantity: qty,
        commission: 0,
        currency: 'USD',
        notes: `Binance | ${op}${isReward ? '' : ' — ⚠️ Prezzo assente, aggiorna manualmente'}`,
        type,
      });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseCryptoCom(rows) {
  const transactions = [];
  const skipped = [];

  // Kinds we handle as buys/sells
  const BUY_KINDS  = ['crypto_purchase', 'crypto_exchange', 'recurring_buy_order', 'dust_conversion_credited'];
  const SELL_KINDS = ['crypto_withdrawal', 'crypto_sell'];
  const CASH_IN    = ['fiat_deposit', 'referral_card_cashback', 'crypto_earn_interest_paid', 'mco_stake_reward'];
  const IGNORE     = ['viban_purchase', 'card_cashback_reverted', 'crypto_earn_program_created'];

  rows.forEach((row, i) => {
    try {
      const date = safeDate(row['Timestamp (UTC)'] || row['Timestamp'] || row['Date']);
      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      const kind        = String(row['Transaction Kind'] || '').trim().toLowerCase();
      const currency    = String(row['Currency'] || '').trim().toUpperCase();
      const amount      = safeFloat(row['Amount'] || 0);
      const nativeCurr  = String(row['Native Currency'] || 'EUR').trim().toUpperCase();
      const nativeAmt   = Math.abs(safeFloat(row['Native Amount'] || 0));
      const description = String(row['Transaction Description'] || '').trim();

      if (IGNORE.includes(kind)) { skipped.push({ rowIndex: i, reason: `Tipo ignorato: "${kind}"`, rawRow: row }); return; }

      // Cash in (rewards, cashback, deposits)
      if (CASH_IN.some(k => kind.includes(k))) {
        if (nativeAmt <= 0) { skipped.push({ rowIndex: i, reason: 'Importo zero', rawRow: row }); return; }
        transactions.push({ ticker: 'CASH', name: description || 'Crypto.com reward', isin: '', macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true, date, price: 1, quantity: nativeAmt, commission: 0, currency: nativeCurr, notes: `Crypto.com | ${kind}`, type: 'buy' });
        return;
      }

      const stableCoins = ['USDT', 'USDC', 'EUR', 'USD', 'GBP', 'CRO'];
      const isBuy  = BUY_KINDS.some(k => kind.includes(k));
      const isSell = SELL_KINDS.some(k => kind.includes(k));
      if (!isBuy && !isSell) { skipped.push({ rowIndex: i, reason: `Tipo sconosciuto: "${kind}"`, rawRow: row }); return; }

      // Skip stablecoin side of exchange
      if (stableCoins.includes(currency) && isBuy) { skipped.push({ rowIndex: i, reason: `Valuta fiat/stablecoin: ${currency}`, rawRow: row }); return; }

      const qty   = Math.abs(amount);
      const price = qty > 0 ? nativeAmt / qty : 0;
      if (qty <= 0) { skipped.push({ rowIndex: i, reason: 'Quantità zero', rawRow: row }); return; }

      transactions.push({
        ticker: currency,
        name: description || currency,
        isin: '',
        macroCategory: 'Crypto',
        microCategory: 'Crypto',
        date,
        price: parseFloat(price.toFixed(6)),
        quantity: qty,
        commission: 0,
        currency: nativeCurr,
        notes: `Crypto.com | ${kind}`,
        type: isBuy ? 'buy' : 'sell',
      });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseIBKR(rawRows, allHeaders) {
  /**
   * IBKR Activity Statement CSV has multiple sections in the same file.
   * Each row starts with a section name (col 0) and "Header"/"Data" (col 1).
   * We look for the "Trades" section.
   *
   * Fallback: if the CSV is already a single-section trade confirm, parse directly.
   */
  const transactions = [];
  const skipped = [];

  // Try to find multi-section IBKR format
  const headerRowIdx = rawRows.findIndex(r =>
    String(Object.values(r)[0] || '').toLowerCase() === 'trades' &&
    String(Object.values(r)[1] || '').toLowerCase() === 'header'
  );

  let tradesHeaders = null;
  let tradeRows = [];

  if (headerRowIdx !== -1) {
    // Multi-section: extract column names from the "Trades Header" row
    tradesHeaders = Object.values(rawRows[headerRowIdx]).slice(2); // skip "Trades","Header"
    tradeRows = rawRows.filter(r =>
      String(Object.values(r)[0] || '').toLowerCase() === 'trades' &&
      String(Object.values(r)[1] || '').toLowerCase() === 'data'
    );
  } else {
    // Single-section: headers already parsed by PapaParse
    tradesHeaders = allHeaders;
    tradeRows = rawRows;
  }

  const hNorm = tradesHeaders.map(h => String(h).toLowerCase().trim());
  const col = (row, name) => {
    const vals = Object.values(row);
    const offset = headerRowIdx !== -1 ? 2 : 0; // skip "Trades","Data" prefix
    const idx = hNorm.indexOf(name);
    return idx !== -1 ? vals[idx + offset] : undefined;
  };

  tradeRows.forEach((row, i) => {
    try {
      // Skip sub-headers and totals
      const assetCat = String(col(row, 'asset category') || col(row, 'asset_category') || '').toLowerCase();
      if (assetCat.includes('total') || assetCat === '') {
        skipped.push({ rowIndex: i, reason: 'Riga totale/vuota ignorata', rawRow: row }); return;
      }

      const symbol   = String(col(row, 'symbol') || '').trim().toUpperCase();
      const dateRaw  = col(row, 'date/time') || col(row, 'date') || '';
      const date     = safeDate(dateRaw);
      const qtyRaw   = safeFloat(col(row, 'quantity') || 0);
      const price    = safeFloat(col(row, 't. price') || col(row, 'price') || 0);
      const commRaw  = Math.abs(safeFloat(col(row, 'comm/fee') || col(row, 'commission') || 0));
      const currency = String(col(row, 'currency') || col(row, 'curr.') || 'USD').trim();

      if (!symbol) { skipped.push({ rowIndex: i, reason: 'Ticker mancante', rawRow: row }); return; }
      if (!date)   { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }
      if (qtyRaw === 0) { skipped.push({ rowIndex: i, reason: 'Quantità zero', rawRow: row }); return; }

      const isBuy = qtyRaw > 0;
      const qty   = Math.abs(qtyRaw);

      const macro = assetCat.includes('stock') ? 'Azioni' :
                    assetCat.includes('etf')   ? 'ETF' :
                    assetCat.includes('bond') || assetCat.includes('obblig') ? 'Obbligazioni' :
                    assetCat.includes('crypto') ? 'Crypto' : 'Azioni';

      transactions.push({
        ticker: symbol,
        name: symbol,
        isin: '',
        macroCategory: macro,
        microCategory: '',
        date,
        price,
        quantity: qty,
        commission: commRaw,
        currency,
        notes: `IBKR | ${assetCat}`,
        type: isBuy ? 'buy' : 'sell',
      });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseRevolut(rows) {
  const transactions = [];
  const skipped = [];

  // Revolut EXCHANGE rows come in pairs: EUR-out + crypto-in.
  // We take only the crypto-in row and derive price from "Fiat amount (inc. fees)".
  // For stocks (if in same CSV), EXCHANGE rows have fiat currencies on both sides → skipped.

  rows.forEach((row, i) => {
    try {
      const type      = String(row['Type'] || '').trim().toUpperCase();
      const state     = String(row['State'] || '').trim().toUpperCase();
      const dateRaw   = row['Started Date'] || row['Completed Date'] || row['Date'] || '';
      const date      = safeDate(dateRaw);
      const currency  = String(row['Currency'] || '').trim().toUpperCase();
      const amount    = safeFloat(row['Amount'] || 0);
      const fiatAmt   = Math.abs(safeFloat(row['Fiat amount (inc. fees)'] || row['Fiat amount'] || 0));
      const fee       = Math.abs(safeFloat(row['Fee'] || 0));
      const baseCurr  = String(row['Base currency'] || 'EUR').trim().toUpperCase();
      const desc      = String(row['Description'] || '').trim();

      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida', rawRow: row }); return; }

      // Skip failed / reverted / pending
      if (state === 'FAILED' || state === 'REVERTED' || state === 'PENDING') {
        skipped.push({ rowIndex: i, reason: `Stato ignorato: ${state}`, rawRow: row }); return;
      }

      // Deposits (TOPUP)
      if (type === 'TOPUP' && amount > 0 && !isCrypto(currency)) {
        transactions.push({
          ticker: 'CASH', name: desc || 'Deposito Revolut', isin: '',
          macroCategory: 'Cash', microCategory: 'Liquidità', isCash: true,
          date, price: 1, quantity: amount, commission: 0, currency,
          notes: 'Revolut | TOPUP', type: 'buy',
        });
        return;
      }

      // Crypto exchange — take only the crypto leg (positive = buy, negative = sell)
      if (type === 'EXCHANGE' && isCrypto(currency)) {
        const absQty = Math.abs(amount);
        if (absQty <= 0) { skipped.push({ rowIndex: i, reason: 'Quantità zero', rawRow: row }); return; }
        const isBuy  = amount > 0;
        const price  = absQty > 0 && fiatAmt > 0 ? fiatAmt / absQty : 0;
        const { micro } = inferMacro('', '', currency);
        transactions.push({
          ticker: currency, name: currency, isin: '',
          macroCategory: 'Crypto', microCategory: micro,
          date, price: parseFloat(price.toFixed(6)), quantity: absQty,
          commission: fee, currency: baseCurr,
          notes: `Revolut | ${desc}`, type: isBuy ? 'buy' : 'sell',
        });
        return;
      }

      // Non-crypto EXCHANGE (currency swap) — skip
      if (type === 'EXCHANGE') {
        skipped.push({ rowIndex: i, reason: `Cambio valuta non-crypto: ${currency}`, rawRow: row }); return;
      }

      // All other types (CARD_PAYMENT, TRANSFER, etc.) — skip
      skipped.push({ rowIndex: i, reason: `Tipo ignorato: ${type}`, rawRow: row });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

function parseGeneric(rows) {
  const transactions = [];
  const skipped = [];

  rows.forEach((row, i) => {
    try {
      const ticker = String(row['ticker'] || row['Ticker'] || row['TICKER'] || '').trim().toUpperCase();
      if (!ticker) { skipped.push({ rowIndex: i, reason: 'Ticker mancante', rawRow: row }); return; }

      const price = safeFloat(row['price'] || row['Price'] || row['PRICE']);
      const qty   = safeFloat(row['quantity'] || row['Quantity'] || row['qty'] || row['QTY']);
      const date  = safeDate(row['date'] || row['Date'] || row['DATE'] || new Date().toISOString().split('T')[0]);

      if (price <= 0 || qty <= 0) { skipped.push({ rowIndex: i, reason: 'Prezzo o quantità zero', rawRow: row }); return; }

      transactions.push({
        ticker,
        name:          row['name'] || row['Name'] || ticker,
        isin:          row['isin'] || row['ISIN'] || '',
        macroCategory: row['macroCategory'] || row['category'] || row['Category'] || 'ETF',
        microCategory: row['microCategory'] || row['subCategory'] || '',
        date,
        price,
        quantity: qty,
        commission: safeFloat(row['commission'] || row['Commission'] || 0),
        currency:  String(row['currency'] || row['Currency'] || 'EUR').trim(),
        notes:     row['notes'] || row['Notes'] || '',
        type:      String(row['type'] || row['Type'] || 'buy').toLowerCase(),
        // Preserve platform from CSV if present (re-import of app's own export)
        platform:  row['platform'] || row['Platform'] || null,
      });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// UNKNOWN FORMAT — try to map intelligently
// ─────────────────────────────────────────────────────────────────────────────

const COLUMN_ALIASES = {
  ticker:    ['ticker', 'symbol', 'titolo', 'strumento', 'coin', 'currency', 'pair'],
  name:      ['name', 'nome', 'product', 'prodotto', 'description', 'descrizione'],
  date:      ['date', 'data', 'time', 'timestamp', 'datetime', 'date/time', 'utc_time'],
  price:     ['price', 'prezzo', 'prezzo unitario', 't. price', 'avg. price', 'executed price'],
  quantity:  ['quantity', 'quantità', 'qty', 'no. of shares', 'executed', 'amount', 'change'],
  type:      ['type', 'tipo', 'side', 'action', 'operation', 'tipo ordine', 'operazione'],
  commission:['commission', 'commissioni', 'fee', 'comm/fee', 'spese', 'charge'],
};

function parseUnknown(rows, headers) {
  const warnings = [
    `⚠️ Formato CSV non riconosciuto. Colonne trovate: [${headers.slice(0, 10).join(' | ')}]. ` +
    `Piattaforme supportate: Trading 212, DeGiro, Fineco, Binance (Spot + History), Crypto.com, Interactive Brokers, Revolut. ` +
    `Tentativo di import generico — verifica che i campi siano corretti.`,
  ];
  const hLow = headers.map(h => h.toLowerCase().trim());

  // Build column mapping
  const map = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const idx = hLow.indexOf(alias);
      if (idx !== -1) { map[field] = headers[idx]; break; }
    }
  }

  if (!map.ticker && !map.name) {
    return { transactions: [], skipped: rows.map((r, i) => ({ rowIndex: i, reason: 'Impossibile trovare colonna ticker/nome', rawRow: r })), warnings };
  }

  const transactions = [];
  const skipped = [];

  rows.forEach((row, i) => {
    try {
      const ticker = map.ticker ? stripExchange(String(row[map.ticker] || '')) : '';
      const name   = map.name   ? String(row[map.name] || '').trim() : ticker;
      if (!ticker && !name) { skipped.push({ rowIndex: i, reason: 'Ticker e nome mancanti', rawRow: row }); return; }

      const price = map.price ? safeFloat(row[map.price]) : 0;
      const qty   = map.quantity ? Math.abs(safeFloat(row[map.quantity])) : 0;
      const date  = map.date ? safeDate(row[map.date]) : null;

      if (!date) { skipped.push({ rowIndex: i, reason: 'Data non valida o mancante', rawRow: row }); return; }

      const typeRaw = map.type ? String(row[map.type] || '').toLowerCase() : '';
      const isBuy   = typeRaw.includes('buy') || typeRaw.includes('acquisto') || typeRaw.includes('market buy') || typeRaw === 'b';
      const isSell  = typeRaw.includes('sell') || typeRaw.includes('vendita') || typeRaw === 's';
      const type    = isBuy ? 'buy' : isSell ? 'sell' : 'buy'; // default buy

      const inferred = inferMacro(name, '', ticker);
      transactions.push({
        ticker:        ticker || name.substring(0, 10).toUpperCase().replace(/\s/g, ''),
        name:          name || ticker,
        isin:          '',
        macroCategory: inferred.macro,
        microCategory: inferred.micro,
        date,
        price,
        quantity: qty,
        commission: map.commission ? safeFloat(row[map.commission]) : 0,
        currency: 'EUR',
        notes: `Import generico — verifica i dati`,
        type,
      });
    } catch (err) {
      skipped.push({ rowIndex: i, reason: `Errore parsing: ${err.message}`, rawRow: row });
    }
  });

  return { transactions, skipped, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a CSV File object.
 * Returns a Promise resolving to:
 * {
 *   platform:      string   ('trading212' | 'degiro' | ... | 'unknown')
 *   platformLabel: string   (human-readable name)
 *   transactions:  Array    (validated, ready to import)
 *   skipped:       Array    ([{ rowIndex, reason, rawRow }])
 *   warnings:      string[] (non-fatal messages)
 * }
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    // Prima passata SENZA header: alcuni broker (Fineco, banche italiane)
    // mettono righe di metadata prima dell'intestazione vera.
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (rawResults) => {
        try {
          // Trova la riga con le intestazioni vere: quella con più colonne "significative"
          // (parole di header comuni). Salta metadata come "Dossier n.: 3729…".
          const HEADER_HINTS = ['ticker','symbol','isin','date','data','time','ora','quantit','qty','shares','price','prezzo','action','operazione','tipo','side','pair','coin','name','nome','descriz','titolo','strumento','pair','operation','segno','divisa','controvalore','commiss','import','amount','total','fee'];
          const scoreHeader = (arr) => (arr || []).reduce((s, c) => {
            const v = String(c || '').toLowerCase().trim();
            if (!v) return s;
            return s + (HEADER_HINTS.some(h => v.includes(h)) ? 1 : 0);
          }, 0);
          let headerRowIdx = 0;
          let bestScore = scoreHeader(rawResults.data[0]);
          for (let i = 1; i < Math.min(20, rawResults.data.length); i++) {
            const sc = scoreHeader(rawResults.data[i]);
            if (sc > bestScore) { bestScore = sc; headerRowIdx = i; }
          }

          const rawHeader = (rawResults.data[headerRowIdx] || []).map(h => String(h || '').trim());
          const dataRows  = rawResults.data.slice(headerRowIdx + 1);
          // Trasforma array in oggetti { header: value }
          const rows = dataRows
            .filter(r => Array.isArray(r) && r.some(c => String(c || '').trim() !== ''))
            .map(r => {
              const obj = {};
              rawHeader.forEach((h, idx) => { if (h) obj[h] = r[idx] !== undefined ? r[idx] : ''; });
              return obj;
            });
          const headers = rawHeader;

          if (rows.length === 0) {
            return resolve({ platform: 'empty', platformLabel: 'Vuoto', transactions: [], skipped: [], warnings: ['Il file è vuoto o non ha righe valide.'] });
          }

          const platform     = detectPlatform(headers);
          const platformLabel = PLATFORMS[platform]?.label || 'Formato sconosciuto';
          const warnings     = [];

          // IBKR special: even if detected, pass raw rows for multi-section parsing
          let result;
          switch (platform) {
            case 'trading212':      result = parseTrading212(rows);                  break;
            case 'degiro':          result = parseDeGiro(rows);                      break;
            case 'fineco':          result = parseFineco(rows);                      break;
            case 'binance_spot':    result = parseBinanceSpot(rows);                 break;
            case 'binance_history': result = parseBinanceHistory(rows);              break;
            case 'cryptocom':       result = parseCryptoCom(rows);                   break;
            case 'ibkr':            result = parseIBKR(rows, headers);               break;
            case 'revolut':         result = parseRevolut(rows);                     break;
            case 'generic':         result = parseGeneric(rows);                     break;
            default:                result = parseUnknown(rows, headers);            break;
          }

          // Add Binance price warning
          if (platform === 'binance_history') {
            warnings.push('⚠️ Il formato Binance Transaction History non include i prezzi. Le transazioni importate avranno prezzo 0 — aggiorna manualmente o usa il formato "Spot Trading History".');
          }
          if (platform === 'unknown') {
            warnings.push(...(result.warnings || []));
          }

          // Validate: remove any row where date is null (safeDate failed and was caught)
          const validTransactions = result.transactions.filter(tx => {
            if (!tx.date) {
              result.skipped.push({ rowIndex: -1, reason: 'Data nulla post-parsing', rawRow: tx });
              return false;
            }
            return true;
          });

          // Inject platform into every transaction (unless already set by generic re-import)
          const withPlatform = validTransactions.map(tx => ({
            ...tx,
            platform: tx.platform || platformLabel,
          }));

          // Build date range label for batch metadata
          const dates = withPlatform.map(t => t.date).filter(Boolean).sort();
          const dateRange = dates.length
            ? (dates[0] === dates[dates.length - 1] ? dates[0] : `${dates[0]} → ${dates[dates.length - 1]}`)
            : '';

          // ── Rileva ticker non riconosciuti (rischio prezzo/categoria mancante) ──
          // Un titolo è "sconosciuto" se né l'ISIN né il ticker sono nel nostro DB.
          const unknownMap = {};
          withPlatform.forEach(tx => {
            if (tx.isCash || tx.macroCategory === 'Cash') return;
            const t = (tx.ticker || '').toUpperCase();
            if (!t || unknownMap[t]) return;
            const isinKnown    = tx.isin && lookupISIN(tx.isin);
            const profileKnown = getCompositionProfile(tx.ticker, tx.macroCategory);
            if (!isinKnown && !profileKnown) {
              unknownMap[t] = { ticker: tx.ticker, name: tx.name || tx.ticker, isin: tx.isin || '', macroCategory: tx.macroCategory || '' };
            }
          });
          const unknownTickers = Object.values(unknownMap);

          resolve({
            platform,
            platformLabel,
            transactions: withPlatform,
            skipped: result.skipped || [],
            warnings,
            dateRange,
            unknownTickers,
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare incoming transactions against existing ones.
 * A duplicate = same ticker + same date + same type + quantity within 1%.
 *
 * Returns:
 *   duplicates:  incoming rows that match an existing transaction
 *   unique:      incoming rows with no match (safe to add)
 */
export function findDuplicates(incoming, existing) {
  const duplicates = [];
  const unique     = [];

  // Index 1: sourceId lookup (platform unique IDs like T212's EOF... or UUID)
  const existingSourceIds = new Set(
    existing.map(tx => tx.sourceId).filter(Boolean)
  );

  // Index 2: fallback — ticker + date + type + qty within 1.5%
  const existingSet = existing.map(tx => ({
    key: `${(tx.ticker || '').toUpperCase()}|${tx.date}|${tx.type}`,
    qty: parseFloat(tx.quantity) || 0,
  }));

  incoming.forEach(tx => {
    // Primary: match on platform unique ID
    if (tx.sourceId && existingSourceIds.has(tx.sourceId)) {
      duplicates.push(tx);
      return;
    }

    // Fallback: match on ticker + date + type + quantity
    const key = `${(tx.ticker || '').toUpperCase()}|${tx.date}|${tx.type}`;
    const qty  = parseFloat(tx.quantity) || 0;
    const match = existingSet.find(e =>
      e.key === key && Math.abs(e.qty - qty) / (qty || 1) < 0.015
    );
    if (match) {
      duplicates.push(tx);
    } else {
      unique.push(tx);
    }
  });

  return { duplicates, unique };
}
