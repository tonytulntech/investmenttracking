/**
 * Performance Service
 *
 * Calculates investment performance metrics including CAGR, ROI, time-weighted returns
 */

import { getTransactions } from './localStorageService';

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * Formula: CAGR = (Final Value / Initial Value)^(1/Years) - 1
 *
 * @param {number} initialValue - Starting investment value
 * @param {number} finalValue - Current portfolio value
 * @param {number} years - Time period in years
 * @returns {number} CAGR as percentage
 */
export function calculateCAGR(initialValue, finalValue, years) {
  if (initialValue <= 0 || years <= 0) return 0;

  const cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  return cagr;
}

/**
 * Calculate investment metrics from filtered portfolio
 *
 * @param {Array} filteredPortfolio - Portfolio holdings after filters
 * @param {Array} allTransactions - All transactions (will be filtered)
 * @returns {Object} Performance metrics
 */
export function calculateInvestmentMetrics(filteredPortfolio, allTransactions = null) {
  const transactions = allTransactions || getTransactions();

  if (filteredPortfolio.length === 0) {
    return {
      cagr: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      startDate: null,
      daysInvesting: 0,
      yearsInvesting: 0,
      initialInvestment: 0,
      currentValue: 0,
      totalInvested: 0,
      averageAnnualReturn: 0
    };
  }

  // Get tickers in filtered portfolio (excluding CASH)
  const portfolioTickers = new Set(
    filteredPortfolio
      .filter(p => !p.isCash)
      .map(p => p.ticker)
  );

  // Filter transactions to only include filtered tickers
  const filteredTransactions = transactions.filter(tx => {
    const isCash = tx.isCash || tx.macroCategory === 'Cash';
    return !isCash && portfolioTickers.has(tx.ticker);
  });

  if (filteredTransactions.length === 0) {
    return {
      cagr: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
      startDate: null,
      daysInvesting: 0,
      yearsInvesting: 0,
      initialInvestment: 0,
      currentValue: 0,
      totalInvested: 0,
      averageAnnualReturn: 0
    };
  }

  // Sort transactions by date
  const sortedTransactions = [...filteredTransactions].sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );

  // First transaction date
  const startDate = new Date(sortedTransactions[0].date);
  const today = new Date();
  const daysInvesting = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const yearsInvesting = daysInvesting / 365.25;

  // Calculate total invested (sum of all buys - sells)
  let totalInvested = 0;
  sortedTransactions.forEach(tx => {
    const amount = tx.quantity * tx.price;
    const commission = tx.commission || 0;

    if (tx.type === 'buy') {
      totalInvested += amount + commission;
    } else if (tx.type === 'sell') {
      totalInvested -= amount - commission;
    }
  });

  // Current portfolio value (from filtered portfolio)
  const currentValue = filteredPortfolio
    .filter(p => !p.isCash)
    .reduce((sum, p) => sum + p.marketValue, 0);

  // Total return
  const totalReturn = currentValue - totalInvested;
  const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

  // Calculate CAGR
  const cagr = yearsInvesting > 0 ? calculateCAGR(totalInvested, currentValue, yearsInvesting) : 0;

  // Average annual return (simple average)
  const averageAnnualReturn = yearsInvesting > 0 ? totalReturnPercent / yearsInvesting : totalReturnPercent;

  return {
    cagr,
    totalReturn,
    totalReturnPercent,
    startDate: startDate.toISOString(),
    daysInvesting,
    yearsInvesting,
    initialInvestment: totalInvested,
    currentValue,
    totalInvested,
    averageAnnualReturn
  };
}

/**
 * Project when a goal will be reached based on current CAGR
 *
 * @param {number} currentValue - Current portfolio value
 * @param {number} targetValue - Goal amount
 * @param {number} monthlyContribution - Monthly investment amount
 * @param {number} cagr - Current CAGR (as percentage)
 * @param {number} currentAge - User's current age (optional)
 * @returns {Object} Projection details
 */
