import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart as PieIcon, BarChart3, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getTransactions, calculatePortfolio } from '../services/localStorageService';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isAfter, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';

function PortfolioPerformance() {
  const [loading, setLoading] = useState(true);
  const [monthlyGrowth, setMonthlyGrowth] = useState([]);
  const [statistics, setStatistics] = useState({
    totalAssets: 0,
    totalValue: 0,
    totalInvested: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    avgMonthlyReturn: 0,
    bestMonth: null,
    worstMonth: null,
    avgPurchasePrice: 0,
    currentAvgPrice: 0
  });

  useEffect(() => {
    calculatePerformance();
  }, []);

  const calculatePerformance = () => {
    setLoading(true);

    try {
      const transactions = getTransactions();
      const currentPortfolio = calculatePortfolio();

      if (transactions.length === 0) {
        setLoading(false);
        return;
      }

      // Get date range
      const sortedTransactions = transactions
        .filter(tx => tx.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (sortedTransactions.length === 0) {
        setLoading(false);
        return;
      }

      const firstDate = parseISO(sortedTransactions[0].date);
      const lastDate = new Date();

      // Get all months between first transaction and now
      const months = eachMonthOfInterval({ start: firstDate, end: lastDate });

      // Calculate portfolio value for each month
      const monthlyData = months.map(monthDate => {
        const monthEnd = endOfMonth(monthDate);

        // Get all transactions up to this month
        const txUpToMonth = transactions.filter(tx => {
          const txDate = parseISO(tx.date);
          return !isAfter(txDate, monthEnd);
        });

        // Calculate holdings at end of month
        const holdings = {};
        let cashDeposits = 0;
        let cashWithdrawals = 0;

        txUpToMonth.forEach(tx => {
          if (tx.isCash || tx.macroCategory === 'Cash') {
            if (tx.type === 'buy') {
              cashDeposits += tx.quantity * tx.price;
            } else if (tx.type === 'sell') {
              cashWithdrawals += tx.quantity * tx.price;
            }
          } else {
            if (!holdings[tx.ticker]) {
              holdings[tx.ticker] = {
                quantity: 0,
                totalCost: 0,
                category: tx.macroCategory || tx.category || 'Altro'
              };
            }

            if (tx.type === 'buy') {
              holdings[tx.ticker].quantity += tx.quantity;
              holdings[tx.ticker].totalCost += tx.quantity * tx.price + (tx.commission || 0);
            } else if (tx.type === 'sell') {
              holdings[tx.ticker].quantity -= tx.quantity;
              holdings[tx.ticker].totalCost -= tx.quantity * tx.price - (tx.commission || 0);
            }
          }
        });

        // Calculate current value by category
        const categoryValues = {
          Cash: cashDeposits - cashWithdrawals,
          ETF: 0,
          Crypto: 0,
          Azioni: 0,
          Obbligazioni: 0,
          Altro: 0
        };

        // For each holding, estimate value using current portfolio data
        Object.entries(holdings).forEach(([ticker, holding]) => {
          if (holding.quantity > 0) {
            const currentHolding = currentPortfolio.find(p => p.ticker === ticker);
            if (currentHolding) {
              // Use current price to estimate historical value
              const estimatedValue = holding.quantity * currentHolding.currentPrice;
              const category = holding.category || 'Altro';

              if (categoryValues[category] !== undefined) {
                categoryValues[category] += estimatedValue;
              } else {
                categoryValues.Altro += estimatedValue;
              }
            }
          }
        });

        return {
          month: format(monthDate, 'MMM yyyy', { locale: it }),
          date: monthDate,
          Cash: Math.round(categoryValues.Cash),
          ETF: Math.round(categoryValues.ETF),
          Crypto: Math.round(categoryValues.Crypto),
          Azioni: Math.round(categoryValues.Azioni),
          Obbligazioni: Math.round(categoryValues.Obbligazioni),
          Altro: Math.round(categoryValues.Altro),
          total: Math.round(
            categoryValues.Cash +
            categoryValues.ETF +
            categoryValues.Crypto +
            categoryValues.Azioni +
            categoryValues.Obbligazioni +
            categoryValues.Altro
          )
        };
      });

      setMonthlyGrowth(monthlyData);

      // Calculate statistics
      const totalValue = currentPortfolio.reduce((sum, p) => sum + (p.marketValue || 0), 0);
      const totalInvested = currentPortfolio.reduce((sum, p) => sum + (p.totalCost || 0), 0);
      const totalReturn = totalValue - totalInvested;
      const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

      // Monthly returns
      const monthlyReturns = [];
      for (let i = 1; i < monthlyData.length; i++) {
        const prevTotal = monthlyData[i - 1].total;
        const currTotal = monthlyData[i].total;
        if (prevTotal > 0) {
          monthlyReturns.push({
            month: monthlyData[i].month,
            return: ((currTotal - prevTotal) / prevTotal) * 100
          });
        }
      }

      const avgMonthlyReturn = monthlyReturns.length > 0
        ? monthlyReturns.reduce((sum, r) => sum + r.return, 0) / monthlyReturns.length
        : 0;

      const bestMonth = monthlyReturns.length > 0
        ? monthlyReturns.reduce((max, r) => r.return > max.return ? r : max, monthlyReturns[0])
        : null;

      const worstMonth = monthlyReturns.length > 0
        ? monthlyReturns.reduce((min, r) => r.return < min.return ? r : min, monthlyReturns[0])
        : null;

      // Average prices
      const avgPurchasePrice = currentPortfolio
        .filter(p => !p.isCash && p.quantity > 0)
        .reduce((sum, p) => sum + p.avgPrice, 0) /
        Math.max(currentPortfolio.filter(p => !p.isCash && p.quantity > 0).length, 1);

      const currentAvgPrice = currentPortfolio
        .filter(p => !p.isCash && p.quantity > 0)
        .reduce((sum, p) => sum + (p.currentPrice || p.avgPrice), 0) /
        Math.max(currentPortfolio.filter(p => !p.isCash && p.quantity > 0).length, 1);

      setStatistics({
        totalAssets: currentPortfolio.filter(p => !p.isCash).length,
        totalValue,
        totalInvested,
        totalReturn,
        totalReturnPercent,
        avgMonthlyReturn,
        bestMonth,
        worstMonth,
        avgPurchasePrice,
        currentAvgPrice
      });

    } catch (error) {
      console.error('Error calculating performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento dati performance...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          <p className="text-sm font-bold text-gray-900 mt-2 pt-2 border-t">
            Totale: {formatCurrency(total)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Andamento Portafoglio</h1>
        <p className="text-gray-600 mt-1">Analisi dettagliata della performance e crescita del patrimonio</p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Valore Totale</span>
            <DollarSign className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(statistics.totalValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {statistics.totalAssets} asset
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Rendimento Totale</span>
            {statistics.totalReturn >= 0 ? (
              <TrendingUp className="w-5 h-5 text-success-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger-600" />
            )}
          </div>
          <div className={`text-2xl font-bold ${statistics.totalReturn >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {statistics.totalReturn >= 0 ? '+' : ''}{formatCurrency(statistics.totalReturn)}
          </div>
          <div className={`text-xs mt-1 ${statistics.totalReturnPercent >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {statistics.totalReturnPercent >= 0 ? '+' : ''}{statistics.totalReturnPercent.toFixed(2)}%
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Rendimento Medio Mensile</span>
            <Activity className="w-5 h-5 text-primary-600" />
          </div>
          <div className={`text-2xl font-bold ${statistics.avgMonthlyReturn >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
            {statistics.avgMonthlyReturn >= 0 ? '+' : ''}{statistics.avgMonthlyReturn.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Media mensile
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Prezzo Medio</span>
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(statistics.currentAvgPrice)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Acquisto: {formatCurrency(statistics.avgPurchasePrice)}
          </div>
        </div>
      </div>

      {/* Best/Worst Month */}
      {(statistics.bestMonth || statistics.worstMonth) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {statistics.bestMonth && (
            <div className="card bg-green-50 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Miglior Mese</p>
                  <p className="text-xs text-green-700">{statistics.bestMonth.month}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600">
                +{statistics.bestMonth.return.toFixed(2)}%
              </p>
            </div>
          )}

          {statistics.worstMonth && (
            <div className="card bg-red-50 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-900">Peggior Mese</p>
                  <p className="text-xs text-red-700">{statistics.worstMonth.month}</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">
                {statistics.worstMonth.return.toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stacked Bar Chart - Monthly Growth */}
      <div className="card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Crescita Mensile del Patrimonio</h3>
          <p className="text-sm text-gray-600 mt-1">Andamento del valore per categoria</p>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={monthlyGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={(value) => `€${value.toLocaleString('it-IT')}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Cash" stackId="a" fill="#10b981" name="Cash" />
            <Bar dataKey="ETF" stackId="a" fill="#3b82f6" name="ETF" />
            <Bar dataKey="Crypto" stackId="a" fill="#f59e0b" name="Crypto" />
            <Bar dataKey="Azioni" stackId="a" fill="#8b5cf6" name="Azioni" />
            <Bar dataKey="Obbligazioni" stackId="a" fill="#ec4899" name="Obbligazioni" />
            <Bar dataKey="Altro" stackId="a" fill="#6b7280" name="Altro" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart - Total Value Over Time */}
      <div className="card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Valore Totale nel Tempo</h3>
          <p className="text-sm text-gray-600 mt-1">Andamento complessivo del patrimonio</p>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickFormatter={(value) => `€${value.toLocaleString('it-IT')}`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#000000"
              strokeWidth={3}
              dot={{ fill: '#000000', r: 4 }}
              name="Valore Totale"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Additional Info */}
      <div className="card bg-blue-50 border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">Note sul Calcolo</p>
            <p className="text-sm text-blue-700 mt-1">
              I dati storici sono stimati utilizzando i prezzi attuali applicati retroattivamente alle transazioni.
              Per dati storici precisi, sarebbe necessario salvare snapshot periodici dei valori o utilizzare API con dati storici completi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioPerformance;
