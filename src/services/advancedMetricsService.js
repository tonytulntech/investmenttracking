/**
 * Advanced Portfolio Metrics Service
 *
 * Calculates advanced statistical metrics for portfolio performance
 */

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * @param {number} initialValue - Starting portfolio value
 * @param {number} finalValue - Ending portfolio value
 * @param {number} years - Number of years
 * @returns {number} CAGR percentage
 */
export function calculateCAGR(initialValue, finalValue, years) {
  if (initialValue <= 0 || finalValue <= 0 || years <= 0) {
    return 0;
  }

  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

/**
 * Calculate Maximum Drawdown
 * Returns the largest percentage drop from peak to trough
 *
 * @param {Array} values - Array of portfolio values over time
 * @returns {Object} { maxDrawdown, peakIndex, troughIndex, peakValue, troughValue }
 */
export function calculateMaxDrawdown(values) {
  if (!values || values.length === 0) {
    return { maxDrawdown: 0, peakIndex: 0, troughIndex: 0, peakValue: 0, troughValue: 0 };
  }

  let maxDrawdown = 0;
  let peak = values[0];
  let peakIndex = 0;
  let troughIndex = 0;
  let peakValue = values[0];
  let troughValue = values[0];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (value > peak) {
      peak = value;
      peakIndex = i;
    }

    const drawdown = ((peak - value) / peak) * 100;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      troughIndex = i;
      peakValue = peak;
      troughValue = value;
    }
  }

  return {
    maxDrawdown,
    peakIndex,
    troughIndex,
    peakValue,
    troughValue
  };
}

/**
 * Calculate Recovery Time
 * Time taken to recover from maximum drawdown
 *
 * @param {Array} values - Array of portfolio values over time
 * @param {Object} drawdown - Drawdown object from calculateMaxDrawdown
 * @returns {number} Number of periods to recover (0 if not yet recovered)
 */
export function calculateRecoveryTime(values, drawdown) {
  if (!drawdown || drawdown.maxDrawdown === 0) {
    return 0;
  }

  const { peakValue, troughIndex } = drawdown;

  // Find when portfolio value exceeds peak after trough
  for (let i = troughIndex + 1; i < values.length; i++) {
    if (values[i] >= peakValue) {
      return i - troughIndex;
    }
  }

  // Not yet recovered
  return 0;
}

/**
 * Calculate Sharpe Ratio
 * Measures risk-adjusted return
 *
 * @param {Array} returns - Array of period returns (as percentages)
 * @param {number} riskFreeRate - Annual risk-free rate (default: 2%)
 * @returns {number} Sharpe ratio
 */
export function calculateSharpeRatio(returns, riskFreeRate = 2) {
  if (!returns || returns.length < 2) {
    return 0;
  }

  // Convert annual risk-free rate to monthly
  const monthlyRiskFreeRate = riskFreeRate / 12;

  // Calculate average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return 0;
  }

  // Sharpe ratio = (avg return - risk free rate) / std dev
  return (avgReturn - monthlyRiskFreeRate) / stdDev;
}

/**
 * Calculate Sortino Ratio
 * Similar to Sharpe but only considers downside volatility
 *
 * @param {Array} returns - Array of period returns (as percentages)
 * @param {number} targetReturn - Target or minimum acceptable return (default: 0%)
 * @returns {number} Sortino ratio
 */
export function calculateSortinoRatio(returns, targetReturn = 0) {
  if (!returns || returns.length < 2) {
    return 0;
  }

  // Calculate average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate downside deviation (only negative returns)
  const downsideReturns = returns.filter(r => r < targetReturn);

  if (downsideReturns.length === 0) {
    return Infinity; // No downside risk
  }

  const downsideVariance = downsideReturns.reduce((sum, r) =>
    sum + Math.pow(r - targetReturn, 2), 0
  ) / downsideReturns.length;

  const downsideDeviation = Math.sqrt(downsideVariance);

  if (downsideDeviation === 0) {
    return Infinity;
  }

  // Sortino ratio = (avg return - target return) / downside deviation
  return (avgReturn - targetReturn) / downsideDeviation;
}

/**
 * Calculate Volatility (Standard Deviation of Returns)
 * @param {Array} returns - Array of period returns (as percentages)
 * @returns {number} Annualized volatility percentage
 */
export function calculateVolatility(returns) {
  if (!returns || returns.length < 2) {
    return 0;
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const monthlyStdDev = Math.sqrt(variance);

  // Annualize: monthly std dev * sqrt(12)
  return monthlyStdDev * Math.sqrt(12);
}

/**
 * Calculate all advanced metrics at once
 * @param {Array} monthlyData - Array of monthly portfolio data with {value, return, invested} properties
 * @param {number} riskFreeRate - Annual risk-free rate (default: 2%)
 * @param {number} totalInvested - Total capital invested (optional, will use last month's invested if not provided)
 * @returns {Object} All metrics
 */
export function calculateAllMetrics(monthlyData, riskFreeRate = 2, totalInvested = null) {
  if (!monthlyData || monthlyData.length === 0) {
    return {
      cagr: 0,
      maxDrawdown: 0,
      recoveryTime: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      volatility: 0,
      drawdownDetails: null
    };
  }

  const values = monthlyData.map(d => d.value);
  const returns = monthlyData
    .filter(d => d.return !== undefined && d.return !== null)
    .map(d => d.return);

  // Calculate years
  const years = monthlyData.length / 12;

  // CAGR - Use totalInvested as initial value (not first portfolio value!)
  // This gives the true compound annual growth rate of your investment
  const initialValue = totalInvested !== null
    ? totalInvested
    : (monthlyData[0].invested || values[0]);
  const finalValue = values[values.length - 1];
  const cagr = calculateCAGR(initialValue, finalValue, years);

  // Maximum Drawdown
  const drawdownDetails = calculateMaxDrawdown(values);

  // Recovery Time
  const recoveryTime = calculateRecoveryTime(values, drawdownDetails);

  // Sharpe Ratio
  const sharpeRatio = calculateSharpeRatio(returns, riskFreeRate);

  // Sortino Ratio
  const sortinoRatio = calculateSortinoRatio(returns, 0);

  // Volatility
  const volatility = calculateVolatility(returns);

  return {
    cagr,
    maxDrawdown: drawdownDetails.maxDrawdown,
    recoveryTime,
    sharpeRatio,
    sortinoRatio,
    volatility,
    drawdownDetails
  };
}

export default {
  calculateCAGR,
  calculateMaxDrawdown,
  calculateRecoveryTime,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateVolatility,
  calculateAllMetrics
};
