/**
 * PAC (Piano di Accumulo Capitale) Service
 * Manages recurring investment templates and execution
 *
 * VERSION: 2025-12-25-v1
 */

import { addTransaction } from './localStorageService';
import { fetchMultiplePrices } from './priceService';
import { fetchHistoricalPrices, normalizeTicker } from './historicalPriceService';

const STORAGE_KEY = 'investment_tracker_pac_templates';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate unique ID for PAC templates
 */
const generatePACId = () => {
  return `pac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all PAC templates
 * @returns {Array} Array of PAC template objects
 */
export const getPACTemplates = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading PAC templates:', error);
    return [];
  }
};

/**
 * Get PAC template by ID
 * @param {string} id - Template ID
 * @returns {Object|null} PAC template or null
 */
export const getPACTemplateById = (id) => {
  const templates = getPACTemplates();
  return templates.find(t => t.id === id) || null;
};

/**
 * Save a new PAC template
 * @param {Object} template - Template data (without id)
 * @returns {Object} The saved template with generated ID
 */
export const createPACTemplate = (template) => {
  try {
    const templates = getPACTemplates();

    const newTemplate = {
      ...template,
      id: generatePACId(),
      currency: 'EUR',
      isActive: true,
      lastExecutedDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    templates.push(newTemplate);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));

    console.log('✅ PAC template created:', newTemplate.name);
    return newTemplate;
  } catch (error) {
    console.error('Error creating PAC template:', error);
    throw error;
  }
};

/**
 * Update an existing PAC template
 * @param {string} id - Template ID
 * @param {Object} updates - Fields to update
 * @returns {Object} Updated template
 */
export const updatePACTemplate = (id, updates) => {
  try {
    const templates = getPACTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) {
      throw new Error('PAC template not found');
    }

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    console.log('✅ PAC template updated:', templates[index].name);
    return templates[index];
  } catch (error) {
    console.error('Error updating PAC template:', error);
    throw error;
  }
};

/**
 * Delete a PAC template
 * @param {string} id - Template ID
 * @returns {boolean} Success status
 */
export const deletePACTemplate = (id) => {
  try {
    const templates = getPACTemplates();
    const filtered = templates.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('🗑️ PAC template deleted');
    return true;
  } catch (error) {
    console.error('Error deleting PAC template:', error);
    throw error;
  }
};

// ============================================
// PAC EXECUTION
// ============================================

/**
 * Fetch prices for PAC execution
 * Handles both current and historical prices
 *
 * @param {Array} allocations - Array of allocation objects with ticker
 * @param {string} executionDate - Date in YYYY-MM-DD format
 * @returns {Object} Map of ticker -> price data
 */
export const fetchPricesForPAC = async (allocations, executionDate) => {
  const today = getTodayDate();
  const isHistorical = executionDate < today;

  const tickers = allocations.map(a => normalizeTicker(a.ticker));
  const categoriesMap = {};
  allocations.forEach(a => {
    const normalized = normalizeTicker(a.ticker);
    categoriesMap[normalized] = a.macroCategory;
  });

  console.log(`📊 Fetching prices for ${tickers.length} tickers (${isHistorical ? 'historical: ' + executionDate : 'current'})`);

  if (!isHistorical) {
    // Use current prices
    const prices = await fetchMultiplePrices(tickers, categoriesMap, true);
    return prices;
  } else {
    // Use historical prices
    const prices = {};

    for (const allocation of allocations) {
      const ticker = normalizeTicker(allocation.ticker);
      try {
        // Fetch historical data for the month containing the date
        const startOfMonth = executionDate.slice(0, 7) + '-01';
        const historicalData = await fetchHistoricalPrices(ticker, startOfMonth, executionDate);

        if (historicalData && historicalData.length > 0) {
          // Find the closest price to the target date
          const targetDate = new Date(executionDate);
          let closestPrice = historicalData[0];
          let closestDiff = Math.abs(new Date(historicalData[0].date) - targetDate);

          for (const priceData of historicalData) {
            const diff = Math.abs(new Date(priceData.date) - targetDate);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestPrice = priceData;
            }
          }

          prices[ticker] = {
            price: closestPrice.price,
            source: 'historical',
            date: closestPrice.date
          };
          console.log(`✅ ${ticker}: €${closestPrice.price.toFixed(2)} (${closestPrice.date})`);
        } else {
          console.warn(`⚠️ No historical price for ${ticker} on ${executionDate}`);
          prices[ticker] = null;
        }
      } catch (error) {
        console.error(`❌ Error fetching historical price for ${ticker}:`, error);
        prices[ticker] = null;
      }
    }

    return prices;
  }
};

/**
 * Prepare PAC execution preview
 * Calculates quantities and amounts for each allocation
 *
 * @param {Object} template - PAC template
 * @param {string} executionDate - Date in YYYY-MM-DD format
 * @param {number} modifiedTotalAmount - Optional modified total amount
 * @returns {Object} Execution preview with calculated values
 */
export const preparePACExecution = async (template, executionDate, modifiedTotalAmount = null) => {
  const totalAmount = modifiedTotalAmount || template.totalAmount;

  console.log(`🚀 Preparing PAC execution: ${template.name}`);
  console.log(`💰 Total amount: €${totalAmount}`);
  console.log(`📅 Execution date: ${executionDate}`);

  // Fetch prices
  const prices = await fetchPricesForPAC(template.allocations, executionDate);

  // Calculate quantities for each allocation
  const items = template.allocations.map(allocation => {
    const normalizedTicker = normalizeTicker(allocation.ticker);
    const priceData = prices[normalizedTicker] || prices[allocation.ticker];
    const price = priceData?.price || null;

    const allocatedAmount = totalAmount * (allocation.percentage / 100);
    const quantity = price ? allocatedAmount / price : null;

    return {
      ...allocation,
      normalizedTicker,
      originalPercentage: allocation.percentage,
      modifiedPercentage: allocation.percentage,
      allocatedAmount: Math.round(allocatedAmount * 100) / 100,
      price: price, // Don't round price - use full precision
      priceSource: priceData?.source || 'unavailable',
      quantity: quantity, // Full precision - no rounding
      error: price ? null : 'Prezzo non disponibile'
    };
  });

  // Check for errors
  const errors = items.filter(i => i.error).map(i => `${i.ticker}: ${i.error}`);
  const hasErrors = errors.length > 0;

  // Calculate totals
  const totalAllocated = items.reduce((sum, i) => sum + (i.allocatedAmount || 0), 0);
  const totalPercentage = items.reduce((sum, i) => sum + i.modifiedPercentage, 0);

  return {
    pacTemplateId: template.id,
    pacTemplateName: template.name,
    executionDate,
    totalAmount,
    pricesType: executionDate < getTodayDate() ? 'historical' : 'current',
    items,
    totalAllocated: Math.round(totalAllocated * 100) / 100,
    totalPercentage,
    status: hasErrors ? 'warning' : 'ready',
    errors,
    canExecute: items.some(i => i.price !== null) // Can execute if at least one price is available
  };
};

/**
 * Execute PAC - create transactions from preview
 *
 * @param {Object} executionPreview - Preview from preparePACExecution
 * @returns {Object} Result with created transactions
 */
export const executePAC = async (executionPreview) => {
  const { pacTemplateId, pacTemplateName, executionDate, items } = executionPreview;

  console.log(`✅ Executing PAC: ${pacTemplateName}`);

  const createdTransactions = [];
  const errors = [];

  for (const item of items) {
    // Skip items without price
    if (!item.price || !item.quantity) {
      errors.push(`${item.ticker}: Skipped - no price available`);
      continue;
    }

    try {
      const transaction = {
        date: executionDate,
        type: 'buy',
        ticker: item.ticker,
        name: item.name || item.ticker,
        isin: item.isin || '',
        macroCategory: item.macroCategory,
        microCategory: item.microCategory || '',
        price: item.price,
        quantity: item.quantity,
        commission: 0,
        currency: 'EUR',
        notes: `PAC: ${pacTemplateName}`,
        pacTemplateId: pacTemplateId
      };

      const saved = addTransaction(transaction);
      createdTransactions.push(saved);
      console.log(`✅ Transaction created: ${item.ticker} x ${item.quantity.toFixed(5)} @ €${item.price.toFixed(2)}`);
    } catch (error) {
      console.error(`❌ Error creating transaction for ${item.ticker}:`, error);
      errors.push(`${item.ticker}: ${error.message}`);
    }
  }

  // Update template's lastExecutedDate
  try {
    updatePACTemplate(pacTemplateId, {
      lastExecutedDate: executionDate
    });
  } catch (error) {
    console.warn('Could not update lastExecutedDate:', error);
  }

  return {
    success: createdTransactions.length > 0,
    transactionsCreated: createdTransactions.length,
    transactions: createdTransactions,
    errors,
    totalInvested: createdTransactions.reduce((sum, t) => sum + (t.price * t.quantity), 0)
  };
};

// ============================================
// REMINDER LOGIC
// ============================================

/**
 * Check if any PAC needs execution this month
 * @returns {Object} Reminder status
 */
export const checkPACReminders = () => {
  const templates = getPACTemplates();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  const pendingPACs = templates.filter(template => {
    if (!template.isActive) return false;

    // Check if already executed this month
    if (template.lastExecutedDate) {
      const lastExec = new Date(template.lastExecutedDate);
      if (lastExec.getMonth() === currentMonth && lastExec.getFullYear() === currentYear) {
        return false; // Already executed this month
      }
    }

    // Check if reminder day has passed (or no reminder day set = always show)
    if (template.reminderDay && currentDay < template.reminderDay) {
      return false; // Not yet reminder day
    }

    return true;
  });

  return {
    hasPending: pendingPACs.length > 0,
    count: pendingPACs.length,
    templates: pendingPACs
  };
};

/**
 * Get PACs that are pending auto-execution (need user confirmation)
 * Called on app load to check for PACs that should be executed
 *
 * @returns {Array} Array of pending PAC templates
 */
export const getPendingAutoExecutePACs = () => {
  const templates = getPACTemplates();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();
  const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  console.log('🔄 Checking for pending auto-execute PACs...');

  const pendingPACs = [];

  for (const template of templates) {
    // Skip if not active or autoExecute is disabled
    if (!template.isActive || !template.autoExecute) {
      continue;
    }

    // Skip if no execution day set
    if (!template.executionDay) {
      continue;
    }

    // Skip if current day is before execution day
    if (currentDay < template.executionDay) {
      console.log(`⏳ ${template.name}: waiting for day ${template.executionDay} (today is ${currentDay})`);
      continue;
    }

    // Skip if startMonth is set and we haven't reached it yet
    if (template.startMonth && template.startMonth > currentYearMonth) {
      console.log(`⏳ ${template.name}: starts from ${template.startMonth} (now is ${currentYearMonth})`);
      continue;
    }

    // Skip if already executed this month
    if (template.lastExecutedDate) {
      const lastExec = new Date(template.lastExecutedDate);
      if (lastExec.getMonth() === currentMonth && lastExec.getFullYear() === currentYear) {
        console.log(`✓ ${template.name}: already executed this month`);
        continue;
      }
    }

    // This PAC needs to be executed!
    console.log(`📋 ${template.name}: pending execution`);
    pendingPACs.push(template);
  }

  console.log(`🏁 Found ${pendingPACs.length} PACs pending execution`);
  return pendingPACs;
};

/**
 * Check and auto-execute PACs that are due (legacy - kept for compatibility)
 * Now just returns pending PACs info without executing
 *
 * @returns {Promise<Object>} Results with pending PACs
 */
export const checkAndAutoExecutePACs = async () => {
  const pendingPACs = getPendingAutoExecutePACs();

  return {
    checked: getPACTemplates().length,
    pending: pendingPACs.length,
    pendingPACs: pendingPACs,
    executed: 0,
    executedPACs: []
  };
};

// ============================================
// EXPORTS
// ============================================

export default {
  // CRUD
  getPACTemplates,
  getPACTemplateById,
  createPACTemplate,
  updatePACTemplate,
  deletePACTemplate,

  // Execution
  fetchPricesForPAC,
  preparePACExecution,
  executePAC,
  getPendingAutoExecutePACs,
  checkAndAutoExecutePACs,

  // Utilities
  getTodayDate,
  checkPACReminders
};
