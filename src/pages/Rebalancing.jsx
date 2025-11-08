import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, TrendingUp, TrendingDown, Calendar, DollarSign, Target, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { calculatePortfolio } from '../services/localStorageService';
import { format, addMonths } from 'date-fns';

const COLORS_POSITIVE = '#10b981';
const COLORS_NEGATIVE = '#ef4444';

function Rebalancing() {
  const [strategy, setStrategy] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [deviation, setDeviation] = useState([]);
  const [pacCalendar, setPacCalendar] = useState([]);
  const [picSuggestions, setPicSuggestions] = useState([]);
  const [rebalancingAlerts, setRebalancingAlerts] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // Load strategy
    const saved = localStorage.getItem('investment_strategy');
    if (saved) {
      const strategyData = JSON.parse(saved);
      setStrategy(strategyData);

      // Load portfolio
      const holdings = calculatePortfolio();
      setPortfolio(holdings);

      // Calculate deviation
      const deviations = calculateDeviation(holdings, strategyData);
      setDeviation(deviations);

      // Calculate PAC calendar
      const calendar = calculatePACCalendar(deviations, strategyData);
      setPacCalendar(calendar);

      // Calculate PIC suggestions
      const picAmounts = calculatePICAmounts(deviations, holdings);
      setPicSuggestions(picAmounts);

      // Check rebalancing alerts
      const alerts = checkRebalancingAlerts(deviations, strategyData);
      setRebalancingAlerts(alerts);
    }
  };

  const calculateDeviation = (holdings, strategyData) => {
    const totalValue = holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0);

    // Group by category
    const categoryTotals = {};
    holdings.forEach(h => {
      categoryTotals[h.category] = (categoryTotals[h.category] || 0) + (h.quantity * h.avgPrice);
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
    const totalValue = holdings.reduce((sum, h) => sum + (h.quantity * h.avgPrice), 0);

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
            Strategia: <strong>{strategy.goalName || 'Non definito'}</strong>
          </p>
        </div>
        <button
          onClick={handleMarkRebalanced}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Segna come Ribilanciato
        </button>
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

      {/* Deviation Analysis */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Analisi Scostamenti
        </h3>

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
