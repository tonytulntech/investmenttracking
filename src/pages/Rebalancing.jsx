import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, TrendingUp, TrendingDown, Calendar, DollarSign, Target, Bell, Percent, ShoppingCart, Layers, EyeOff, Eye, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { calculatePortfolio, getTransactions } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { format, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';

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
  const [fractionalETF, setFractionalETF] = useState(true);
  const [nextPurchases, setNextPurchases] = useState([]);
  const [wholeUnitCalendar, setWholeUnitCalendar] = useState([]);
  const [hideOutOfStrategy, setHideOutOfStrategy] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (portfolio.length > 0 && strategy) {
      const budget = parseFloat(monthlyBudget) || parseFloat(strategy.monthlyInvestment) || 0;

      if (!fractionalETF) {
        // Calculate 12-month whole unit calendar
        const calendar = calculate12MonthWholeUnitCalendar(portfolio, strategy, budget);
        setWholeUnitCalendar(calendar);
      } else {
        setWholeUnitCalendar([]);
      }

      const smartPurchases = calculateSmartPurchases(portfolio, deviation, budget, fractionalETF);
      setNextPurchases(smartPurchases);
    }
  }, [fractionalETF, portfolio, deviation, strategy, monthlyBudget]);

  const loadData = async () => {
    const saved = localStorage.getItem('investment_strategy');
    if (saved) {
      const strategyData = JSON.parse(saved);
      setStrategy(strategyData);
      setMonthlyBudget(parseFloat(strategyData.monthlyInvestment) || 0);

      const holdings = calculatePortfolio();
      const nonCashHoldings = holdings.filter(h => !h.isCash);
      const tickers = nonCashHoldings.map(h => h.ticker);
      const categoriesMap = nonCashHoldings.reduce((acc, h) => {
        acc[h.ticker] = h.macroCategory || h.category;
        return acc;
      }, {});

      const prices = tickers.length > 0 ? await fetchMultiplePrices(tickers, categoriesMap) : {};

      const updatedPortfolio = holdings.map(holding => {
        if (holding.isCash) {
          return {
            ...holding,
            currentPrice: 1,
            marketValue: holding.totalCost
          };
        }

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

      const deviations = calculateDeviation(updatedPortfolio, strategyData);
      setDeviation(deviations);

      const transactions = getTransactions();
      const microDeviations = calculateMicroDeviation(updatedPortfolio, transactions, strategyData);
      setMicroDeviation(microDeviations);

      const calendar = calculatePACCalendar(deviations, strategyData);
      setPacCalendar(calendar);

      const picAmounts = calculatePICAmounts(deviations, updatedPortfolio);
      setPicSuggestions(picAmounts);

      const budget = parseFloat(strategyData.monthlyInvestment) || 0;
      const smartPurchases = calculateSmartPurchases(updatedPortfolio, deviations, budget, fractionalETF);
      setNextPurchases(smartPurchases);

      const alerts = checkRebalancingAlerts(deviations, strategyData);
      setRebalancingAlerts(alerts);
    }
  };

  const calculateDeviation = (holdings, strategyData) => {
    const investableHoldings = holdings.filter(h => !h.isCash);
    const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    const categoryTotals = {};
    investableHoldings.forEach(h => {
      const category = h.macroCategory || h.category;
      categoryTotals[category] = (categoryTotals[category] || 0) + (h.marketValue || 0);
    });

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
    }).filter(d => d.target > 0);
  };

  const calculateMicroDeviation = (holdings, transactions, strategy) => {
    const investableHoldings = holdings.filter(h => !h.isCash);
    const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    // Group holdings by ticker for detailed view
    const tickerData = {};
    investableHoldings.forEach(h => {
      const key = h.ticker;
      if (!tickerData[key]) {
        tickerData[key] = {
          ticker: h.ticker,
          name: h.name || h.ticker,
          microCategory: h.microCategory || h.subCategory || 'Non categorizzato',
          macroCategory: h.macroCategory || h.category,
          value: 0,
          currentPrice: h.currentPrice,
          quantity: 0
        };
      }
      tickerData[key].value += h.marketValue || 0;
      tickerData[key].quantity += h.quantity || 0;
    });

    // Get target allocations from Strategy
    const hasStrategyTargets = strategy && strategy.microAllocation && Object.keys(strategy.microAllocation).length > 0;
    const microTargets = hasStrategyTargets ? strategy.microAllocation : {};

    // Group by micro category
    const microTotals = {};
    Object.values(tickerData).forEach(t => {
      const micro = t.microCategory;
      if (!microTotals[micro]) {
        microTotals[micro] = {
          microCategory: micro,
          value: 0,
          tickers: []
        };
      }
      microTotals[micro].value += t.value;
      microTotals[micro].tickers.push(t);
    });

    // Combine all MICRO categories (both current and target)
    const allMicroCategories = new Set([
      ...Object.keys(microTotals),
      ...Object.keys(microTargets)
    ]);

    return Array.from(allMicroCategories).map(microCategory => {
      const data = microTotals[microCategory] || { value: 0, tickers: [] };
      const value = data.value;
      const currentPercentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const targetPercentage = microTargets[microCategory] || 0;
      const difference = currentPercentage - targetPercentage;

      // Determine status
      let status = 'ok';
      let statusLabel = '✓ OK';
      let statusColor = 'bg-success-100 text-success-700';
      let actionNote = '';

      if (targetPercentage === 0 && value > 0) {
        // Asset not in strategy but has value
        status = 'out_of_strategy';
        statusLabel = '🟡 Non in strategia';
        statusColor = 'bg-yellow-100 text-yellow-700';
        actionNote = 'Considera vendita graduale o mantenimento';
      } else if (Math.abs(difference) >= 10) {
        status = 'alert';
        statusLabel = difference > 0 ? '🔴 Vendere' : '🟢 Comprare';
        statusColor = difference > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
      } else if (Math.abs(difference) >= 5) {
        status = 'warning';
        statusLabel = '⚠ Attenzione';
        statusColor = 'bg-orange-100 text-orange-700';
      }

      return {
        microCategory,
        current: parseFloat(currentPercentage.toFixed(2)),
        target: parseFloat(targetPercentage.toFixed(2)),
        difference: parseFloat(difference.toFixed(2)),
        value,
        tickers: data.tickers || [],
        status,
        statusLabel,
        statusColor,
        actionNote,
        hasTarget: targetPercentage > 0,
        isOutOfStrategy: targetPercentage === 0 && value > 0
      };
    })
    .filter(d => d.current > 0 || d.target > 0)
    .sort((a, b) => {
      // Sort: out of strategy first, then by value
      if (a.isOutOfStrategy && !b.isOutOfStrategy) return -1;
      if (!a.isOutOfStrategy && b.isOutOfStrategy) return 1;
      return b.value - a.value;
    });
  };

  const calculate12MonthWholeUnitCalendar = (portfolio, strategy, budget) => {
    if (budget <= 0 || !strategy.microAllocation) return [];

    const investableHoldings = portfolio.filter(h => !h.isCash);

    // Get ticker info from holdings
    const tickerInfo = {};
    investableHoldings.forEach(h => {
      if (!tickerInfo[h.ticker]) {
        tickerInfo[h.ticker] = {
          ticker: h.ticker,
          name: h.name || h.ticker,
          microCategory: h.microCategory || h.subCategory,
          macroCategory: h.macroCategory || h.category,
          currentPrice: h.currentPrice || h.avgPrice,
          quantity: h.quantity
        };
      }
    });

    // Map micro categories to tickers
    const microToTickers = {};
    Object.values(tickerInfo).forEach(t => {
      const micro = t.microCategory;
      if (micro && strategy.microAllocation[micro] !== undefined) {
        if (!microToTickers[micro]) {
          microToTickers[micro] = [];
        }
        microToTickers[micro].push(t);
      }
    });

    // Calculate target allocations for each ticker
    const tickerTargets = [];
    Object.entries(strategy.microAllocation).forEach(([micro, targetPct]) => {
      if (targetPct > 0) {
        const tickers = microToTickers[micro] || [];
        if (tickers.length > 0) {
          // Distribute target equally among tickers in this micro category
          const pctPerTicker = targetPct / tickers.length;
          tickers.forEach(t => {
            tickerTargets.push({
              ticker: t.ticker,
              name: t.name,
              targetPct: pctPerTicker,
              price: t.currentPrice,
              microCategory: micro
            });
          });
        }
      }
    });

    if (tickerTargets.length === 0) return [];

    // Generate 12-month calendar
    const calendar = [];
    let accumulatedRemainder = 0;

    for (let month = 1; month <= 12; month++) {
      const date = addMonths(new Date(), month);
      const effectiveBudget = budget + accumulatedRemainder;

      const purchases = [];
      let totalSpent = 0;

      // Calculate ideal allocation and whole units for each ticker
      const tickerPurchases = tickerTargets.map(t => {
        const idealAmount = effectiveBudget * (t.targetPct / 100);
        const wholeUnits = Math.floor(idealAmount / t.price);
        const actualAmount = wholeUnits * t.price;
        return {
          ...t,
          idealAmount,
          wholeUnits,
          actualAmount,
          remainder: idealAmount - actualAmount
        };
      }).filter(p => p.wholeUnits > 0);

      // Sort by remainder descending to prioritize underserved tickers
      tickerPurchases.sort((a, b) => b.remainder - a.remainder);

      tickerPurchases.forEach(p => {
        purchases.push({
          ticker: p.ticker,
          name: p.name,
          microCategory: p.microCategory,
          units: p.wholeUnits,
          price: p.price,
          amount: p.actualAmount
        });
        totalSpent += p.actualAmount;
      });

      const remainder = effectiveBudget - totalSpent;
      accumulatedRemainder = remainder;

      calendar.push({
        month: format(date, 'MMM yyyy', { locale: it }),
        monthFull: format(date, 'MMMM yyyy', { locale: it }),
        monthNumber: month,
        budget: effectiveBudget,
        purchases,
        totalSpent,
        remainder,
        utilizationPercent: effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0
      });
    }

    return calendar;
  };

  const calculateSmartPurchases = (portfolio, deviations, budget, fractional) => {
    if (fractional) {
      const underweight = deviations.filter(d => d.difference < -2);
      const totalUnderweight = underweight.reduce((sum, d) => sum + Math.abs(d.difference), 0);

      return underweight.map(d => ({
        assetClass: d.assetClass,
        amount: totalUnderweight > 0
          ? parseFloat((budget * (Math.abs(d.difference) / totalUnderweight)).toFixed(2))
          : 0,
        percentageOfBudget: totalUnderweight > 0
          ? parseFloat(((Math.abs(d.difference) / totalUnderweight) * 100).toFixed(1))
          : 0,
        shares: null
      }));
    }

    const holdings = portfolio.filter(h => !h.isCash);
    const underweight = deviations.filter(d => d.difference < -2);

    if (underweight.length === 0) {
      return deviations
        .filter(d => d.target > 0)
        .map(d => {
          const holdingsInClass = holdings.filter(h => (h.macroCategory || h.category) === d.assetClass);
          const avgPrice = holdingsInClass.length > 0
            ? holdingsInClass.reduce((sum, h) => sum + h.currentPrice, 0) / holdingsInClass.length
            : 100;

          const targetAmount = budget * (d.target / 100);
          const shares = Math.floor(targetAmount / avgPrice);
          const actualAmount = shares * avgPrice;

          return {
            assetClass: d.assetClass,
            price: parseFloat(avgPrice.toFixed(2)),
            shares,
            amount: parseFloat(actualAmount.toFixed(2)),
            percentageOfBudget: budget > 0 ? parseFloat(((actualAmount / budget) * 100).toFixed(1)) : 0
          };
        })
        .filter(p => p.shares > 0);
    }

    const totalUnderweight = underweight.reduce((sum, d) => sum + Math.abs(d.difference), 0);

    const purchases = underweight.map(d => {
      const holdingsInClass = holdings.filter(h => (h.macroCategory || h.category) === d.assetClass);
      const avgPrice = holdingsInClass.length > 0
        ? holdingsInClass.reduce((sum, h) => sum + h.currentPrice, 0) / holdingsInClass.length
        : 50;

      const targetAmount = budget * (Math.abs(d.difference) / totalUnderweight);
      const shares = Math.floor(targetAmount / avgPrice);
      const actualAmount = shares * avgPrice;

      return {
        assetClass: d.assetClass,
        price: parseFloat(avgPrice.toFixed(2)),
        shares,
        amount: parseFloat(actualAmount.toFixed(2)),
        percentageOfBudget: budget > 0 ? parseFloat(((actualAmount / budget) * 100).toFixed(1)) : 0,
        remaining: parseFloat((targetAmount - actualAmount).toFixed(2))
      };
    }).filter(p => p.shares > 0);

    const spent = purchases.reduce((sum, p) => sum + p.amount, 0);
    const remaining = budget - spent;

    return {
      purchases,
      spent: parseFloat(spent.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      utilizationPercent: budget > 0 ? parseFloat(((spent / budget) * 100).toFixed(1)) : 0
    };
  };

  const calculatePACCalendar = (deviations, strategyData) => {
    const monthlyAmount = parseFloat(strategyData.monthlyInvestment) || 0;
    if (monthlyAmount === 0) return [];

    const calendar = [];
    const needsRebalancing = deviations.filter(d => d.difference < -2);

    for (let month = 1; month <= 12; month++) {
      const date = addMonths(new Date(), month);
      const purchases = [];

      const totalUnderweight = needsRebalancing.reduce((sum, d) => sum + Math.abs(d.difference), 0);

      if (totalUnderweight > 0) {
        needsRebalancing.forEach(d => {
          const proportion = Math.abs(d.difference) / totalUnderweight;
          const amount = monthlyAmount * proportion;
          if (amount >= 10) {
            purchases.push({
              assetClass: d.assetClass,
              amount: parseFloat(amount.toFixed(2))
            });
          }
        });
      } else {
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
        month: format(date, 'MMM yyyy', { locale: it }),
        monthNumber: month,
        purchases,
        total: purchases.reduce((sum, p) => sum + p.amount, 0)
      });
    }

    return calendar.slice(0, 6);
  };

  const calculatePICAmounts = (deviations, holdings) => {
    const investableHoldings = holdings.filter(h => !h.isCash);
    const totalValue = investableHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

    return deviations
      .filter(d => d.difference < -1)
      .map(d => {
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

  // Get summary of 12-month calendar
  const getCalendarSummary = () => {
    if (wholeUnitCalendar.length === 0) return null;

    const tickerTotals = {};
    let totalInvested = 0;
    let totalRemainder = 0;

    wholeUnitCalendar.forEach(month => {
      month.purchases.forEach(p => {
        if (!tickerTotals[p.ticker]) {
          tickerTotals[p.ticker] = { ticker: p.ticker, name: p.name, units: 0, amount: 0 };
        }
        tickerTotals[p.ticker].units += p.units;
        tickerTotals[p.ticker].amount += p.amount;
        totalInvested += p.amount;
      });
      totalRemainder = month.remainder; // Last month's remainder
    });

    return {
      tickerTotals: Object.values(tickerTotals).sort((a, b) => b.amount - a.amount),
      totalInvested,
      totalRemainder,
      avgUtilization: wholeUnitCalendar.reduce((sum, m) => sum + m.utilizationPercent, 0) / wholeUnitCalendar.length
    };
  };

  const outOfStrategyAssets = microDeviation.filter(d => d.isOutOfStrategy);
  const inStrategyAssets = microDeviation.filter(d => !d.isOutOfStrategy);
  const displayedMicroDeviation = hideOutOfStrategy ? inStrategyAssets : microDeviation;

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

  const calendarSummary = getCalendarSummary();

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <RefreshCcw className="w-8 h-8 text-primary-600" />
            Ribilanciamento
          </h1>
          <p className="text-gray-600 mt-1">
            Strategia: <strong>{strategy.goalName || 'Non definito'}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* ETF Frazionati Toggle */}
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-900">ETF Frazionati?</span>
            <div className="flex bg-white rounded-lg border border-blue-300 overflow-hidden">
              <button
                onClick={() => setFractionalETF(true)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  fractionalETF ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-100'
                }`}
              >
                SÌ
              </button>
              <button
                onClick={() => setFractionalETF(false)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  !fractionalETF ? 'bg-orange-600 text-white' : 'text-orange-700 hover:bg-orange-100'
                }`}
              >
                NO
              </button>
            </div>
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

      {/* Budget Input */}
      <div className="card bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Mensile PAC
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">€</span>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(parseFloat(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="50"
                />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Prezzi al: <strong>{format(new Date(), 'dd/MM/yyyy', { locale: it })}</strong></p>
              <p className="text-xs text-gray-500">Aggiornati da Yahoo Finance</p>
            </div>
          </div>
          {!fractionalETF && (
            <div className="bg-orange-100 border border-orange-300 rounded-lg px-4 py-2">
              <p className="text-sm text-orange-800 font-medium">
                ⚠️ Modalità Quote Intere (Fineco, Directa, ecc.)
              </p>
              <p className="text-xs text-orange-700">
                I calcoli mostrano quote intere acquistabili
              </p>
            </div>
          )}
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

      {/* 12-Month Whole Unit Calendar (NON-fractional only) */}
      {!fractionalETF && wholeUnitCalendar.length > 0 && (
        <div className="card border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Calendario Acquisti PAC - Quote Intere (12 Mesi)
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Budget mensile: <strong>€{monthlyBudget.toLocaleString('it-IT')}</strong> |
                Suggerimenti con quote intere acquistabili
              </p>
            </div>
          </div>

          {/* Monthly Calendar */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {wholeUnitCalendar.map((month, index) => (
              <div key={index} className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 text-lg">{month.monthFull}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 font-medium">
                      Investito: €{month.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                    {month.remainder > 0 && (
                      <span className="text-orange-600">
                        Resto: €{month.remainder.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      month.utilizationPercent >= 95 ? 'bg-green-100 text-green-700' :
                      month.utilizationPercent >= 80 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {month.utilizationPercent.toFixed(0)}% utilizzato
                    </span>
                  </div>
                </div>

                {month.purchases.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {month.purchases.map((purchase, pIndex) => (
                      <div key={pIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div>
                          <span className="font-semibold text-gray-900">{purchase.ticker}</span>
                          <span className="text-xs text-gray-500 ml-2">@€{purchase.price.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-orange-600">{purchase.units} quote</span>
                          <span className="text-sm text-gray-600 ml-2">
                            (€{purchase.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">Budget insufficiente per quote intere questo mese</p>
                )}
              </div>
            ))}
          </div>

          {/* 12-Month Summary */}
          {calendarSummary && (
            <div className="mt-4 bg-white rounded-lg p-4 border-2 border-orange-300">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                📊 Riepilogo 12 Mesi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Quote accumulate per ticker:</p>
                  <div className="space-y-1">
                    {calendarSummary.tickerTotals.map((t, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="font-medium">{t.ticker}</span>
                        <span>
                          <strong>{t.units}</strong> quote
                          <span className="text-gray-500 ml-1">
                            (€{t.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })})
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Totale Investito</p>
                      <p className="text-lg font-bold text-green-600">
                        €{calendarSummary.totalInvested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Utilizzo Medio</p>
                      <p className="text-lg font-bold text-blue-600">
                        {calendarSummary.avgUtilization.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ⚠️ I calcoli usano prezzi attuali. Verifica sempre prima di acquistare.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next Purchases Section (Fractional) */}
      {fractionalETF && monthlyBudget > 0 && nextPurchases && (
        <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Prossimi Acquisti PAC
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Suggerimenti per il prossimo investimento mensile (quote frazionarie)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Budget mensile</p>
              <p className="text-2xl font-bold text-green-600">€{monthlyBudget.toLocaleString('it-IT')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700">
                ✅ <strong>ETF Frazionati Abilitati:</strong> Il broker permette l'acquisto di quote frazionarie.
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
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600">✓ Portfolio bilanciato! Continua con la strategia attuale.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deviation Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analisi Scostamenti MACRO
        </h3>
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            ℹ️ <strong>Nota:</strong> Il ribilanciamento esclude automaticamente la liquidità (Cash) dai calcoli.
          </p>
        </div>

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
                      <span className="text-sm text-danger-600 font-medium">🔴 Vendere</span>
                    )}
                    {item.difference < -5 && (
                      <span className="text-sm text-success-600 font-medium">🟢 Comprare</span>
                    )}
                    {Math.abs(item.difference) <= 5 && (
                      <span className="text-sm text-gray-500">✓ OK</span>
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
                Analisi Dettagliata MICRO
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Distribuzione per sotto-categorie di investimento
              </p>
            </div>
            <div className="flex items-center gap-3">
              {outOfStrategyAssets.length > 0 && (
                <button
                  onClick={() => setHideOutOfStrategy(!hideOutOfStrategy)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    hideOutOfStrategy
                      ? 'bg-gray-100 border-gray-300 text-gray-700'
                      : 'bg-yellow-50 border-yellow-300 text-yellow-700'
                  }`}
                >
                  {hideOutOfStrategy ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {hideOutOfStrategy ? 'Mostra' : 'Nascondi'} fuori strategia ({outOfStrategyAssets.length})
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Out of Strategy Warning */}
          {outOfStrategyAssets.length > 0 && !hideOutOfStrategy && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">
                    {outOfStrategyAssets.length} asset non {outOfStrategyAssets.length === 1 ? 'è' : 'sono'} nella strategia attuale
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Questi asset hanno target 0% ma sono ancora presenti nel portafoglio.
                    Considera una vendita graduale o mantienili se preferisci.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MICRO Table */}
          <div className="overflow-x-auto">
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
                {displayedMicroDeviation.map((item, index) => (
                  <tr key={index} className={item.isOutOfStrategy ? 'bg-yellow-50' : ''}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <span className="font-semibold">{item.microCategory}</span>
                          {item.tickers.length > 0 && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({item.tickers.map(t => t.ticker).join(', ')})
                            </span>
                          )}
                        </div>
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
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.statusColor}`}>
                          {item.statusLabel}
                        </span>
                        {item.actionNote && (
                          <span className="text-xs text-gray-500 italic">{item.actionNote}</span>
                        )}
                      </div>
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
                <>ℹ️ <strong>Target Stimati:</strong> I target sono stimati dalla distribuzione storica. <a href="/strategy" className="underline font-semibold">Definisci una Strategia</a> per target precisi.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* PAC Calendar (Fractional only) */}
      {fractionalETF && pacCalendar.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Calendario Acquisti PAC (Prossimi 6 Mesi)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Piano di accumulo mensile: <strong>€{monthlyBudget.toLocaleString('it-IT')}/mese</strong>
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
