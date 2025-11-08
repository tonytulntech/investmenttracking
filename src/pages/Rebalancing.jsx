import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, TrendingUp, TrendingDown, Calendar, DollarSign, Target, Bell, Percent, ShoppingCart, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { calculatePortfolio, getTransactions } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { format, addMonths } from 'date-fns';

const COLORS_POSITIVE = '#10b981';
const COLORS_NEGATIVE = '#ef4444';
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function Rebalancing() {
  const [strategy, setStrategy] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [deviation, setDeviation] = useState([]);
  const [microDeviation, setMicroDeviation] = useState([]);
  const [pacCalendar, setPacCalendar] = useState([]);
  const [picSuggestions, setPicSuggestions] = useState([]);
  const [rebalancingAlerts, setRebalancingAlerts] = useState([]);
  const [fractionalETF, setFractionalETF] = useState(true); // Broker allows fractional ETFs
  const [nextPurchases, setNextPurchases] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Recalculate when fractionalETF setting changes
    if (portfolio.length > 0 && deviation.length > 0 && strategy) {
      const monthlyBudget = parseFloat(strategy.monthlyInvestment) || 0;
      const smartPurchases = calculateSmartPurchases(portfolio, deviation, monthlyBudget, fractionalETF);
      setNextPurchases(smartPurchases);
    }
  }, [fractionalETF]);

  const loadData = async () => {
    // Load strategy
    const saved = localStorage.getItem('investment_strategy');
    if (saved) {
      const strategyData = JSON.parse(saved);
      setStrategy(strategyData);

      // Load portfolio with current prices
      const holdings = calculatePortfolio();

      // Fetch current prices for non-cash holdings
      const nonCashHoldings = holdings.filter(h => !h.isCash);
      const tickers = nonCashHoldings.map(h => h.ticker);
      const categoriesMap = nonCashHoldings.reduce((acc, h) => {
        acc[h.ticker] = h.macroCategory || h.category;
        return acc;
      }, {});

      const prices = tickers.length > 0 ? await fetchMultiplePrices(tickers, categoriesMap) : {};

      // Update portfolio with current market values
      const updatedPortfolio = holdings.map(holding => {
        if (holding.isCash) {
          // Cash: use totalCost as market value
          return {
            ...holding,
            currentPrice: 1,
            marketValue: holding.totalCost
          };
        }

        // Other assets: use current price
        const priceData = prices[holding.ticker];
        const currentPrice = priceData?.price || holding.avgPrice;
        const marketValue = currentPrice * holding.quantity;

        return {
          ...holding,
          currentPrice,
          marketValue
        };
      });

      setPortfolio(updatedPortfolio);

      // Calculate deviation (excluding cash from rebalancing)
      const deviations = calculateDeviation(updatedPortfolio, strategyData);
      setDeviation(deviations);

      // Calculate MICRO deviation
      const transactions = getTransactions();
      const microDeviations = calculateMicroDeviation(updatedPortfolio, transactions, strategyData);
      setMicroDeviation(microDeviations);

      // Calculate PAC calendar
      const calendar = calculatePACCalendar(deviations, strategyData);
      setPacCalendar(calendar);

      // Calculate PIC suggestions
      const picAmounts = calculatePICAmounts(deviations, updatedPortfolio);
      setPicSuggestions(picAmounts);

      // Calculate smart purchases for next month
      const monthlyBudget = parseFloat(strategyData.monthlyInvestment) || 0;
      const smartPurchases = calculateSmartPurchases(updatedPortfolio, deviations, monthlyBudget, fractionalETF);
      setNextPurchases(smartPurchases);

      // Check rebalancing alerts
      const alerts = checkRebalancingAlerts(deviations, strategyData);
      setRebalancingAlerts(alerts);
    }
  };

  const calculateDeviation = (holdings, strategyData) => {
    // Exclude cash from rebalancing calculations
    const investableHoldings = holdings.filter(h => !h.isCash);

    // Calculate total value using market values
    const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    // Group by macro category
    const categoryTotals = {};
    investableHoldings.forEach(h => {
      const category = h.macroCategory || h.category;
      categoryTotals[category] = (categoryTotals[category] || 0) + (h.marketValue || 0);
    });

    // Calculate deviation for each asset class
    const assetClasses = Object.keys(strategyData.assetAllocation);
    return assetClasses.map(assetClass => {
      const currentValue = categoryTotals[assetClass] || 0;
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const targetPercentage = strategyData.assetAllocation[assetClass];
      const difference = currentPercentage - targetPercentage;
      const amountDifference = totalValue * (difference / 100);

      return {
        assetClass,
        current: parseFloat(currentPercentage.toFixed(2)),
        target: parseFloat(targetPercentage),
        difference: parseFloat(difference.toFixed(2)),
        amountDifference: parseFloat(amountDifference.toFixed(2)),
        status: Math.abs(difference) < 2 ? 'ok' : Math.abs(difference) < 5 ? 'warning' : 'alert'
      };
    }).filter(d => d.target > 0); // Only show asset classes with target > 0
  };

  const calculateMicroDeviation = (holdings, transactions, strategy) => {
    // Exclude cash from rebalancing calculations
    const investableHoldings = holdings.filter(h => !h.isCash);
    const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    // Group by micro category
    const microTotals = {};
    investableHoldings.forEach(h => {
      const micro = h.microCategory || h.subCategory || 'Non categorizzato';
      microTotals[micro] = (microTotals[micro] || 0) + (h.marketValue || 0);
    });

    // Get target allocations from Strategy (if defined)
    const hasStrategyTargets = strategy && strategy.microAllocation && Object.keys(strategy.microAllocation).length > 0;
    const microTargets = hasStrategyTargets ? strategy.microAllocation : {};

    // If no strategy targets, estimate from transaction history (fallback)
    if (!hasStrategyTargets) {
      const txTargets = {};
      transactions.filter(tx => !tx.isCash && tx.microCategory).forEach(tx => {
        const micro = tx.microCategory || tx.subCategory;
        txTargets[micro] = (txTargets[micro] || 0) + 1;
      });

      const totalWeight = Object.values(txTargets).reduce((sum, w) => sum + w, 0);
      Object.entries(txTargets).forEach(([micro, weight]) => {
        microTargets[micro] = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
      });
    }

    // Combine all MICRO categories (both current and target)
    const allMicroCategories = new Set([
      ...Object.keys(microTotals),
      ...Object.keys(microTargets)
    ]);

    return Array.from(allMicroCategories).map(microCategory => {
      const value = microTotals[microCategory] || 0;
      const currentPercentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const targetPercentage = microTargets[microCategory] || 0;
      const difference = currentPercentage - targetPercentage;

      return {
        microCategory,
        current: parseFloat(currentPercentage.toFixed(2)),
        target: parseFloat(targetPercentage.toFixed(2)),
        difference: parseFloat(difference.toFixed(2)),
        value,
        status: Math.abs(difference) < 5 ? 'ok' : Math.abs(difference) < 10 ? 'warning' : 'alert',
        hasTarget: microTargets[microCategory] > 0
      };
    })
    .filter(d => d.current > 0 || d.target > 0) // Only show categories with current or target value
    .sort((a, b) => b.value - a.value);
  };

  const calculateSmartPurchases = (portfolio, deviations, monthlyBudget, fractional) => {
    if (fractional) {
      // If fractional, just return percentage-based suggestions
      const underweight = deviations.filter(d => d.difference < -2);
      const totalUnderweight = underweight.reduce((sum, d) => sum + Math.abs(d.difference), 0);

      return underweight.map(d => ({
        assetClass: d.assetClass,
        amount: totalUnderweight > 0
          ? parseFloat((monthlyBudget * (Math.abs(d.difference) / totalUnderweight)).toFixed(2))
          : 0,
        percentageOfBudget: totalUnderweight > 0
          ? parseFloat(((Math.abs(d.difference) / totalUnderweight) * 100).toFixed(1))
          : 0,
        shares: null // Fractional shares handled by broker
      }));
    }

    // Non-fractional: need to calculate exact shares to buy
    const holdings = portfolio.filter(h => !h.isCash);
    const underweight = deviations.filter(d => d.difference < -2);

    if (underweight.length === 0) {
      return deviations
        .filter(d => d.target > 0)
        .map(d => {
          const holdingsInClass = holdings.filter(h => (h.macroCategory || h.category) === d.assetClass);
          const avgPrice = holdingsInClass.length > 0
            ? holdingsInClass.reduce((sum, h) => sum + h.currentPrice, 0) / holdingsInClass.length
            : 100; // Default if no holdings

          const targetAmount = monthlyBudget * (d.target / 100);
          const shares = Math.floor(targetAmount / avgPrice);
          const actualAmount = shares * avgPrice;

          return {
            assetClass: d.assetClass,
            price: parseFloat(avgPrice.toFixed(2)),
            shares,
            amount: parseFloat(actualAmount.toFixed(2)),
            percentageOfBudget: monthlyBudget > 0 ? parseFloat(((actualAmount / monthlyBudget) * 100).toFixed(1)) : 0
          };
        })
        .filter(p => p.shares > 0);
    }

    // Underweight exists: prioritize those
    const totalUnderweight = underweight.reduce((sum, d) => sum + Math.abs(d.difference), 0);

    const purchases = underweight.map(d => {
      const holdingsInClass = holdings.filter(h => (h.macroCategory || h.category) === d.assetClass);
      const avgPrice = holdingsInClass.length > 0
        ? holdingsInClass.reduce((sum, h) => sum + h.currentPrice, 0) / holdingsInClass.length
        : 50; // Lower default for underweight

      const targetAmount = monthlyBudget * (Math.abs(d.difference) / totalUnderweight);
      const shares = Math.floor(targetAmount / avgPrice);
      const actualAmount = shares * avgPrice;

      return {
        assetClass: d.assetClass,
        price: parseFloat(avgPrice.toFixed(2)),
        shares,
        amount: parseFloat(actualAmount.toFixed(2)),
        percentageOfBudget: monthlyBudget > 0 ? parseFloat(((actualAmount / monthlyBudget) * 100).toFixed(1)) : 0,
        remaining: parseFloat((targetAmount - actualAmount).toFixed(2))
      };
    }).filter(p => p.shares > 0);

    // Calculate what's left after whole shares
    const spent = purchases.reduce((sum, p) => sum + p.amount, 0);
    const remaining = monthlyBudget - spent;

    return {
      purchases,
      spent: parseFloat(spent.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      utilizationPercent: monthlyBudget > 0 ? parseFloat(((spent / monthlyBudget) * 100).toFixed(1)) : 0
    };
  };

  const calculatePACCalendar = (deviations, strategyData) => {
    const monthlyAmount = parseFloat(strategyData.monthlyInvestment) || 0;
    if (monthlyAmount === 0) return [];

    // Generate next 12 months
    const calendar = [];
    const needsRebalancing = deviations.filter(d => d.difference < -2); // Underweight asset classes

    for (let month = 1; month <= 12; month++) {
      const date = addMonths(new Date(), month);
      const purchases = [];

      // Distribute monthly amount proportionally to underweight assets
      const totalUnderweight = needsRebalancing.reduce((sum, d) => sum + Math.abs(d.difference), 0);

      if (totalUnderweight > 0) {
        needsRebalancing.forEach(d => {
          const proportion = Math.abs(d.difference) / totalUnderweight;
          const amount = monthlyAmount * proportion;
          if (amount >= 10) { // Minimum €10 per purchase
            purchases.push({
              assetClass: d.assetClass,
              amount: parseFloat(amount.toFixed(2))
            });
          }
        });
      } else {
        // No rebalancing needed, distribute according to target allocation
        deviations.forEach(d => {
          const amount = monthlyAmount * (d.target / 100);
          if (amount >= 10) {
            purchases.push({
              assetClass: d.assetClass,
              amount: parseFloat(amount.toFixed(2))
            });
          }
        });
      }

      calendar.push({
        month: format(date, 'MMM yyyy'),
        monthNumber: month,
        purchases,
        total: purchases.reduce((sum, p) => sum + p.amount, 0)
      });
    }

    return calendar.slice(0, 6); // Show next 6 months
  };

  const calculatePICAmounts = (deviations, holdings) => {
    // Exclude cash from rebalancing calculations
    const investableHoldings = holdings.filter(h => !h.isCash);
    const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    return deviations
      .filter(d => d.difference < -1) // Only underweight assets
      .map(d => {
        // Amount needed to bring to target
        const targetValue = totalValue * (d.target / 100);
        const currentValue = totalValue * (d.current / 100);
        const amountNeeded = targetValue - currentValue;

        return {
          assetClass: d.assetClass,
          currentValue: parseFloat(currentValue.toFixed(2)),
          targetValue: parseFloat(targetValue.toFixed(2)),
          amountNeeded: parseFloat(amountNeeded.toFixed(2)),
          currentPercentage: d.current,
          targetPercentage: d.target
        };
      })
      .sort((a, b) => b.amountNeeded - a.amountNeeded);
  };

  const checkRebalancingAlerts = (deviations, strategyData) => {
    const alerts = [];

    // Check for significant deviations
    const significantDeviations = deviations.filter(d => Math.abs(d.difference) >= 5);
    if (significantDeviations.length > 0) {
      alerts.push({
        type: 'deviation',
        severity: 'high',
        title: 'Scostamento Significativo Rilevato',
        message: `${significantDeviations.length} asset class ${significantDeviations.length > 1 ? 'hanno' : 'ha'} uno scostamento ≥5% dall'obiettivo`,
        assets: significantDeviations.map(d => d.assetClass).join(', ')
      });
    }

    // Check for last rebalancing date (simulate - in real app would track this)
    const lastRebalancing = localStorage.getItem('last_rebalancing_date');
    if (lastRebalancing) {
      const monthsSince = Math.floor((new Date() - new Date(lastRebalancing)) / (1000 * 60 * 60 * 24 * 30));
      if (monthsSince >= 12) {
        alerts.push({
          type: 'time',
          severity: 'medium',
          title: 'Ribilanciamento Annuale Consigliato',
          message: `Sono passati ${monthsSince} mesi dall'ultimo ribilanciamento. Si consiglia un ribilanciamento annuale.`
        });
      } else if (monthsSince >= 6 && significantDeviations.length > 0) {
        alerts.push({
          type: 'time',
          severity: 'medium',
          title: 'Ribilanciamento Semestrale Consigliato',
          message: `Sono passati ${monthsSince} mesi dall'ultimo ribilanciamento e sono presenti scostamenti significativi.`
        });
      }
    }

    return alerts;
  };

  const handleMarkRebalanced = () => {
    localStorage.setItem('last_rebalancing_date', new Date().toISOString());
    alert('✓ Ribilanciamento registrato!');
    loadData();
  };

  if (!strategy) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <RefreshCcw className="w-8 h-8 text-primary-600" />
            Ribilanciamento
          </h1>
          <p className="text-gray-600 mt-1">Analizza e ribilancia il tuo portafoglio</p>
        </div>

        <div className="card text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessuna Strategia Configurata
          </h3>
          <p className="text-gray-600 mb-6">
            Prima di utilizzare il ribilanciamento, configura la tua strategia di investimento
          </p>
          <a href="/strategy" className="btn-primary inline-flex items-center gap-2">
            <Target className="w-5 h-5" />
            Vai a Strategia
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <RefreshCcw className="w-8 h-8 text-primary-600" />
            Ribilanciamento
          </h1>
          <p className="text-gray-600 mt-1">
            Strategia: <strong>{strategy.goalName || 'Non definito'}</strong> |
            Budget mensile: <strong>€{strategy.monthlyInvestment || 0}</strong>
          </p>
        </div>
        <div className="flex gap-3">
          {/* ETF Frazionati Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Percent className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">ETF Frazionati</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={fractionalETF}
                onChange={(e) => setFractionalETF(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
            <span className="text-xs text-blue-600">{fractionalETF ? 'SI' : 'NO'}</span>
          </div>
          <button
            onClick={handleMarkRebalanced}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Segna come Ribilanciato
          </button>
        </div>
      </div>

      {/* Alerts */}
      {rebalancingAlerts.length > 0 && (
        <div className="space-y-3">
          {rebalancingAlerts.map((alert, index) => (
            <div
              key={index}
              className={`rounded-lg p-4 border ${
                alert.severity === 'high'
                  ? 'bg-danger-50 border-danger-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Bell className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  alert.severity === 'high' ? 'text-danger-600' : 'text-orange-600'
                }`} />
                <div>
                  <p className={`font-semibold ${
                    alert.severity === 'high' ? 'text-danger-900' : 'text-orange-900'
                  }`}>
                    {alert.title}
                  </p>
                  <p className={`text-sm mt-1 ${
                    alert.severity === 'high' ? 'text-danger-700' : 'text-orange-700'
                  }`}>
                    {alert.message}
                    {alert.assets && <span className="font-medium"> ({alert.assets})</span>}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Purchases Section */}
      {strategy.monthlyInvestment > 0 && nextPurchases && (
        <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Prossimi Acquisti PAC
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Suggerimenti per il prossimo investimento mensile
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Budget mensile</p>
              <p className="text-2xl font-bold text-green-600">€{strategy.monthlyInvestment}</p>
            </div>
          </div>

          {fractionalETF ? (
            // Fractional ETF: show percentage-based suggestions
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  ✅ <strong>ETF Frazionati Abilitati:</strong> Il broker permette l'acquisto di quote frazionarie.
                  Puoi investire seguendo esattamente le percentuali consigliate.
                </p>
              </div>
              {Array.isArray(nextPurchases) && nextPurchases.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {nextPurchases.map((purchase, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">{purchase.assetClass}</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          {purchase.percentageOfBudget}%
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">€{purchase.amount.toLocaleString('it-IT')}</p>
                      <p className="text-xs text-gray-500 mt-1">Quote frazionarie</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600">✓ Portfolio bilanciato! Continua con la strategia attuale.</p>
                </div>
              )}
            </div>
          ) : (
            // Non-fractional ETF: show exact shares calculation
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-700">
                  ⚠️ <strong>ETF NON Frazionati:</strong> Il broker richiede l'acquisto di quote intere.
                  Ecco la migliore approssimazione possibile con il tuo budget.
                </p>
              </div>
              {nextPurchases.purchases && nextPurchases.purchases.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {nextPurchases.purchases.map((purchase, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{purchase.assetClass}</span>
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            {purchase.shares} quote
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-orange-600">€{purchase.amount.toLocaleString('it-IT')}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Prezzo medio: €{purchase.price} | {purchase.percentageOfBudget}% budget
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-dashed border-gray-300 mt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm text-gray-600">Investito</p>
                        <p className="text-lg font-bold text-gray-900">€{nextPurchases.spent.toLocaleString('it-IT')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Residuo</p>
                        <p className="text-lg font-bold text-orange-600">€{nextPurchases.remaining.toLocaleString('it-IT')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Utilizzo Budget</p>
                        <p className="text-lg font-bold text-green-600">{nextPurchases.utilizationPercent}%</p>
                      </div>
                    </div>
                    {nextPurchases.remaining > 10 && (
                      <p className="text-xs text-orange-600 mt-3 text-center">
                        💡 Consiglia al broker di abilitare ETF frazionati per utilizzare il 100% del budget
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600">⚠️ Budget insufficiente per acquistare quote intere. Accumula per il prossimo mese o contatta il broker per ETF frazionati.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deviation Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analisi Scostamenti
        </h3>
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            ℹ️ <strong>Nota:</strong> Il ribilanciamento esclude automaticamente la liquidità (Cash) dai calcoli.
            Vengono considerati solo gli asset investiti per mantenere le proporzioni definite nella strategia.
          </p>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={deviation}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="assetClass" />
            <YAxis label={{ value: '%', angle: 0, position: 'top' }} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Bar dataKey="target" fill="#10b981" name="Obiettivo %" />
            <Bar dataKey="current" fill="#3b82f6" name="Attuale %" />
          </BarChart>
        </ResponsiveContainer>

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Asset Class</th>
                <th className="text-right">Attuale %</th>
                <th className="text-right">Obiettivo %</th>
                <th className="text-right">Scostamento</th>
                <th className="text-right">€ Differenza</th>
                <th className="text-center">Azione</th>
              </tr>
            </thead>
            <tbody>
              {deviation.map((item, index) => (
                <tr key={index}>
                  <td className="font-semibold">{item.assetClass}</td>
                  <td className="text-right">{item.current}%</td>
                  <td className="text-right">{item.target}%</td>
                  <td className={`text-right font-medium ${
                    item.difference > 0 ? 'text-primary-600' : item.difference < 0 ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {item.difference > 0 ? '+' : ''}{item.difference}%
                  </td>
                  <td className={`text-right font-medium ${
                    item.amountDifference > 0 ? 'text-primary-600' : item.amountDifference < 0 ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {item.amountDifference > 0 ? '+' : ''}€{item.amountDifference.toLocaleString('it-IT')}
                  </td>
                  <td className="text-center">
                    {item.difference > 5 && (
                      <span className="text-sm text-danger-600 font-medium">
                        🔴 Vendere
                      </span>
                    )}
                    {item.difference < -5 && (
                      <span className="text-sm text-success-600 font-medium">
                        🟢 Comprare
                      </span>
                    )}
                    {Math.abs(item.difference) <= 5 && (
                      <span className="text-sm text-gray-500">
                        ✓ OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MICRO Deviation Analysis */}
      {microDeviation.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Analisi Dettagliata MICRO Asset Class
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Distribuzione per sotto-categorie di investimento
              </p>
            </div>
          </div>

          {/* MICRO Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={microDeviation}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ microCategory, current }) => `${microCategory} (${current}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {microDeviation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
            </PieChart>
          </ResponsiveContainer>

          {/* MICRO Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Sotto-Categoria</th>
                  <th className="text-right">Valore</th>
                  <th className="text-right">Attuale %</th>
                  <th className="text-right">Target %</th>
                  <th className="text-right">Scostamento</th>
                  <th className="text-center">Stato</th>
                </tr>
              </thead>
              <tbody>
                {microDeviation.map((item, index) => (
                  <tr key={index}>
                    <td className="font-semibold">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        {item.microCategory}
                      </div>
                    </td>
                    <td className="text-right">€{item.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right">{item.current}%</td>
                    <td className="text-right">{item.target}%</td>
                    <td className={`text-right font-medium ${
                      item.difference > 0 ? 'text-primary-600' : item.difference < 0 ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {item.difference > 0 ? '+' : ''}{item.difference}%
                    </td>
                    <td className="text-center">
                      {item.status === 'ok' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                          ✓ OK
                        </span>
                      )}
                      {item.status === 'warning' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          ⚠ Attenzione
                        </span>
                      )}
                      {item.status === 'alert' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
                          🔴 Ribilancia
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-sm text-purple-700">
              {strategy && strategy.microAllocation && Object.keys(strategy.microAllocation).length > 0 ? (
                <>ℹ️ <strong>Target dalla Strategia:</strong> I target MICRO provengono dalla tua strategia salvata. <a href="/strategy" className="underline font-semibold">Modifica Strategia</a></>
              ) : (
                <>ℹ️ <strong>Target Stimati:</strong> I target delle MICRO categorie sono stimati automaticamente
                in base alla distribuzione storica dei tuoi investimenti. <a href="/strategy" className="underline font-semibold">Definisci una Strategia</a> per target precisi.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* PAC Calendar */}
      {pacCalendar.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Calendario Acquisti PAC (Prossimi 6 Mesi)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Piano di accumulo mensile: <strong>€{strategy.monthlyInvestment || 0}/mese</strong>
          </p>

          <div className="space-y-3">
            {pacCalendar.map((month, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{month.month}</h4>
                  <span className="text-sm text-gray-600">
                    Totale: <strong>€{month.total.toLocaleString('it-IT')}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {month.purchases.map((purchase, pIndex) => (
                    <div key={pIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium text-gray-700">{purchase.assetClass}</span>
                      <span className="text-sm font-bold text-primary-600">
                        €{purchase.amount.toLocaleString('it-IT')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIC Rebalancing Suggestions */}
      {picSuggestions.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Ribilanciamento Immediato (PIC)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Importi necessari per riportare immediatamente il portafoglio all'allocazione obiettivo
          </p>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset Class</th>
                  <th className="text-right">Valore Attuale</th>
                  <th className="text-right">Valore Obiettivo</th>
                  <th className="text-right">Acquisto Necessario</th>
                </tr>
              </thead>
              <tbody>
                {picSuggestions.map((item, index) => (
                  <tr key={index}>
                    <td className="font-semibold">{item.assetClass}</td>
                    <td className="text-right">
                      €{item.currentValue.toLocaleString('it-IT')}
                      <span className="text-xs text-gray-500 ml-1">({item.currentPercentage}%)</span>
                    </td>
                    <td className="text-right">
                      €{item.targetValue.toLocaleString('it-IT')}
                      <span className="text-xs text-gray-500 ml-1">({item.targetPercentage}%)</span>
                    </td>
                    <td className="text-right font-bold text-success-600">
                      +€{item.amountNeeded.toLocaleString('it-IT')}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td>TOTALE INVESTIMENTO</td>
                  <td></td>
                  <td></td>
                  <td className="text-right text-primary-600">
                    €{picSuggestions.reduce((sum, item) => sum + item.amountNeeded, 0).toLocaleString('it-IT')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deviation.length === 0 && (
        <div className="card text-center py-12">
          <RefreshCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessun Dato Disponibile
          </h3>
          <p className="text-gray-600">
            Aggiungi delle transazioni per vedere l'analisi di ribilanciamento
          </p>
        </div>
      )}
    </div>
  );
}

export default Rebalancing;
