import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, AlertCircle, TrendingDown, Clock, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

function Strategy() {
  const [strategyData, setStrategyData] = useState({
    goalName: '',
    yearsAvailable: '',
    initialInvestment: '',
    monthlyInvestment: '',
    targetAmount: '',
    riskLevel: 50,
    assetAllocation: {
      'Azioni': 0,
      'Obbligazioni': 0,
      'Materie Prime': 0,
      'Crypto': 0,
      'Liquidità': 0,
      'Altro': 0
    }
  });
  const [projectionData, setProjectionData] = useState([]);
  const [goalAnalysis, setGoalAnalysis] = useState(null);

  const handleChange = (field, value) => {
    setStrategyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAllocationChange = (assetClass, value) => {
    setStrategyData(prev => ({
      ...prev,
      assetAllocation: {
        ...prev.assetAllocation,
        [assetClass]: parseFloat(value) || 0
      }
    }));
  };

  const totalAllocation = Object.values(strategyData.assetAllocation).reduce((sum, val) => sum + val, 0);
  const isAllocationValid = totalAllocation === 100;

  // Calculate expected return based on risk level and allocation
  const calculateExpectedReturn = () => {
    const { assetAllocation, riskLevel } = strategyData;

    // Base returns by asset class (annual %)
    const baseReturns = {
      'Azioni': 8,
      'Obbligazioni': 3,
      'Materie Prime': 5,
      'Crypto': 15, // High volatility
      'Liquidità': 0.5,
      'Altro': 4
    };

    // Calculate weighted average return
    let weightedReturn = 0;
    Object.entries(assetAllocation).forEach(([asset, percentage]) => {
      weightedReturn += (baseReturns[asset] || 0) * (percentage / 100);
    });

    // Adjust for risk level (risk 0-100% scales return ±20%)
    const riskAdjustment = ((riskLevel - 50) / 50) * 0.2;
    const finalReturn = weightedReturn * (1 + riskAdjustment);

    return Math.max(0, finalReturn); // Never negative
  };

  const calculateProjection = () => {
    const { initialInvestment, monthlyInvestment, yearsAvailable } = strategyData;
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyInvestment) || 0;
    const years = parseInt(yearsAvailable) || 0;

    if (years === 0) return [];

    const annualReturn = calculateExpectedReturn() / 100;
    const monthlyReturn = annualReturn / 12;
    const projection = [];

    let currentValue = initial;

    for (let year = 1; year <= years; year++) {
      // Apply monthly contributions and compound interest for 12 months
      for (let month = 1; month <= 12; month++) {
        currentValue = currentValue * (1 + monthlyReturn) + monthly;
      }

      projection.push({
        year: `Anno ${year}`,
        yearNumber: year,
        value: Math.round(currentValue),
        invested: Math.round(initial + (monthly * 12 * year))
      });
    }

    return projection;
  };

  const analyzeGoal = () => {
    const { targetAmount, yearsAvailable, initialInvestment, monthlyInvestment } = strategyData;
    const target = parseFloat(targetAmount) || 0;
    const years = parseInt(yearsAvailable) || 0;

    if (target === 0 || years === 0) return null;

    const projection = calculateProjection();
    const finalValue = projection[projection.length - 1]?.value || 0;
    const achieved = finalValue >= target;
    const difference = finalValue - target;
    const diffPercentage = (difference / target) * 100;

    return {
      achieved,
      finalValue,
      targetAmount: target,
      difference,
      diffPercentage,
      suggestions: !achieved ? generateSuggestions() : []
    };
  };

  const generateSuggestions = () => {
    const { targetAmount, yearsAvailable, initialInvestment, monthlyInvestment, riskLevel } = strategyData;
    const suggestions = [];

    // Suggestion 1: Increase time
    const newYears = parseInt(yearsAvailable) + 5;
    suggestions.push({
      type: 'time',
      icon: Clock,
      title: 'Aumenta il tempo',
      description: `Prolunga l'investimento di ${newYears - parseInt(yearsAvailable)} anni (fino a ${newYears} anni totali)`,
      color: 'text-blue-600'
    });

    // Suggestion 2: Increase capital
    const currentMonthly = parseFloat(monthlyInvestment) || 0;
    const newMonthly = Math.ceil(currentMonthly * 1.3);
    suggestions.push({
      type: 'capital',
      icon: DollarSign,
      title: 'Aumenta il capitale',
      description: `Aumenta il PAC mensile da €${currentMonthly} a €${newMonthly} (+30%)`,
      color: 'text-green-600'
    });

    // Suggestion 3: Increase risk (only if not already at max)
    if (riskLevel < 80) {
      suggestions.push({
        type: 'risk',
        icon: Zap,
        title: 'Aumenta il rischio (sconsigliato)',
        description: `Aumenta il livello di rischio dal ${riskLevel}% all'80% (rendimenti potenzialmente più alti ma più volatili)`,
        color: 'text-orange-600'
      });
    }

    return suggestions;
  };

  const handleSave = () => {
    if (!isAllocationValid) {
      alert('L\'allocazione totale deve essere esattamente 100%');
      return;
    }

    // Save to localStorage
    localStorage.setItem('investment_strategy', JSON.stringify(strategyData));
    alert('Strategia salvata con successo!');
  };

  useEffect(() => {
    // Load saved strategy
    const saved = localStorage.getItem('investment_strategy');
    if (saved) {
      setStrategyData(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Recalculate projection when data changes
    const projection = calculateProjection();
    setProjectionData(projection);

    const analysis = analyzeGoal();
    setGoalAnalysis(analysis);
  }, [strategyData]);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Target className="w-8 h-8 text-primary-600" />
          Strategia di Investimento
        </h1>
        <p className="text-gray-600 mt-1">Definisci i tuoi obiettivi e la tua asset allocation ideale</p>
      </div>

      {/* Goal Details */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Obiettivo</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Obiettivo *
            </label>
            <input
              type="text"
              value={strategyData.goalName}
              onChange={(e) => handleChange('goalName', e.target.value)}
              placeholder="es. Pensione anticipata, Casa, Libertà finanziaria..."
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Obiettivo Finanziario (€) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={strategyData.targetAmount}
              onChange={(e) => handleChange('targetAmount', e.target.value)}
              placeholder="es. 500000"
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">
              Quanto vuoi accumulare entro {strategyData.yearsAvailable || 'X'} anni?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Anni a Disposizione *
              </label>
              <input
                type="number"
                min="1"
                value={strategyData.yearsAvailable}
                onChange={(e) => handleChange('yearsAvailable', e.target.value)}
                placeholder="es. 20"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Livello di Rischio (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={strategyData.riskLevel}
                  onChange={(e) => handleChange('riskLevel', e.target.value)}
                  className="flex-1"
                />
                <span className="font-bold text-primary-600 min-w-[60px]">{strategyData.riskLevel}%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investimento Iniziale (PIC) €
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={strategyData.initialInvestment}
                onChange={(e) => handleChange('initialInvestment', e.target.value)}
                placeholder="es. 10000"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Investimento Mensile (PAC) €
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={strategyData.monthlyInvestment}
                onChange={(e) => handleChange('monthlyInvestment', e.target.value)}
                placeholder="es. 500"
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocation Ideale</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Nota:</strong> La somma delle percentuali deve essere esattamente 100%
            </p>
          </div>

          {Object.entries(strategyData.assetAllocation).map(([assetClass, value]) => (
            <div key={assetClass}>
              <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                {assetClass} (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => handleAllocationChange(assetClass, e.target.value)}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={value}
                  onChange={(e) => handleAllocationChange(assetClass, e.target.value)}
                  className="input w-24 text-center"
                />
              </div>
            </div>
          ))}

          <div className={`p-4 rounded-lg border-2 ${isAllocationValid ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Totale Allocazione:</span>
              <span className={`text-xl font-bold ${isAllocationValid ? 'text-success-700' : 'text-danger-700'}`}>
                {totalAllocation.toFixed(1)}%
              </span>
            </div>
            {!isAllocationValid && (
              <p className="text-sm text-danger-700 mt-2">
                ⚠️ Mancano {(100 - totalAllocation).toFixed(1)}% per raggiungere il 100%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      {projectionData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Proiezione Crescita Patrimoniale
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Rendimento atteso annuo: <strong>{calculateExpectedReturn().toFixed(2)}%</strong> (basato sulla tua allocazione e livello di rischio)
          </p>

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => `€${value.toLocaleString('it-IT')}`} />
              <Legend />
              <Bar dataKey="invested" fill="#10b981" name="Totale Investito €" />
              <Bar dataKey="value" fill="#3b82f6" name="Valore Stimato €" />
              {goalAnalysis && (
                <Line
                  type="monotone"
                  dataKey={() => goalAnalysis.targetAmount}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Obiettivo €"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Goal Analysis */}
      {goalAnalysis && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Analisi Obiettivo
          </h3>

          {goalAnalysis.achieved ? (
            <div className="bg-success-50 border border-success-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-success-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-success-900 mb-2">
                    🎉 Obiettivo Raggiungibile!
                  </h4>
                  <p className="text-success-700 mb-4">
                    Con questa strategia, in <strong>{strategyData.yearsAvailable} anni</strong> dovresti raggiungere{' '}
                    <strong>€{goalAnalysis.finalValue.toLocaleString('it-IT')}</strong>, superando il tuo obiettivo
                    di <strong>€{goalAnalysis.targetAmount.toLocaleString('it-IT')}</strong> di{' '}
                    <strong>€{goalAnalysis.difference.toLocaleString('it-IT')}</strong> (+{goalAnalysis.diffPercentage.toFixed(1)}%).
                  </p>
                  <p className="text-sm text-success-600">
                    ✓ Mantieni questa strategia e monitora regolarmente i progressi!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-orange-900 mb-2">
                    ⚠️ Obiettivo Non Raggiungibile
                  </h4>
                  <p className="text-orange-700 mb-4">
                    Con questa strategia, in <strong>{strategyData.yearsAvailable} anni</strong> raggiungeresti solo{' '}
                    <strong>€{goalAnalysis.finalValue.toLocaleString('it-IT')}</strong>, mancando il tuo obiettivo
                    di <strong>€{goalAnalysis.targetAmount.toLocaleString('it-IT')}</strong> di{' '}
                    <strong>€{Math.abs(goalAnalysis.difference).toLocaleString('it-IT')}</strong> ({Math.abs(goalAnalysis.diffPercentage).toFixed(1)}%).
                  </p>

                  <h5 className="font-semibold text-orange-900 mb-3">💡 Suggerimenti per Raggiungere l'Obiettivo:</h5>
                  <div className="space-y-3">
                    {goalAnalysis.suggestions.map((suggestion, index) => {
                      const Icon = suggestion.icon;
                      return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-orange-200">
                          <Icon className={`w-5 h-5 ${suggestion.color} flex-shrink-0 mt-0.5`} />
                          <div>
                            <p className="font-semibold text-gray-900">{suggestion.title}</p>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={!isAllocationValid || !strategyData.goalName}
          className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Salva Strategia
        </button>
      </div>
    </div>
  );
}

export default Strategy;
