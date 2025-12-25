/**
 * Cash Flow Service
 *
 * Tracks cash movements and calculates available liquidity.
 * Cash flow considers:
 * - Cash deposits (+)
 * - Cash withdrawals (-)
 * - Asset purchases (-)
 * - Asset sales (+)
 */

import { getTransactions } from './localStorageService';

/**
 * Calculate cash flow from all transactions
 * @returns {Object} Cash flow breakdown
 */
export function calculateCashFlow() {
  const transactions = getTransactions();

  let cashDeposits = 0;      // Cash transactions (buy = deposit)
  let cashWithdrawals = 0;   // Cash transactions (sell = withdrawal)
  let assetPurchases = 0;    // Non-cash buys (subtract from available cash)
  let assetSales = 0;        // Non-cash sells (add to available cash)

  const cashAccounts = {};   // Track individual cash accounts
  const movements = [];      // Detailed movement history

  // Count cash transactions for debugging
  const cashTransactions = transactions.filter(tx => tx.isCash || tx.macroCategory === 'Cash');
  if (cashTransactions.length > 0) {
    console.log(`💵 Found ${cashTransactions.length} Cash transactions out of ${transactions.length} total`);
  }

  transactions.forEach(tx => {
    const isCash = tx.isCash || tx.macroCategory === 'Cash';
    const amount = tx.quantity * tx.price;
    const commission = tx.commission || 0;
    const totalCost = amount + commission;

    if (isCash) {
      // Cash transaction (deposit/withdrawal)
      if (tx.type === 'buy') {
        // Deposit
        cashDeposits += amount;

        // Track by account
        if (!cashAccounts[tx.ticker]) {
          cashAccounts[tx.ticker] = {
            name: tx.ticker,
            deposits: 0,
            withdrawals: 0,
            balance: 0
          };
        }
        cashAccounts[tx.ticker].deposits += amount;
        cashAccounts[tx.ticker].balance += amount;

        movements.push({
          date: tx.date,
          type: 'deposit',
          description: `Deposito: ${tx.ticker}`,
          amount: amount,
          balance: null // Will be calculated later
        });
      } else if (tx.type === 'sell') {
        // Withdrawal
        cashWithdrawals += amount;

        if (!cashAccounts[tx.ticker]) {
          cashAccounts[tx.ticker] = {
            name: tx.ticker,
            deposits: 0,
            withdrawals: 0,
            balance: 0
          };
        }
        cashAccounts[tx.ticker].withdrawals += amount;
        cashAccounts[tx.ticker].balance -= amount;

        movements.push({
          date: tx.date,
          type: 'withdrawal',
          description: `Prelievo: ${tx.ticker}`,
          amount: -amount,
          balance: null
        });
      }
    } else {
      // Asset transaction (affects cash)
      if (tx.type === 'buy') {
        // Purchase (subtract from cash)
        assetPurchases += totalCost;

        movements.push({
          date: tx.date,
          type: 'purchase',
          description: `Acquisto: ${tx.ticker}`,
          amount: -totalCost,
          ticker: tx.ticker,
          balance: null
        });
      } else if (tx.type === 'sell') {
        // Sale (add to cash)
        const proceeds = amount - commission; // Net proceeds
        assetSales += proceeds;

        movements.push({
          date: tx.date,
          type: 'sale',
          description: `Vendita: ${tx.ticker}`,
          amount: proceeds,
          ticker: tx.ticker,
          balance: null
        });
      }
    }
  });

  // Calculate available cash
  const availableCash = cashDeposits - cashWithdrawals - assetPurchases + assetSales;

  // Sort movements by date and calculate running balance
  movements.sort((a, b) => new Date(a.date) - new Date(b.date));
  let runningBalance = 0;
  movements.forEach(m => {
    runningBalance += m.amount;
    m.balance = runningBalance;
  });

  return {
    cashDeposits,
    cashWithdrawals,
    assetPurchases,
    assetSales,
    availableCash,
    cashAccounts: Object.values(cashAccounts),
    movements,
    // Summary
    totalInflows: cashDeposits + assetSales,
    totalOutflows: cashWithdrawals + assetPurchases,
    netCashFlow: availableCash
  };
}

/**
 * Get available cash at a specific date
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @returns {number} Available cash at that date
 */
export function getAvailableCashAtDate(date) {
  const transactions = getTransactions();
  const targetDate = new Date(date);

  let cashBalance = 0;

  transactions
    .filter(tx => new Date(tx.date) <= targetDate)
    .forEach(tx => {
      const isCash = tx.isCash || tx.macroCategory === 'Cash';
      const amount = tx.quantity * tx.price;
      const commission = tx.commission || 0;

      if (isCash) {
        if (tx.type === 'buy') {
          cashBalance += amount;
        } else if (tx.type === 'sell') {
          cashBalance -= amount;
        }
      } else {
        if (tx.type === 'buy') {
          cashBalance -= (amount + commission);
        } else if (tx.type === 'sell') {
          cashBalance += (amount - commission);
        }
      }
    });

  return cashBalance;
}

/**
 * Check if there's enough cash to buy an asset
 * @param {number} amount - Amount needed
 * @param {number} commission - Commission amount
 * @returns {Object} Check result
 */
export function checkCashAvailability(amount, commission = 0) {
  const cashFlow = calculateCashFlow();
  const totalNeeded = amount + commission;
  const available = cashFlow.availableCash;

  return {
    available,
    needed: totalNeeded,
    sufficient: available >= totalNeeded,
    shortfall: available < totalNeeded ? totalNeeded - available : 0
  };
}

/**
 * Get cash account summary
 * @returns {Array} Array of cash accounts with balances
 */
export function getCashAccounts() {
  const cashFlow = calculateCashFlow();
  return cashFlow.cashAccounts;
}

/**
 * Get recent cash movements
 * @param {number} limit - Number of movements to return (default: 10)
 * @returns {Array} Recent movements
 */
export function getRecentCashMovements(limit = 10) {
  const cashFlow = calculateCashFlow();
  return cashFlow.movements.slice(-limit).reverse();
}

export default {
  calculateCashFlow,
  getAvailableCashAtDate,
  checkCashAvailability,
  getCashAccounts,
  getRecentCashMovements
};
