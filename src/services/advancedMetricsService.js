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

  // Maximum Drawdown — use cumulative TWR so deposits don't mask real drawdowns
  const cumulativeTWR = [100];
  returns.forEach(r => cumulativeTWR.push(cumulativeTWR[cumulativeTWR.length - 1] * (1 + r / 100)));
  const ddSeries = cumulativeTWR.length > 1 ? cumulativeTWR : values;
  const drawdownDetails = calculateMaxDrawdown(ddSeries);

  // Recovery Time
  const recoveryTime = calculateRecoveryTime(ddSeries, drawdownDetails);

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

/**
 * Calculate Beta
 * Measures portfolio's sensitivity to market movements
 * Beta = Covariance(portfolio, benchmark) / Variance(benchmark)
 *
 * @param {Array} portfolioReturns - Array of portfolio returns (as percentages)
 * @param {Array} benchmarkReturns - Array of benchmark returns (as percentages)
 * @returns {number} Beta coefficient
 */
export function calculateBeta(portfolioReturns, benchmarkReturns) {
  if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length < 2) {
    return 0;
  }

  // Align arrays to same length
  const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const pReturns = portfolioReturns.slice(0, minLength);
  const bReturns = benchmarkReturns.slice(0, minLength);

  // Calculate means
  const pMean = pReturns.reduce((s, r) => s + r, 0) / pReturns.length;
  const bMean = bReturns.reduce((s, r) => s + r, 0) / bReturns.length;

  // Calculate covariance and variance
  let covariance = 0;
  let benchmarkVariance = 0;

  for (let i = 0; i < minLength; i++) {
    covariance += (pReturns[i] - pMean) * (bReturns[i] - bMean);
    benchmarkVariance += Math.pow(bReturns[i] - bMean, 2);
  }

  covariance /= minLength;
  benchmarkVariance /= minLength;

  if (benchmarkVariance === 0) return 0;

  return covariance / benchmarkVariance;
}

/**
 * Calculate Alpha (Jensen's Alpha)
 * Measures excess return over what CAPM predicts
 * Alpha = Portfolio Return - [Risk-Free Rate + Beta × (Benchmark Return - Risk-Free Rate)]
 *
 * @param {number} portfolioReturn - Portfolio's annualized return (percentage)
 * @param {number} benchmarkReturn - Benchmark's annualized return (percentage)
 * @param {number} beta - Portfolio's beta
 * @param {number} riskFreeRate - Annual risk-free rate (default: 2%)
 * @returns {number} Alpha percentage (annualized)
 */
export function calculateAlpha(portfolioReturn, benchmarkReturn, beta, riskFreeRate = 2) {
  // CAPM expected return
  const expectedReturn = riskFreeRate + beta * (benchmarkReturn - riskFreeRate);

  // Alpha = actual return - expected return
  return portfolioReturn - expectedReturn;
}

/**
 * Calculate Tracking Error
 * Standard deviation of the difference between portfolio and benchmark returns
 *
 * @param {Array} portfolioReturns - Array of portfolio returns (as percentages)
 * @param {Array} benchmarkReturns - Array of benchmark returns (as percentages)
 * @returns {number} Tracking error (annualized percentage)
 */
export function calculateTrackingError(portfolioReturns, benchmarkReturns) {
  if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length < 2) {
    return 0;
  }

  // Align arrays
  const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);

  // Calculate excess returns (portfolio - benchmark)
  const excessReturns = [];
  for (let i = 0; i < minLength; i++) {
    excessReturns.push(portfolioReturns[i] - benchmarkReturns[i]);
  }

  // Calculate standard deviation of excess returns
  const mean = excessReturns.reduce((s, r) => s + r, 0) / excessReturns.length;
  const variance = excessReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / excessReturns.length;
  const monthlyTE = Math.sqrt(variance);

  // Annualize
  return monthlyTE * Math.sqrt(12);
}

/**
 * Calculate Information Ratio
 * Risk-adjusted excess return relative to benchmark
 * IR = (Portfolio Return - Benchmark Return) / Tracking Error
 *
 * @param {number} portfolioReturn - Portfolio's annualized return (percentage)
 * @param {number} benchmarkReturn - Benchmark's annualized return (percentage)
 * @param {number} trackingError - Tracking error (annualized percentage)
 * @returns {number} Information Ratio
 */
export function calculateInformationRatio(portfolioReturn, benchmarkReturn, trackingError) {
  if (trackingError === 0) return 0;

  return (portfolioReturn - benchmarkReturn) / trackingError;
}

/**
 * Calculate Calmar Ratio
 * Return relative to maximum drawdown risk
 * Calmar = CAGR / Max Drawdown
 *
 * @param {number} cagr - Compound Annual Growth Rate (percentage)
 * @param {number} maxDrawdown - Maximum drawdown (percentage, positive number)
 * @returns {number} Calmar Ratio
 */
export function calculateCalmarRatio(cagr, maxDrawdown) {
  if (maxDrawdown === 0) return cagr > 0 ? Infinity : 0;

  return cagr / maxDrawdown;
}

/**
 * Calculate R-Squared (Coefficient of Determination)
 * Measures how much of portfolio's movement is explained by benchmark
 *
 * @param {Array} portfolioReturns - Array of portfolio returns
 * @param {Array} benchmarkReturns - Array of benchmark returns
 * @returns {number} R-squared (0 to 1, or 0 to 100 as percentage)
 */
export function calculateRSquared(portfolioReturns, benchmarkReturns) {
  if (!portfolioReturns || !benchmarkReturns || portfolioReturns.length < 2) {
    return 0;
  }

  const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const pReturns = portfolioReturns.slice(0, minLength);
  const bReturns = benchmarkReturns.slice(0, minLength);

  // Calculate correlation coefficient
  const pMean = pReturns.reduce((s, r) => s + r, 0) / pReturns.length;
  const bMean = bReturns.reduce((s, r) => s + r, 0) / bReturns.length;

  let numerator = 0;
  let pDenominator = 0;
  let bDenominator = 0;

  for (let i = 0; i < minLength; i++) {
    const pDiff = pReturns[i] - pMean;
    const bDiff = bReturns[i] - bMean;
    numerator += pDiff * bDiff;
    pDenominator += pDiff * pDiff;
    bDenominator += bDiff * bDiff;
  }

  if (pDenominator === 0 || bDenominator === 0) return 0;

  const correlation = numerator / Math.sqrt(pDenominator * bDenominator);

  // R-squared is correlation squared
  return Math.pow(correlation, 2) * 100; // Return as percentage
}

export default {
  calculateCAGR,
  calculateMaxDrawdown,
  calculateRecoveryTime,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateVolatility,
  calculateAllMetrics,
  calculateBeta,
  calculateAlpha,
  calculateTrackingError,
  calculateInformationRatio,
  calculateCalmarRatio,
  calculateRSquared
};
