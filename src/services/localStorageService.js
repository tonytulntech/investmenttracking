/**
 * LocalStorage Service
 * Manages all data persistence using browser's LocalStorage
 */

import { calculateCashFlow } from './cashFlowService';

const STORAGE_KEYS = {
  TRANSACTIONS: 'investment_tracker_transactions',
  SETTINGS: 'investment_tracker_settings',
  LAST_SYNC: 'investment_tracker_last_sync'
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
 * Get all transactions
 * @returns {Array} Array of transaction objects
 */
export const getTransactions = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const transactions = data ? JSON.parse(data) : [];

    // Automatically fix Cash transactions on load
    return fixCashTransactions(transactions);
  } catch (error) {
    console.error('Error loading transactions:', error);
    return [];
  }
};

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

/**
 * Bulk import transactions (from CSV)
 * @param {Array} transactionsArray - Array of transaction objects
 * @returns {number} Number of transactions imported
 */
export const bulkImportTransactions = (transactionsArray) => {
  try {
    const existingTransactions = getTransactions();

    const newTransactions = transactionsArray.map(t => ({
      ...t,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const allTransactions = [...existingTransactions, ...newTransactions];
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTransactions));

    return newTransactions.length;
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
  numberFormat: 'de-DE', // European format
  googleAppsScriptUrl: 'https://script.google.com/macros/s/AKfycbzMWW-Z2WtpmO7Fkwbvm_p0FCmy4UYlIpWmNnp9LMEjM6ZXePjIaDPIGM3G17LZzjpGiw/exec' // URL for historical prices API
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
  const transactions = getTransactions();
  const holdings = {};

  transactions.forEach(tx => {
    const { ticker, type, quantity, price, date } = tx;
    const isCash = tx.isCash || (tx.macroCategory === 'Cash');

    // Skip cash transactions - they will be calculated separately via cash flow
    if (isCash) {
      return;
    }

    if (!holdings[ticker]) {
      holdings[ticker] = {
        ticker,
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
        transactions: [],
        lastTransactionDate: date,
        isCash: false
      };
    }

    // Update categories from most recent transaction
    if (new Date(date) >= new Date(holdings[ticker].lastTransactionDate)) {
      holdings[ticker].macroCategory = tx.macroCategory || tx.category || holdings[ticker].macroCategory;
      holdings[ticker].category = tx.macroCategory || tx.category || holdings[ticker].category;
      holdings[ticker].microCategory = tx.microCategory || tx.subCategory || holdings[ticker].microCategory;
      holdings[ticker].subCategory = tx.microCategory || tx.subCategory || holdings[ticker].subCategory;
      holdings[ticker].lastTransactionDate = date;
    }

    if (type === 'buy') {
      holdings[ticker].quantity += quantity;
      holdings[ticker].totalCost += quantity * price;
    } else if (type === 'sell') {
      holdings[ticker].quantity -= quantity;
      holdings[ticker].totalCost -= quantity * price;
    }

    holdings[ticker].transactions.push({
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
  updateAllSubCategories
};
