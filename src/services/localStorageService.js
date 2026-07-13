/**
 * LocalStorage Service
 * Manages all data persistence using browser's LocalStorage
 */

import { calculateCashFlow } from './cashFlowService';
import { lookupISIN } from './isinMapping';

const STORAGE_KEYS = {
  TRANSACTIONS: 'investment_tracker_transactions',
  SETTINGS: 'investment_tracker_settings',
  LAST_SYNC: 'investment_tracker_last_sync',
  IMPORT_BATCHES: 'investment_tracker_import_batches',
};

// ============================================
// TRANSACTIONS
// ============================================

/**
 * Fix Cash transactions to ensure correct structure
 * This ensures all Cash transactions have proper fields set
 */
const fixCashTransactions = (transactions) => {
  let fixed = false;

  const fixedTransactions = transactions.map(tx => {
    // Identify Cash transactions by multiple criteria
    const isCashTransaction =
      tx.ticker === 'CASH' ||
      tx.macroCategory === 'Cash' ||
      tx.category === 'Cash' ||
      tx.isCash === true;

    if (isCashTransaction) {
      // Ensure Cash transaction has correct structure
      const needsFix =
        tx.macroCategory !== 'Cash' ||
        tx.isCash !== true ||
        tx.price !== 1 ||
        tx.commission !== 0 ||
        !tx.microCategory;

      if (needsFix) {
        console.log(`🔧 Fixing Cash transaction: ${tx.ticker} (${tx.date})`);
        fixed = true;

        return {
          ...tx,
          ticker: 'CASH',
          name: 'Cash', // Standard name
          macroCategory: 'Cash',
          microCategory: 'Liquidità', // Use "Liquidità" as requested
          category: 'Cash', // Keep for backwards compatibility
          isCash: true,
          price: 1, // Cash price is always 1
          commission: 0, // Cash has no commission
          isin: '', // Cash has no ISIN
          updatedAt: new Date().toISOString()
        };
      }
    }

    return tx;
  });

  if (fixed) {
    console.log('✅ Cash transactions have been fixed and saved');
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(fixedTransactions));
  }

  return fixedTransactions;
};

/**
 * Migrate old English category names to Italian
 * 'Stock' → 'Azioni'  (the only English category that slipped through)
 */
const migrateCategories = (transactions) => {
  let changed = false;
  const migrated = transactions.map(tx => {
    if (tx.macroCategory === 'Stock' || tx.category === 'Stock') {
      changed = true;
      return {
        ...tx,
        macroCategory: 'Azioni',
        category: 'Azioni',
        updatedAt: new Date().toISOString()
      };
    }
    return tx;
  });
  if (changed) {
    console.log('🔧 Migrated legacy "Stock" → "Azioni" in transactions');
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(migrated));
  }
  return migrated;
};

/**
 * Get all transactions
 * @returns {Array} Array of transaction objects
 */
export const getTransactions = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const transactions = data ? JSON.parse(data) : [];

    // Normalize categories, ticker (via ISIN) e fix Cash transactions on load
    return fixCashTransactions(normalizeTickers(migrateCategories(transactions)));
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
};

/**
 * Normalizza il ticker via ISIN (chiave universale).
 * I broker usano codici propri (T212: MSF, RY6, 3V64…) ma l'ISIN è sempre lo
 * stesso. Se l'ISIN è nel database, il ticker viene convertito nel formato
 * canonico (MSFT, O, V…) così classificazione/prezzi/dividendi lo riconoscono.
 * Il codice originale del broker resta salvato in `brokerTicker`.
 */
function normalizeTickers(transactions) {
  return transactions.map(tx => {
    if (tx.isCash || tx.macroCategory === 'Cash' || !tx.isin) return tx;
    const mapped = lookupISIN(tx.isin);
    if (!mapped || !mapped.ticker) return tx;
    const canonical = mapped.ticker.toUpperCase();
    if (canonical === (tx.ticker || '').toUpperCase()) return tx;
    return {
      ...tx,
      brokerTicker: tx.brokerTicker || tx.ticker, // preserva il codice broker originale
      ticker: canonical,
    };
  });
}

