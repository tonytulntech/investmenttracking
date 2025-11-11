import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getTransactions } from '../services/localStorageService';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTH_NUMBERS = {
  '01': 'gen', '02': 'feb', '03': 'mar', '04': 'apr',
  '05': 'mag', '06': 'giu', '07': 'lug', '08': 'ago',
  '09': 'set', '10': 'ott', '11': 'nov', '12': 'dic'
};

// Category colors for consistent visualization
const CATEGORY_COLORS = {
  'ETF': '#3b82f6',
  'ETC': '#8b5cf6',
  'ETN': '#10b981',
  'Azioni': '#f59e0b',
  'Obbligazioni': '#ef4444',
  'Crypto': '#ec4899',
  'Materie Prime': '#06b6d4',
  'Monetario': '#84cc16',
  'Immobiliare': '#f97316',
  'Cash': '#6b7280',
  'Totale': '#1f2937'
};

function Patrimonio() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedView, setSelectedView] = useState('all'); // 'income', 'expense', 'investments', 'all'
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    const data = getTransactions();
    setTransactions(data);
  };

  // Get available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set();
    transactions.forEach(tx => {
      if (tx.date) {
        const year = new Date(tx.date).getFullYear();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Process transactions to get income/expense/investments by category and month
  const processedData = useMemo(() => {
    const data = {
      income: {},
      expense: {},
      investments: {}
    };

    // Initialize categories
    Object.keys(CATEGORY_COLORS).forEach(category => {
      if (category !== 'Totale') {
        data.income[category] = {};
        data.expense[category] = {};
        data.investments[category] = {};
        MONTHS.forEach(month => {
          data.income[category][month] = 0;
          data.expense[category][month] = 0;
          data.investments[category][month] = 0;
        });
      }
    });

    // Process transactions
    transactions.forEach(tx => {
      if (!tx.date) return;

      const txDate = parseISO(tx.date);
      const year = txDate.getFullYear();
      const month = MONTH_NUMBERS[format(txDate, 'MM')];

      if (year !== selectedYear) return;

      const category = tx.macroCategory || tx.category || 'Cash';
      const amount = parseFloat(tx.price) * parseFloat(tx.quantity);

      if (isNaN(amount)) return;

      // Initialize category if not exists
      if (!data.income[category]) {
        data.income[category] = {};
        data.expense[category] = {};
        data.investments[category] = {};
        MONTHS.forEach(m => {
          data.income[category][m] = 0;
          data.expense[category][m] = 0;
          data.investments[category][m] = 0;
        });
      }

      // Logic:
      // - Income: Cash with cashFlowType='income' + asset sales (sell)
      // - Expense: Cash with cashFlowType='expense' (real expenses)
      // - Investments: Asset purchases (buy) - NOT expenses, they convert cash to assets!

      if (category === 'Cash' && tx.cashFlowType) {
        // Cash transactions use cashFlowType
        if (tx.cashFlowType === 'income') {
          data.income[category][month] += amount;
        } else if (tx.cashFlowType === 'expense') {
          data.expense[category][month] += amount;
        }
      } else {
        // Asset transactions
        if (tx.type === 'buy') {
          // Investments: buying assets (NOT expenses!)
          data.investments[category][month] += amount;
        } else if (tx.type === 'sell') {
          // Income: selling assets
          data.income[category][month] += amount;
        }
      }
    });

    return data;
  }, [transactions, selectedYear]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const data = MONTHS.map(month => {
      const point = { month };

      let totalIncome = 0;
      let totalExpense = 0;
      let totalInvestments = 0;

      Object.keys(processedData.income).forEach(category => {
        const incomeValue = processedData.income[category][month];
        const expenseValue = processedData.expense[category][month];
        const investmentValue = processedData.investments[category][month];

        totalIncome += incomeValue;
        totalExpense += expenseValue;
        totalInvestments += investmentValue;
      });

      point.totalIncome = totalIncome;
      point.totalExpense = totalExpense;
      point.totalInvestments = totalInvestments;
      // Net Patrimonio = Income - Expense (investments don't reduce net worth!)
      point.net = totalIncome - totalExpense;

      return point;
    });

    return data;
  }, [processedData]);

  // Calculate totals for table
  const tableTotals = useMemo(() => {
    const totals = {
      income: {},
      expense: {},
      investments: {},
      net: {}
    };

    MONTHS.forEach(month => {
      totals.income[month] = 0;
      totals.expense[month] = 0;
      totals.investments[month] = 0;
    });

    Object.keys(processedData.income).forEach(category => {
      MONTHS.forEach(month => {
        totals.income[month] += processedData.income[category][month];
        totals.expense[month] += processedData.expense[category][month];
        totals.investments[month] += processedData.investments[category][month];
      });
    });

    MONTHS.forEach(month => {
      // Net Patrimonio = Income - Expense (not including investments!)
      totals.net[month] = totals.income[month] - totals.expense[month];
    });

    return totals;
  }, [processedData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="page-title">Entrate vs Uscite per Investimenti</h1>
          <p className="text-gray-600 mt-1">Analisi mensile dei flussi di cassa per categoria</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Anno
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="select"
            >
              {availableYears.length === 0 ? (
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
              ) : (
                availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              )}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Visualizzazione
            </label>
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="select"
            >
              <option value="all">Tutto (Entrate, Uscite, Investimenti)</option>
              <option value="income">Solo Entrate</option>
              <option value="expense">Solo Uscite</option>
              <option value="investments">Solo Investimenti</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Andamento Mensile</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => `€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />

            {/* Total lines (thicker) */}
            {(selectedView === 'income' || selectedView === 'all') && (
              <Line
                type="monotone"
                dataKey="totalIncome"
                name="Totale Entrate"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
            {(selectedView === 'expense' || selectedView === 'all') && (
              <Line
                type="monotone"
                dataKey="totalExpense"
                name="Totale Uscite"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
            {(selectedView === 'investments' || selectedView === 'all') && (
              <Line
                type="monotone"
                dataKey="totalInvestments"
                name="Totale Investimenti"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            )}
            {selectedView === 'all' && (
              <Line
                type="monotone"
                dataKey="net"
                name="Risultato Netto (Entrate - Uscite)"
                stroke="#1f2937"
                strokeWidth={3}
                dot={{ r: 4 }}
                strokeDasharray="5 5"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table - Income */}
      {(selectedView === 'income' || selectedView === 'all') && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-success-600" />
            <h3 className="text-lg font-semibold text-gray-900">Entrate</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Categoria</th>
                  {MONTHS.map(month => (
                    <th key={month} className="text-right py-2 px-3 font-medium text-gray-700">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedData.income).sort().map(category => {
                  const hasData = MONTHS.some(m => processedData.income[category][m] > 0);
                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                      {MONTHS.map(month => (
                        <td key={month} className="text-right py-2 px-3 text-success-700">
                          {processedData.income[category][month] > 0
                            ? `€${processedData.income[category][month].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold bg-success-50">
                  <td className="py-2 px-3 text-gray-900">Totale Entrate</td>
                  {MONTHS.map(month => (
                    <td key={month} className="text-right py-2 px-3 text-success-700">
                      €{tableTotals.income[month].toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table - Expenses */}
      {(selectedView === 'expense' || selectedView === 'all') && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-danger-600" />
            <h3 className="text-lg font-semibold text-gray-900">Uscite</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Categoria</th>
                  {MONTHS.map(month => (
                    <th key={month} className="text-right py-2 px-3 font-medium text-gray-700">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedData.expense).sort().map(category => {
                  const hasData = MONTHS.some(m => processedData.expense[category][m] > 0);
                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                      {MONTHS.map(month => (
                        <td key={month} className="text-right py-2 px-3 text-danger-700">
                          {processedData.expense[category][month] > 0
                            ? `€${processedData.expense[category][month].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold bg-danger-50">
                  <td className="py-2 px-3 text-gray-900">Totale Uscite</td>
                  {MONTHS.map(month => (
                    <td key={month} className="text-right py-2 px-3 text-danger-700">
                      €{tableTotals.expense[month].toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table - Investments */}
      {(selectedView === 'investments' || selectedView === 'all') && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Investimenti</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Categoria</th>
                  {MONTHS.map(month => (
                    <th key={month} className="text-right py-2 px-3 font-medium text-gray-700">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(processedData.investments).sort().map(category => {
                  const hasData = MONTHS.some(m => processedData.investments[category][m] > 0);
                  if (!hasData) return null;

                  return (
                    <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-900">{category}</td>
                      {MONTHS.map(month => (
                        <td key={month} className="text-right py-2 px-3 text-primary-700">
                          {processedData.investments[category][month] > 0
                            ? `€${processedData.investments[category][month].toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                            : '-'
                          }
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 font-bold bg-primary-50">
                  <td className="py-2 px-3 text-gray-900">Totale Investimenti</td>
                  {MONTHS.map(month => (
                    <td key={month} className="text-right py-2 px-3 text-primary-700">
                      €{tableTotals.investments[month].toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table - Net Result */}
      {selectedView === 'all' && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Risultato Netto</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Mese</th>
                  {MONTHS.map(month => (
                    <th key={month} className="text-right py-2 px-3 font-medium text-gray-700">{month}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold bg-gray-50">
                  <td className="py-2 px-3 text-gray-900">Entrate - Uscite</td>
                  {MONTHS.map(month => {
                    const net = tableTotals.net[month];
                    return (
                      <td
                        key={month}
                        className={`text-right py-2 px-3 ${net >= 0 ? 'text-success-700' : 'text-danger-700'}`}
                      >
                        {net >= 0 ? '+' : ''}€{net.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Patrimonio;