export function projectGoalAchievement(currentValue, targetValue, monthlyContribution = 0, cagr = 0, currentAge = null) {
  if (targetValue <= currentValue) {
    return {
      achieved: true,
      yearsToGoal: 0,
      ageAtGoal: currentAge,
      yearAtGoal: new Date().getFullYear(),
      monthsToGoal: 0,
      message: 'Obiettivo già raggiunto! 🎉'
    };
  }

  if (cagr <= 0 && monthlyContribution <= 0) {
    return {
      achieved: false,
      yearsToGoal: null,
      ageAtGoal: null,
      yearAtGoal: null,
      monthsToGoal: null,
      message: 'Impossibile raggiungere l\'obiettivo senza rendimenti positivi o contributi mensili'
    };
  }

  // Calculate months to reach goal
  const monthlyRate = cagr > 0 ? Math.pow(1 + cagr / 100, 1 / 12) - 1 : 0;
  let value = currentValue;
  let months = 0;
  const maxMonths = 1200; // 100 years max

  while (value < targetValue && months < maxMonths) {
    value = value * (1 + monthlyRate) + monthlyContribution;
    months++;
  }

  if (months >= maxMonths) {
    return {
      achieved: false,
      yearsToGoal: null,
      ageAtGoal: null,
      yearAtGoal: null,
      monthsToGoal: null,
      message: 'L\'obiettivo richiede più di 100 anni con le attuali condizioni'
    };
  }

  const yearsToGoal = months / 12;
  const currentYear = new Date().getFullYear();
  const yearAtGoal = currentYear + Math.ceil(yearsToGoal);
  const ageAtGoal = currentAge ? currentAge + Math.ceil(yearsToGoal) : null;

  let message = `Se continui così, raggiungerai l'obiettivo in circa ${Math.ceil(yearsToGoal)} anni`;
  if (ageAtGoal) {
    message += ` (nel ${yearAtGoal}, quando avrai ${ageAtGoal} anni)`;
  } else {
    message += ` (nel ${yearAtGoal})`;
  }

  return {
    achieved: false,
    yearsToGoal: parseFloat(yearsToGoal.toFixed(1)),
    ageAtGoal,
    yearAtGoal,
    monthsToGoal: months,
    message,
    projectedFinalValue: value
  };
}

/**
 * Calculate time-weighted return (TWR)
 * More accurate for portfolios with irregular cash flows
 *
 * @param {Array} transactions - Transaction history
 * @param {number} currentValue - Current portfolio value
 * @returns {Object} TWR metrics
 */
export function calculateTimeWeightedReturn(transactions, currentValue) {
  if (transactions.length === 0) {
    return {
      twr: 0,
      annualizedTWR: 0
    };
  }

  // Sort transactions by date
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate period returns
  let holdingPeriodReturns = [];
  let portfolioValue = 0;

  sortedTx.forEach((tx, index) => {
    const amount = tx.quantity * tx.price;

    if (tx.type === 'buy') {
      const previousValue = portfolioValue;
      portfolioValue += amount;

      if (previousValue > 0 && index > 0) {
        // Calculate return for this period
        const periodReturn = (portfolioValue - amount) / previousValue;
        holdingPeriodReturns.push(1 + periodReturn);
      }
    } else if (tx.type === 'sell') {
      const previousValue = portfolioValue;
      portfolioValue -= amount;

      if (previousValue > 0) {
        const periodReturn = (portfolioValue + amount) / previousValue;
        holdingPeriodReturns.push(1 + periodReturn);
      }
    }
  });

  // Current period return
  if (portfolioValue > 0) {
    const finalReturn = currentValue / portfolioValue;
    holdingPeriodReturns.push(finalReturn);
  }

  // Multiply all period returns
  const twr = holdingPeriodReturns.reduce((product, ret) => product * ret, 1) - 1;

  // Annualize
  const startDate = new Date(sortedTx[0].date);
  const years = (new Date() - startDate) / (1000 * 60 * 60 * 24 * 365.25);
  const annualizedTWR = years > 0 ? (Math.pow(1 + twr, 1 / years) - 1) * 100 : twr * 100;

  return {
    twr: twr * 100,
    annualizedTWR
  };
}

/**
 * Get performance summary for display
 *
 * @param {Array} filteredPortfolio - Filtered portfolio holdings
 * @param {Object} strategy - User's investment strategy (optional)
 * @returns {Object} Complete performance summary
 */
export function getPerformanceSummary(filteredPortfolio, strategy = null) {
  const metrics = calculateInvestmentMetrics(filteredPortfolio);

  let goalProjection = null;
  if (strategy && strategy.targetAmount) {
    const monthlyPAC = parseFloat(strategy.monthlyInvestment) || 0;
    const userAge = parseInt(strategy.currentAge) || null;

    goalProjection = projectGoalAchievement(
      metrics.currentValue,
      parseFloat(strategy.targetAmount),
      monthlyPAC,
      metrics.cagr,
      userAge
    );
  }

  return {
    ...metrics,
    goalProjection
  };
}

export default {
  calculateCAGR,
  calculateInvestmentMetrics,
  projectGoalAchievement,
  calculateTimeWeightedReturn,
  getPerformanceSummary
};
