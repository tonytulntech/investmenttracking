import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';

function Strategy() {
  const [strategyData, setStrategyData] = useState({
    goalName: '',
    yearsAvailable: '',
    initialInvestment: '',
    monthlyInvestment: '',
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
