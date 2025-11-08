import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, DollarSign, BarChart3, RefreshCw, Target, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { getTransactions, calculatePortfolio } from '../services/localStorageService';
import { fetchMultiplePrices } from '../services/priceService';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalValue: 0,
    totalCost: 0,
    totalPL: 0,
    totalPLPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    assetsCount: 0
  });
  const [portfolio, setPortfolio] = useState([]);
  const [allocationData, setAllocationData] = useState([]);
  const [subAllocationData, setSubAllocationData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [allocationComparison, setAllocationComparison] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load strategy
      const savedStrategy = localStorage.getItem('investment_strategy');
      if (savedStrategy) {
        setStrategy(JSON.parse(savedStrategy));
      }
      await updatePricesAndCalculate();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePricesAndCalculate = async () => {
    setRefreshing(true);

    // Get portfolio from transactions
    const holdings = calculatePortfolio();

    if (holdings.length === 0) {
      setStats({
        totalValue: 0,
        totalCost: 0,
        totalPL: 0,
        totalPLPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        assetsCount: 0
      });
      setPortfolio([]);
      setAllocationData([]);
      setPerformanceData([]);
      setRefreshing(false);
      return;
    }

    // Fetch current prices (skip cash - price is always 1)
    const nonCashHoldings = holdings.filter(h => !h.isCash);
    const tickers = nonCashHoldings.map(h => h.ticker);
    const categoriesMap = nonCashHoldings.reduce((acc, h) => {
      acc[h.ticker] = h.category;
      return acc;
    }, {});

    const prices = tickers.length > 0 ? await fetchMultiplePrices(tickers, categoriesMap) : {};

    // Calculate updated portfolio with current prices
    const updatedPortfolio = holdings.map(holding => {
      // For Cash: price is always 1, no price change, ROI = 0
      if (holding.isCash) {
        const marketValue = holding.quantity * 1; // price = 1
        return {
          ...holding,
          currentPrice: 1,
          marketValue,
          totalCost: marketValue,
          unrealizedPL: 0,
          roi: 0,
          dayChange: 0,
          dayChangePercent: 0
        };
      }

      // For other assets: fetch current price
      const priceData = prices[holding.ticker];
      const currentPrice = priceData?.price || holding.avgPrice;

      const marketValue = currentPrice * holding.quantity;
      const totalCost = holding.avgPrice * holding.quantity;
      const unrealizedPL = marketValue - totalCost;
      const roi = totalCost > 0 ? (unrealizedPL / totalCost) * 100 : 0;

      return {
        ...holding,
        currentPrice,
        marketValue,
        totalCost,
        unrealizedPL,
        roi,
        dayChange: priceData?.change || 0,
        dayChangePercent: priceData?.changePercent || 0
      };
    });

    // Calculate overall stats
    const totalValue = updatedPortfolio.reduce((sum, p) => sum + p.marketValue, 0);
    const totalCost = updatedPortfolio.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPL = totalValue - totalCost;
    const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
    const dayChange = updatedPortfolio.reduce((sum, p) => sum + (p.dayChange * p.quantity), 0);
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    setStats({
      totalValue,
      totalCost,
      totalPL,
      totalPLPercent,
      dayChange,
      dayChangePercent,
      assetsCount: updatedPortfolio.length
    });

    setPortfolio(updatedPortfolio);

    // Prepare allocation data (by category)
    const categoryTotals = updatedPortfolio.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + p.marketValue;
      return acc;
    }, {});

    const allocation = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / totalValue) * 100).toFixed(1)
    }));

    setAllocationData(allocation);

    // Prepare sub-category allocation data
    const transactions = getTransactions();
    const subCategoryTotals = {};

    transactions.forEach(tx => {
      if (tx.subCategory && tx.type === 'buy') {
        const holding = updatedPortfolio.find(p => p.ticker === tx.ticker);
        if (holding) {
          const key = `${tx.subCategory}`;
          subCategoryTotals[key] = (subCategoryTotals[key] || 0) + holding.marketValue;
        }
      }
    });

    const subAllocation = Object.entries(subCategoryTotals).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / totalValue) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    setSubAllocationData(subAllocation);

    // Prepare performance data (historical simulation)
    const monthlyData = calculateMonthlyPerformance(transactions, updatedPortfolio);
    setPerformanceData(monthlyData);

    // Calculate allocation comparison if strategy exists
    const savedStrategy = localStorage.getItem('investment_strategy');
    if (savedStrategy) {
      const strategyData = JSON.parse(savedStrategy);
      const comparison = calculateAllocationComparison(categoryTotals, totalValue, strategyData.assetAllocation);
      setAllocationComparison(comparison);
    }

    setRefreshing(false);
  };

  const calculateAllocationComparison = (categoryTotals, totalValue, targetAllocation) => {
    // Create comparison array with all asset classes
    const assetClasses = Object.keys(targetAllocation);

    return assetClasses.map(assetClass => {
      const currentValue = categoryTotals[assetClass] || 0;
      const currentPercentage = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const targetPercentage = targetAllocation[assetClass];
      const difference = currentPercentage - targetPercentage;

      return {
        assetClass,
        current: parseFloat(currentPercentage.toFixed(2)),
        target: parseFloat(targetPercentage),
        difference: parseFloat(difference.toFixed(2)),
        status: Math.abs(difference) < 2 ? 'ok' : Math.abs(difference) < 5 ? 'warning' : 'alert'
      };
    });
  };

  const calculateMonthlyPerformance = (transactions, currentPortfolio) => {
    // Simple simulation: group transactions by month
    const months = {};

    transactions.forEach(tx => {
      const monthKey = format(new Date(tx.date), 'MMM yyyy');
      if (!months[monthKey]) {
        months[monthKey] = { month: monthKey, invested: 0 };
      }
      if (tx.type === 'buy') {
        months[monthKey].invested += tx.quantity * tx.price;
      } else if (tx.type === 'sell') {
        months[monthKey].invested -= tx.quantity * tx.price;
      }
    });

    // Calculate cumulative and current value estimation
    let cumulative = 0;
    return Object.values(months).map((m, index) => {
      cumulative += m.invested;
      // Simple ROI simulation based on current portfolio performance
      const currentValue = cumulative * (1 + (stats.totalPLPercent / 100));
      return {
        month: m.month,
        invested: cumulative,
        value: currentValue
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  const hasData = portfolio.length > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Panoramica del tuo portafoglio</p>
        </div>
        {hasData && (
          <button
            onClick={() => updatePricesAndCalculate()}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Aggiorna Prezzi
          </button>
        )}
      </div>

      {!hasData ? (
        <div className="card text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessuna transazione trovata
          </h3>
          <p className="text-gray-600 mb-6">
            Inizia aggiungendo la tua prima transazione per vedere le statistiche
          </p>
          <a href="/transactions/new" className="btn-primary inline-flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Aggiungi Transazione
          </a>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Value */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Valore Totale</span>
                <DollarSign className="w-5 h-5 text-primary-600" />
              </div>
              <div className="stat-value">€{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.assetsCount} asset{stats.assetsCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Total P/L */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Profitto/Perdita</span>
                {stats.totalPL >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger-600" />
                )}
              </div>
              <div className={`stat-value ${stats.totalPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stats.totalPL >= 0 ? '+' : ''}€{stats.totalPL.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`stat-change ${stats.totalPLPercent >= 0 ? 'positive' : 'negative'}`}>
                {stats.totalPLPercent >= 0 ? '+' : ''}{stats.totalPLPercent.toFixed(2)}%
              </div>
            </div>

            {/* Day Change */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Variazione Oggi</span>
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <div className={`stat-value ${stats.dayChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stats.dayChange >= 0 ? '+' : ''}€{stats.dayChange.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`stat-change ${stats.dayChangePercent >= 0 ? 'positive' : 'negative'}`}>
                {stats.dayChangePercent >= 0 ? '+' : ''}{stats.dayChangePercent.toFixed(2)}%
              </div>
            </div>

            {/* Total Invested */}
            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label">Totale Investito</span>
                <Wallet className="w-5 h-5 text-primary-600" />
              </div>
              <div className="stat-value">€{stats.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-500 mt-1">
                Costo medio
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Allocation Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Allocazione per Categoria
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Andamento Portafoglio
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" name="Valore Attuale" />
                  <Area type="monotone" dataKey="invested" stroke="#10b981" fillOpacity={1} fill="url(#colorInvested)" name="Investito" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-Category Allocation */}
          {subAllocationData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Allocazione per Sotto-Categoria
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={subAllocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subAllocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subAllocationData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-600">{item.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Allocation Comparison with Target */}
          {strategy && allocationComparison.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-600" />
                    Confronto Allocazione: Attuale vs Obiettivo
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Obiettivo: {strategy.goalName || 'Non definito'}
                  </p>
                </div>
                <a href="/strategy" className="btn-secondary text-sm">
                  Modifica Strategia
                </a>
              </div>

              {/* Bar Chart Comparison */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={allocationComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="assetClass" />
                  <YAxis label={{ value: '%', angle: 0, position: 'top' }} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="current" fill="#3b82f6" name="Attuale %" />
                  <Bar dataKey="target" fill="#10b981" name="Obiettivo %" />
                </BarChart>
              </ResponsiveContainer>

              {/* Detailed Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Asset Class</th>
                      <th className="text-right">Attuale %</th>
                      <th className="text-right">Obiettivo %</th>
                      <th className="text-right">Scostamento</th>
                      <th className="text-center">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationComparison.map((item, index) => (
                      <tr key={index}>
                        <td className="font-semibold">{item.assetClass}</td>
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

              {/* Alert if rebalancing needed */}
              {allocationComparison.some(item => item.status === 'alert') && (
                <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Ribilanciamento Consigliato</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Alcune asset class si sono discostate significativamente dall'obiettivo.
                        Visita la pagina <a href="/rebalancing" className="underline font-medium">Ribilanciamento</a> per
                        vedere i suggerimenti di acquisto/vendita.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Top Holdings */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Holdings
            </h3>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th className="text-right">Quantità</th>
                    <th className="text-right">Valore</th>
                    <th className="text-right">P/L</th>
                    <th className="text-right">ROI %</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio
                    .sort((a, b) => b.marketValue - a.marketValue)
                    .slice(0, 10)
                    .map((holding, index) => (
                      <tr key={index}>
                        <td className="font-semibold">{holding.ticker}</td>
                        <td className="text-gray-600">{holding.name}</td>
                        <td>
                          <span className="badge badge-primary">{holding.category}</span>
                        </td>
                        <td className="text-right">{holding.quantity.toFixed(4)}</td>
                        <td className="text-right font-medium">
                          €{holding.marketValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right font-medium ${holding.unrealizedPL >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {holding.unrealizedPL >= 0 ? '+' : ''}€{holding.unrealizedPL.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`text-right font-medium ${holding.roi >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {holding.roi >= 0 ? '+' : ''}{holding.roi.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