/**
 * Migrazione persistente: riscrive i ticker canonici in localStorage.
 * Da chiamare una volta all'avvio. Idempotente.
 * @returns {number} numero di transazioni corrette
 */
export function migrateTickersPersistent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return 0;
    const txs = JSON.parse(raw);
    let changed = 0;
    const fixed = txs.map(tx => {
      if (tx.isCash || tx.macroCategory === 'Cash' || !tx.isin) return tx;
      const mapped = lookupISIN(tx.isin);
      if (!mapped || !mapped.ticker) return tx;
      const canonical = mapped.ticker.toUpperCase();
      if (canonical === (tx.ticker || '').toUpperCase()) return tx;
      changed++;
      return { ...tx, brokerTicker: tx.brokerTicker || tx.ticker, ticker: canonical };
    });
    if (changed > 0) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(fixed));
    return changed;
  } catch {
    return 0;
  }
}

/**
 * Add a new transaction
 * @param {Object} transaction - Transaction data
 * @returns {Object} The added transaction with generated ID
 */
export const addTransaction = (transaction) => {
  try {
    const transactions = getTransactions();
    const newTransaction = {
      ...transaction,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    transactions.push(newTransaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return newTransaction;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
};

/**
 * Update an existing transaction
 * @param {string} id - Transaction ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated transaction
 */
export const updateTransaction = (id, updates) => {
  try {
    const transactions = getTransactions();
    const index = transactions.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error('Transaction not found');
    }

    transactions[index] = {
      ...transactions[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return transactions[index];
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

/**
 * Delete a transaction
 * @param {string} id - Transaction ID
 * @returns {boolean} Success status
 */
export const deleteTransaction = (id) => {
  try {
    const transactions = getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

/**
 * Get transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Object|null} Transaction object or null
 */
export const getTransactionById = (id) => {
  const transactions = getTransactions();
  return transactions.find(t => t.id === id) || null;
};

// ============================================
// BULK OPERATIONS
// ============================================

// ─── Import batch helpers ────────────────────────────────────────────────────

function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export const getImportBatches = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveBatchMeta = (meta) => {
  const batches = getImportBatches();
  batches.unshift(meta); // newest first
  localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(batches));
};

export const deleteImportBatch = (batchId) => {
  try {
    // Remove transactions
    const all = getTransactions();
    const kept = all.filter(t => t.importBatchId !== batchId);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(kept));
    // Remove batch metadata
    const batches = getImportBatches().filter(b => b.id !== batchId);
    localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(batches));
    return all.length - kept.length;
  } catch (error) {
    console.error('Error deleting import batch:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bulk import transactions (from CSV)
 * @param {Array} transactionsArray - Array of transaction objects
 * @param {Object} batchMeta - { platformLabel, filename } optional metadata
 * @returns {{ count: number, batchId: string }}
 */
export const bulkImportTransactions = (transactionsArray, batchMeta = {}) => {
  try {
    const batchId = generateBatchId();
    const existingTransactions = getTransactions();

    const newTransactions = transactionsArray.map(t => ({
      ...t,
      id: generateId(),
      importBatchId: batchId,
      broker: batchMeta.platformLabel || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const allTransactions = [...existingTransactions, ...newTransactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));

    // Save batch metadata
    saveBatchMeta({
      id: batchId,
      importedAt: new Date().toISOString(),
      count: newTransactions.length,
      platformLabel: batchMeta.platformLabel || 'Sconosciuto',
      filename: batchMeta.filename || '',
      dateRange: batchMeta.dateRange || '',
    });

    return { count: newTransactions.length, batchId };
  } catch (error) {
    console.error('Error bulk importing transactions:', error);
    throw error;
  }
};

/**
 * Export all transactions
 * @returns {Array} All transactions
 */
export const exportTransactions = () => {
  return getTransactions();
};

/**
 * Clear all transactions (with confirmation)
 * @returns {boolean} Success status
 */
export const clearAllTransactions = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    return true;
  } catch (error) {
    console.error('Error clearing transactions:', error);
    throw error;
  }
};

// ============================================
// SETTINGS
// ============================================

/**
 * Get user settings
 * @returns {Object} Settings object
 */
export const getSettings = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : getDefaultSettings();
  } catch (error) {
    console.error('Error loading settings:', error);
    return getDefaultSettings();
  }
};

/**
 * Update user settings
 * @param {Object} settings - Settings to update
 * @returns {Object} Updated settings
 */
export const updateSettings = (settings) => {
  try {
    const currentSettings = getSettings();
    const newSettings = { ...currentSettings, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    return newSettings;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

/**
 * Get default settings
 * @returns {Object} Default settings
 */
const getDefaultSettings = () => ({
  currency: 'EUR',
  theme: 'light',
  autoRefreshPrices: true,
  refreshInterval: 60000, // 1 minute
  dateFormat: 'dd/MM/yyyy',
  numberFormat: 'de-DE' // European format
});

// ============================================
// UTILITIES
// ============================================

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get storage usage info
 * @returns {Object} Storage info
 */
export const getStorageInfo = () => {
  const transactions = getTransactions();
  const settings = getSettings();

  return {
    transactionsCount: transactions.length,
    storageSize: new Blob([JSON.stringify({ transactions, settings })]).size,
    lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC)
  };
};

/**
 * Update last sync timestamp
 */
export const updateLastSync = () => {
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
};

// ============================================
// PORTFOLIO CALCULATIONS (from transactions)
// ============================================

/**
 * Calculate current portfolio from transactions
 * @returns {Array} Portfolio holdings
 */
export const calculatePortfolio = () => {
  const transactions = getTransactions().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const holdings = {};
  let totalRealizedPL = 0; // P/L da posizioni chiuse o vendite parziali

  transactions.forEach(tx => {
    const { ticker, type, quantity, price, date } = tx;
    const isCash = tx.isCash || (tx.macroCategory === 'Cash');

    // Skip cash transactions - they will be calculated separately via cash flow
    if (isCash) {
      return;
    }

    // Group by ticker + broker so the same ETF bought on different platforms stays separate
    const broker = tx.broker || '';
    const holdingKey = broker ? `${ticker}::${broker}` : ticker;

    if (!holdings[holdingKey]) {
      holdings[holdingKey] = {
        ticker,
        holdingKey,
        broker,
        name: tx.name || ticker,
        isin: tx.isin || '',
        category: tx.macroCategory || tx.category || 'Other',
        macroCategory: tx.macroCategory || tx.category || 'Other',
        microCategory: tx.microCategory || tx.subCategory || null,
        subCategory: tx.microCategory || tx.subCategory || null,
        currency: tx.currency || 'EUR',
        quantity: 0,
        totalCost: 0,
        avgPrice: 0,
        realizedPL: 0,
        transactions: [],
        lastTransactionDate: date,
        isCash: false
      };
    }

    // Update categories from most recent transaction
    if (new Date(date) >= new Date(holdings[holdingKey].lastTransactionDate)) {
      holdings[holdingKey].macroCategory = tx.macroCategory || tx.category || holdings[holdingKey].macroCategory;
      holdings[holdingKey].category = tx.macroCategory || tx.category || holdings[holdingKey].category;
      holdings[holdingKey].microCategory = tx.microCategory || tx.subCategory || holdings[holdingKey].microCategory;
      holdings[holdingKey].subCategory = tx.microCategory || tx.subCategory || holdings[holdingKey].subCategory;
      holdings[holdingKey].lastTransactionDate = date;
    }

    if (type === 'buy') {
      holdings[holdingKey].quantity += quantity;
      holdings[holdingKey].totalCost += quantity * price;
    } else if (type === 'sell') {
      const avgCostBefore = holdings[holdingKey].quantity > 0
        ? holdings[holdingKey].totalCost / holdings[holdingKey].quantity
        : price;
      // P/L realizzato = (prezzo vendita - costo medio acquisto) × quantità
      const realized = (price - avgCostBefore) * quantity;
      holdings[holdingKey].realizedPL = (holdings[holdingKey].realizedPL || 0) + realized;
      totalRealizedPL += realized;
      holdings[holdingKey].quantity -= quantity;
      holdings[holdingKey].totalCost -= quantity * avgCostBefore;
    }

    holdings[holdingKey].transactions.push({
      date,
      type,
      quantity,
      price
    });
  });

  // Calculate average price and filter out zero positions
  const portfolio = Object.values(holdings)
    .filter(h => h.quantity > 0)
    .map(h => ({
      ...h,
      avgPrice: h.totalCost / h.quantity
    }));

  // Esponi il P/L realizzato totale tramite una proprietà sulla funzione
  calculatePortfolio._lastRealizedPL = totalRealizedPL;

  // Add cash as a single virtual holding using cash flow
  try {
    const cashFlow = calculateCashFlow();

    // Always add cash if there were any cash movements (deposits/withdrawals/purchases/sales)
    // This includes negative cash (overspent) and zero cash
    if (cashFlow.cashDeposits > 0 || cashFlow.assetPurchases > 0 || cashFlow.assetSales > 0 || cashFlow.cashWithdrawals > 0) {
      const cashHolding = {
        ticker: 'CASH',
        name: 'Cash', // Standard name as requested
        isin: '',
        category: 'Cash',
        macroCategory: 'Cash',
        microCategory: 'Liquidità', // Changed to "Liquidità" as requested
        subCategory: 'Liquidità',
        currency: 'EUR',
        quantity: Math.abs(cashFlow.availableCash), // Use absolute value for quantity
        totalCost: cashFlow.availableCash, // Keep actual value (can be negative)
        avgPrice: 1,
        transactions: [],
        lastTransactionDate: new Date().toISOString(),
        isCash: true,
        isNegativeCash: cashFlow.availableCash < 0
      };

      console.log(`💰 Cash holding created: €${cashFlow.availableCash.toFixed(2)} (Deposits: €${cashFlow.cashDeposits}, Purchases: €${cashFlow.assetPurchases})`);
      portfolio.push(cashHolding);
    } else {
      console.log('ℹ️ No cash movements detected - cash holding not created');
    }
  } catch (error) {
    console.error('Error calculating cash flow:', error);
  }

  return portfolio;
};

/**
 * Update all existing transactions with detected sub-categories
 * @returns {Object} Results with updated count and errors
 */
export const updateAllSubCategories = async () => {
  try {
    const { detectSubCategory } = await import('./categoryDetectionService');
    const transactions = getTransactions();
    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log(`🔄 Starting sub-category update for ${transactions.length} transactions...`);

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      try {
        // Skip if already has subCategory
        if (tx.subCategory) {
          console.log(`⏭️  Transaction ${i + 1}/${transactions.length}: ${tx.ticker} already has subCategory: ${tx.subCategory}`);
          continue;
        }

        // Detect sub-category
        const detectedSubCategory = await detectSubCategory(tx.ticker, tx.category);

        if (detectedSubCategory) {
          tx.subCategory = detectedSubCategory;
          tx.updatedAt = new Date().toISOString();
          updatedCount++;
          console.log(`✅ Transaction ${i + 1}/${transactions.length}: ${tx.ticker} → ${detectedSubCategory}`);
        } else {
          console.log(`⚠️  Transaction ${i + 1}/${transactions.length}: ${tx.ticker} - no sub-category detected`);
        }
      } catch (error) {
        errorCount++;
        errors.push({ ticker: tx.ticker, error: error.message });
        console.error(`❌ Error processing transaction ${tx.ticker}:`, error);
      }
    }

    // Save updated transactions
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    updateLastSync();

    console.log(`✅ Sub-category update complete: ${updatedCount} updated, ${errorCount} errors`);

    return {
      success: true,
      total: transactions.length,
      updated: updatedCount,
      skipped: transactions.length - updatedCount - errorCount,
      errors: errorCount,
      errorDetails: errors
    };
  } catch (error) {
    console.error('Error updating sub-categories:', error);
    throw error;
  }
};

/**
 * Calcola il P&L realizzato da tutte le vendite effettuate.
 * Usa il metodo del costo medio ponderato (FIFO-avg).
 *
 * @returns {{ total: number, ytdTotal: number, positions: Array, operations: Array }}
 */
export function calculateRealizedPL() {
  const currentYear = new Date().getFullYear();

  const transactions = getTransactions()
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const holdings = {};          // costo medio corrente per ticker
  const realizedMap = {};       // P&L realizzato accumulato per ticker
  const operations = [];        // singole operazioni di vendita con P&L individuale

  transactions.forEach(tx => {
    const { ticker, type, quantity, price, date } = tx;
    const isCash = tx.isCash || tx.macroCategory === 'Cash';
    if (isCash) return;

    if (!holdings[ticker]) {
      holdings[ticker] = { quantity: 0, totalCost: 0 };
    }
    if (!realizedMap[ticker]) {
      realizedMap[ticker] = {
        ticker,
        name: tx.name || ticker,
        macroCategory: tx.macroCategory || 'Other',
        costBasis: 0,
        proceeds: 0,
        realizedPL: 0,
        sellCount: 0,
        lastSellDate: null,
      };
    }

    realizedMap[ticker].name = tx.name || realizedMap[ticker].name;
    realizedMap[ticker].macroCategory = tx.macroCategory || realizedMap[ticker].macroCategory;

    if (type === 'buy') {
      holdings[ticker].quantity += quantity;
      holdings[ticker].totalCost += quantity * price;
    } else if (type === 'sell') {
      const avgCost = holdings[ticker].quantity > 0
        ? holdings[ticker].totalCost / holdings[ticker].quantity
        : price;

      const sellProceeds  = quantity * price;
      const sellCostBasis = quantity * avgCost;
      const realized      = sellProceeds - sellCostBasis;

      realizedMap[ticker].costBasis  += sellCostBasis;
      realizedMap[ticker].proceeds   += sellProceeds;
      realizedMap[ticker].realizedPL += realized;
      realizedMap[ticker].sellCount  += 1;
      realizedMap[ticker].lastSellDate = date;

      // Registra operazione individuale
      operations.push({
        id: tx.id,
        ticker,
        name: tx.name || ticker,
        date,
        quantity,
        sellPrice: price,
        avgCostAtSale: avgCost,
        proceeds: sellProceeds,
        costBasis: sellCostBasis,
        realizedPL: realized,
        pctReturn: sellCostBasis > 0 ? (realized / sellCostBasis) * 100 : 0,
        commission: tx.commission || 0,
      });

      holdings[ticker].quantity  -= quantity;
      holdings[ticker].totalCost -= sellCostBasis;
    }
  });

  // Ordina operazioni dalla più recente
  operations.sort((a, b) => new Date(b.date) - new Date(a.date));

  const positions = Object.values(realizedMap)
    .filter(p => p.sellCount > 0)
    .map(p => ({
      ...p,
      isClosed: (holdings[p.ticker]?.quantity ?? 0) <= 0.0001,
      pctReturn: p.costBasis > 0 ? (p.realizedPL / p.costBasis) * 100 : 0,
    }))
    .sort((a, b) => Math.abs(b.realizedPL) - Math.abs(a.realizedPL));

  const total = positions.reduce((sum, p) => sum + p.realizedPL, 0);
  const ytdTotal = operations
    .filter(op => new Date(op.date).getFullYear() === currentYear)
    .reduce((sum, op) => sum + op.realizedPL, 0);

  return { total, ytdTotal, positions, operations };
}

/**
 * portfolioSnapshot — unica fonte di verità per tutte le pagine.
 *
 * Regole uniformi:
 *   • Commissioni incluse nel costo di acquisto
 *   • Commissioni di vendita dedotte dai proventi
 *   • Transazioni con excludeFromStats=true escluse
 *   • P/L realizzato calcolato con costo medio ponderato
 *
 * @param {Object} priceMap  { [ticker]: { price, change, changePercent } }
 *                           Passare getCachedPrices() o il risultato di fetchMultiplePrices()
 * @returns {Object}  { holdings, totalInvested, totalValue, unrealizedPL, realizedPL, totalPL, returnPct }
 */
export function portfolioSnapshot(priceMap = {}) {
  const transactions = getTransactions()
    .filter(tx => !tx.excludeFromStats)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const holdings = {};
  let realizedPL = 0;

  transactions.forEach(tx => {
    const isCash = tx.isCash || tx.macroCategory === 'Cash';
    if (isCash) return;

    const { ticker, type, quantity, price } = tx;
    const commission = tx.commission || 0;
    const broker     = tx.broker || '';
    const holdingKey = broker ? `${ticker}::${broker}` : ticker;

    if (!holdings[holdingKey]) {
      holdings[holdingKey] = {
        ticker, holdingKey, broker,
        name: tx.name || ticker,
        macroCategory: tx.macroCategory || tx.category || 'Other',
        microCategory: tx.microCategory || tx.subCategory || null,
        currency: tx.currency || 'EUR',
        quantity: 0, totalCost: 0, realizedPL: 0,
      };
    }

    const h = holdings[holdingKey];
    // aggiorna nome e categoria dalla transazione più recente
    h.name          = tx.name || h.name;
    h.macroCategory = tx.macroCategory || tx.category || h.macroCategory;
    h.microCategory = tx.microCategory || tx.subCategory || h.microCategory;

    if (type === 'buy') {
      h.quantity  += quantity;
      h.totalCost += quantity * price + commission;      // commissioni nel costo
    } else if (type === 'sell') {
      const avgCost      = h.quantity > 0 ? h.totalCost / h.quantity : price;
      const costBasis    = quantity * avgCost;
      const netProceeds  = quantity * price - commission; // commissioni dedotte
      const realized     = netProceeds - costBasis;
      h.realizedPL      += realized;
      realizedPL        += realized;
      h.quantity        -= quantity;
      h.totalCost       -= costBasis;
    }
  });

  let totalInvested   = 0;
  let totalValue      = 0;
  let totalUnrealized = 0;
  const unpriced      = []; // titoli senza prezzo live (fallback a costo di carico)

  const enriched = Object.values(holdings)
    .filter(h => h.quantity > 0.000001)
    .map(h => {
      const priceData      = priceMap[h.ticker];
      const hasLivePrice   = priceData?.price > 0;
      const currentPrice   = hasLivePrice ? priceData.price : (h.totalCost / h.quantity);
      const marketValue    = currentPrice * h.quantity;
      const unrealized     = marketValue - h.totalCost;

      if (!hasLivePrice) {
        unpriced.push({ ticker: h.ticker, name: h.name, isin: h.isin || '', macroCategory: h.macroCategory, value: marketValue });
      }

      totalInvested   += h.totalCost;
      totalValue      += marketValue;
      totalUnrealized += unrealized;

      return {
        ...h,
        currentPrice,
        avgPrice: h.totalCost / h.quantity,
        marketValue,
        unrealizedPL: unrealized,
        roi: h.totalCost > 0 ? (unrealized / h.totalCost) * 100 : 0,
        dayChange:        (priceData?.change        || 0) * h.quantity,
        dayChangePercent:  priceData?.changePercent || 0,
        priceUnavailable: !hasLivePrice, // flag: stat potenzialmente alterata
      };
    });

  const totalPL   = totalUnrealized + realizedPL;
  const returnPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return {
    holdings:     enriched,
    totalInvested,
    totalValue,
    unrealizedPL: totalUnrealized,
    realizedPL,
    totalPL,
    returnPct,
    unpriced,          // array titoli senza prezzo live
    hasUnpriced: unpriced.length > 0,
  };
}

export default {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
  bulkImportTransactions,
  exportTransactions,
  clearAllTransactions,
  getSettings,
  updateSettings,
  getStorageInfo,
  updateLastSync,
  calculatePortfolio,
  updateAllSubCategories,
  calculateRealizedPL,
};
