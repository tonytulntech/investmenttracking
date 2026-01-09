import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, AlertCircle, TrendingDown, Clock, Zap, Plus, X, Layers, Activity, Info, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import {
  ASSET_CATEGORIES_DATA,
  getMicroCategoriesForMacro,
  getMicroCategoryData,
  findMacroFromMicro,
  getAllMacroCategories,
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
  getRiskLevelDescription
} from '../config/assetCategoriesData';
import { getTickersForMicroCategory } from '../config/assetTickerMapping';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'];

function Strategy() {
  const [strategyData, setStrategyData] = useState({
    goalName: '',
    currentAge: '',
    yearsAvailable: '',
    initialInvestment: '',
    monthlyInvestment: '',
    targetAmount: '',
    // MICRO allocation (percentage per category)
    microAllocation: {},
    // MACRO allocation (auto-calculated from MICRO)
    assetAllocation: {}
  });
  const [projectionData, setProjectionData] = useState([]);
  const [goalAnalysis, setGoalAnalysis] = useState(null);
  const [showAddMicro, setShowAddMicro] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState('');
  const [selectedMicro, setSelectedMicro] = useState('');

  // Portfolio metrics (auto-calculated)
  const [portfolioMetrics, setPortfolioMetrics] = useState({
    expectedReturn: 0,
    volatility: 0,
    riskLevel: { level: 'N/A', color: 'text-gray-500', bg: 'bg-gray-100' }
  });

  // Calculate MACRO allocation from MICRO
  const calculateMacroFromMicro = (microAlloc) => {
    const macroAlloc = {};

    Object.entries(microAlloc).forEach(([microCat, percentage]) => {
      const macro = findMacroFromMicro(microCat);
      if (macro) {
        macroAlloc[macro] = (macroAlloc[macro] || 0) + percentage;
      }
    });

    return macroAlloc;
  };

  // Update portfolio metrics whenever allocation changes
  useEffect(() => {
    const expectedReturn = calculatePortfolioReturn(strategyData.microAllocation);
    const volatility = calculatePortfolioVolatility(strategyData.microAllocation);
    const riskLevel = getRiskLevelDescription(volatility);

    setPortfolioMetrics({
      expectedReturn,
      volatility,
      riskLevel
    });
  }, [strategyData.microAllocation]);

  const handleMicroAllocationChange = (microCat, value) => {
    const newMicroAlloc = {
      ...strategyData.microAllocation,
      [microCat]: parseFloat(value) || 0
    };

    const newMacroAlloc = calculateMacroFromMicro(newMicroAlloc);

    setStrategyData(prev => ({
      ...prev,
      microAllocation: newMicroAlloc,
      assetAllocation: newMacroAlloc
    }));
  };

  const handleAddMicroCategory = () => {
    if (!selectedMicro) return;

    // Check if already added
    if (strategyData.microAllocation[selectedMicro] !== undefined) {
      alert('Questa categoria è già presente nell\'allocazione');
      return;
    }

    setStrategyData(prev => ({
      ...prev,
      microAllocation: {
        ...prev.microAllocation,
        [selectedMicro]: 0
      }
    }));

    setSelectedMicro('');
    setSelectedMacro('');
    setShowAddMicro(false);
  };

  const handleRemoveMicroCategory = (microCat) => {
    const newMicroAlloc = { ...strategyData.microAllocation };
    delete newMicroAlloc[microCat];

    const newMacroAlloc = calculateMacroFromMicro(newMicroAlloc);

    setStrategyData(prev => ({
      ...prev,
      microAllocation: newMicroAlloc,
      assetAllocation: newMacroAlloc
    }));
  };

  const totalMicroAllocation = Object.values(strategyData.microAllocation || {}).reduce((sum, val) => sum + val, 0);
  const isAllocationValid = Math.abs(totalMicroAllocation - 100) < 0.01;

  const handleChange = (field, value) => {
    setStrategyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Abbreviate long category names for chart display
  const abbreviateCategoryName = (name) => {
    return name
      .replace('Azionario', 'Az.')
      .replace('Obbligazioni', 'Obb.')
      .replace('Corporate Investment Grade', 'Corp. IG')
      .replace('Investment Grade', 'IG')
      .replace('High Yield', 'HY')
      .replace('Governative', 'Gov.')
      .replace('Governativi', 'Gov.')
      .replace('Aggregate', 'Agg.')
      .replace('Inflation-Linked', 'Infl-L.')
      .replace('Emergenti', 'Emerg.')
      .replace('Europa', 'EU')
      .replace('Mondo', 'World')
      .replace('Mondiale', 'World')
      .replace('(Small Cap)', 'SC')
      .replace('Small Cap', 'SC')
      .replace('Large Cap', 'LC')
      .replace('Mid Cap', 'MC')
      .replace('Multi-Factor', 'Multi-F')
      .replace('Beta Basso', 'Low Beta')
      .replace('Qualità', 'Qual.')
      .replace('Materie Prime', 'Mat. Prime')
      .replace('Diversificati', 'Div.');
  };

  const calculateProjection = () => {
    const { initialInvestment, monthlyInvestment, yearsAvailable, currentAge } = strategyData;
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyInvestment) || 0;
    const years = parseInt(yearsAvailable) || 0;
    const age = parseInt(currentAge) || null;

    if (years === 0) return [];

    // Use calculated expected return from portfolio
    const annualReturn = portfolioMetrics.expectedReturn / 100;
    const monthlyReturn = annualReturn / 12;
    const projection = [];

    let currentValue = initial;
    const currentYear = new Date().getFullYear();

    for (let year = 1; year <= years; year++) {
      for (let month = 1; month <= 12; month++) {
        currentValue = currentValue * (1 + monthlyReturn) + monthly;
      }

      const calendarYear = currentYear + year;
      const ageAtYear = age ? age + year : null;

      projection.push({
        year: age ? `Anno ${year}\n(${ageAtYear} anni)` : `Anno ${year}`,
        yearNumber: year,
        calendarYear,
        age: ageAtYear,
        value: Math.round(currentValue),
        invested: Math.round(initial + (monthly * 12 * year))
      });
    }

    return projection;
  };

  const analyzeGoal = () => {
    const { targetAmount, yearsAvailable } = strategyData;
    const target = parseFloat(targetAmount) || 0;
    const years = parseInt(yearsAvailable) || 0;

    if (target === 0 || years === 0) return null;

    const projection = calculateProjection();
    const finalValue = projection[projection.length - 1]?.value || 0;
    const achieved = finalValue >= target;
    const difference = finalValue - target;
    const diffPercentage = (difference / target) * 100;

    let goalReachedYear = null;
    let goalReachedAge = null;
    let goalReachedCalendarYear = null;

    if (achieved) {
      for (const dataPoint of projection) {
        if (dataPoint.value >= target) {
          goalReachedYear = dataPoint.yearNumber;
          goalReachedAge = dataPoint.age;
          goalReachedCalendarYear = dataPoint.calendarYear;
          break;
        }
      }
    }

    return {
      achieved,
      finalValue,
      targetAmount: target,
      difference,
      diffPercentage,
      goalReachedYear,
      goalReachedAge,
      goalReachedCalendarYear,
      suggestions: !achieved ? generateSuggestions() : []
    };
  };

  const generateSuggestions = () => {
    const { yearsAvailable, monthlyInvestment, microAllocation } = strategyData;
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

    // Suggestion 3: Higher return allocation (if portfolio is conservative)
    if (portfolioMetrics.expectedReturn < 6) {
      suggestions.push({
        type: 'allocation',
        icon: Zap,
        title: 'Rivedi l\'allocazione',
        description: `Il tuo portafoglio ha un rendimento atteso del ${portfolioMetrics.expectedReturn.toFixed(1)}%. Considera di aumentare la quota azionaria per rendimenti più alti (con maggiore volatilità).`,
        color: 'text-orange-600'
      });
    }

    // Suggestion 4: If high volatility, suggest reducing it
    if (portfolioMetrics.volatility > 30) {
      const highVolAssets = Object.entries(microAllocation)
        .filter(([micro]) => {
          const data = getMicroCategoryData(micro);
          return data && data.volatility > 40;
        })
        .map(([micro]) => micro);

      if (highVolAssets.length > 0) {
        suggestions.push({
          type: 'risk',
          icon: AlertCircle,
          title: 'Riduci la volatilità',
          description: `Asset ad alta volatilità: ${highVolAssets.slice(0, 2).join(', ')}. Considera di ridurne la percentuale per un portafoglio più stabile.`,
          color: 'text-red-600'
        });
      }
    }

    return suggestions;
  };

  const handleSave = () => {
    if (!isAllocationValid) {
      alert('L\'allocazione totale deve essere esattamente 100%');
      return;
    }

    localStorage.setItem('investment_strategy', JSON.stringify(strategyData));
    alert('Strategia salvata con successo!');
  };

  useEffect(() => {
    const saved = localStorage.getItem('investment_strategy');
    if (saved) {
      const loadedData = JSON.parse(saved);
      if (!loadedData.microAllocation) {
        loadedData.microAllocation = {};
      }
      if (!loadedData.assetAllocation) {
        loadedData.assetAllocation = {};
      }
      // Remove old riskLevel field if present
      delete loadedData.riskLevel;
      setStrategyData(loadedData);
    }
  }, []);

  useEffect(() => {
    const projection = calculateProjection();
    setProjectionData(projection);

    const analysis = analyzeGoal();
    setGoalAnalysis(analysis);
  }, [strategyData, portfolioMetrics]);

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

      {/* Portfolio Metrics Card - Always visible */}
      {Object.keys(strategyData.microAllocation).length > 0 && (
        <div className={`rounded-xl p-6 border-2 ${portfolioMetrics.riskLevel.bg} border-opacity-50`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Rendimento Atteso Annuo
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {portfolioMetrics.expectedReturn.toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  Volatilità Annua
                </p>
                <p className="text-3xl font-bold text-blue-600">
                  {portfolioMetrics.volatility.toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-px bg-gray-300"></div>
              <div>
                <p className="text-sm text-gray-600">Livello di Rischio</p>
                <p className={`text-2xl font-bold ${portfolioMetrics.riskLevel.color}`}>
                  {portfolioMetrics.riskLevel.level}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                Calcolato automaticamente in base all'allocazione
              </p>
            </div>
          </div>
        </div>
      )}

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
                Età Attuale
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={strategyData.currentAge}
                onChange={(e) => handleChange('currentAge', e.target.value)}
                placeholder="es. 30"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Per mostrare età nel grafico
              </p>
            </div>
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

      {/* MICRO Asset Allocation */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Asset Allocation
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Seleziona le categorie e definisci le percentuali. Rendimento e rischio si calcolano automaticamente.
            </p>
          </div>
          <button
            onClick={() => setShowAddMicro(!showAddMicro)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Categoria
          </button>
        </div>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p><strong>Come funziona:</strong> Seleziona le categorie dal database predefinito. Per ogni categoria sono definiti rendimento atteso e volatilità basati su dati storici.</p>
                <p className="mt-1">La somma delle percentuali deve essere esattamente 100%.</p>
              </div>
            </div>
          </div>

          {/* Add MICRO Category Modal */}
          {showAddMicro && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-3">Seleziona Categoria</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MACRO Categoria
                  </label>
                  <select
                    value={selectedMacro}
                    onChange={(e) => {
                      setSelectedMacro(e.target.value);
                      setSelectedMicro('');
                    }}
                    className="input"
                  >
                    <option value="">-- Seleziona MACRO --</option>
                    {getAllMacroCategories().map(macro => (
                      <option key={macro} value={macro}>
                        {macro} ({ASSET_CATEGORIES_DATA[macro]?.description || ''})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MICRO Categoria
                  </label>
                  <select
                    value={selectedMicro}
                    onChange={(e) => setSelectedMicro(e.target.value)}
                    disabled={!selectedMacro}
                    className="input"
                  >
                    <option value="">-- Seleziona MICRO --</option>
                    {selectedMacro && Object.entries(getMicroCategoriesForMacro(selectedMacro)).map(([micro, data]) => (
                      <option key={micro} value={micro}>
                        {micro} (Rend: {data.expectedReturn}%, Vol: {data.volatility}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected category preview */}
              {selectedMicro && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-900">{selectedMicro}</p>
                  {(() => {
                    const data = getMicroCategoryData(selectedMicro);
                    return data ? (
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-green-600">Rendimento: {data.expectedReturn}%</span>
                        <span className="text-blue-600">Volatilità: {data.volatility}%</span>
                        <span className="text-gray-500">{data.description}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddMicroCategory}
                  disabled={!selectedMicro}
                  className="btn-primary"
                >
                  Aggiungi
                </button>
                <button
                  onClick={() => {
                    setShowAddMicro(false);
                    setSelectedMacro('');
                    setSelectedMicro('');
                  }}
                  className="btn-secondary"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* MICRO Categories List */}
          {Object.entries(strategyData.microAllocation).length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Layers className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Nessuna categoria aggiunta</p>
              <p className="text-sm text-gray-500 mt-1">Clicca "Aggiungi Categoria" per iniziare</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(strategyData.microAllocation).map(([microCat, value]) => {
                const data = getMicroCategoryData(microCat);
                const macro = findMacroFromMicro(microCat);
                const associatedTickers = getTickersForMicroCategory(microCat);
                return (
                  <div key={microCat} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <label className="font-medium text-gray-900">
                          {microCat}
                        </label>
                        <div className="flex flex-wrap gap-2 text-xs mt-1">
                          <span className="text-purple-600 bg-purple-100 px-2 py-0.5 rounded">{macro}</span>
                          {data && (
                            <>
                              <span className="text-green-600">Rend: {data.expectedReturn}%</span>
                              <span className="text-blue-600">Vol: {data.volatility}%</span>
                            </>
                          )}
                        </div>
                        {associatedTickers.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Tag className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">Ticker:</span>
                            {associatedTickers.slice(0, 5).map((ticker, idx) => (
                              <span key={ticker} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                                {ticker}
                              </span>
                            ))}
                            {associatedTickers.length > 5 && (
                              <span className="text-xs text-gray-400">+{associatedTickers.length - 5} altri</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveMicroCategory(microCat)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={value}
                        onChange={(e) => handleMicroAllocationChange(microCat, e.target.value)}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={value}
                        onChange={(e) => handleMicroAllocationChange(microCat, e.target.value)}
                        className="input w-24 text-center"
                      />
                      <span className="text-sm font-medium text-gray-600">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Total */}
          <div className={`p-4 rounded-lg border-2 ${isAllocationValid ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Totale Allocazione:</span>
              <span className={`text-xl font-bold ${isAllocationValid ? 'text-success-700' : 'text-danger-700'}`}>
                {totalMicroAllocation.toFixed(1)}%
              </span>
            </div>
            {!isAllocationValid && (
              <p className="text-sm text-danger-700 mt-2">
                ⚠️ {totalMicroAllocation > 100
                  ? `Hai superato di ${(totalMicroAllocation - 100).toFixed(1)}%`
                  : `Mancano ${(100 - totalMicroAllocation).toFixed(1)}%`} per raggiungere il 100%
              </p>
            )}
          </div>

          {/* MACRO Summary (auto-calculated) */}
          {Object.keys(strategyData.assetAllocation).length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                📊 Riepilogo MACRO (calcolato automaticamente)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(strategyData.assetAllocation)
                  .filter(([_, val]) => val > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([macro, percentage]) => (
                    <div key={macro} className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-600">{macro}</p>
                      <p className="text-lg font-bold text-purple-600">{percentage.toFixed(1)}%</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Pie Charts - Allocation Visualization */}
          {isAllocationValid && Object.keys(strategyData.microAllocation).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* MICRO Allocation Pie Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  🎯 Composizione MICRO
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(strategyData.microAllocation)
                        .filter(([_, val]) => val > 0)
                        .map(([name, value]) => ({
                          name,
                          fullName: name,
                          shortName: abbreviateCategoryName(name),
                          value
                        }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ shortName, value }) => value >= 5 ? `${shortName} ${value.toFixed(0)}%` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(strategyData.microAllocation)
                        .filter(([_, val]) => val > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${value.toFixed(1)}%`, props.payload.fullName]}
                    />
                    <Legend
                      formatter={(value, entry) => abbreviateCategoryName(entry.payload.fullName)}
                      wrapperStyle={{ fontSize: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* MACRO Allocation Pie Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  📊 Composizione MACRO
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(strategyData.assetAllocation)
                        .filter(([_, val]) => val > 0)
                        .map(([name, value]) => ({
                          name,
                          fullName: name,
                          value
                        }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => value >= 5 ? `${name} ${value.toFixed(0)}%` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(strategyData.assetAllocation)
                        .filter(([_, val]) => val > 0)
                        .map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [`${value.toFixed(1)}%`, props.payload.fullName]}
                    />
                    <Legend
                      formatter={(value, entry) => entry.payload.fullName}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Projection Chart */}
      {projectionData.length > 0 && portfolioMetrics.expectedReturn > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Proiezione Crescita Patrimoniale
          </h3>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-sm text-gray-600">Rendimento atteso annuo</p>
                <p className="text-2xl font-bold text-green-600">{portfolioMetrics.expectedReturn.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Volatilità annua</p>
                <p className="text-2xl font-bold text-blue-600">{portfolioMetrics.volatility.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rischio</p>
                <p className={`text-2xl font-bold ${portfolioMetrics.riskLevel.color}`}>
                  {portfolioMetrics.riskLevel.level}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              📊 Valori calcolati automaticamente in base alla tua allocazione
            </p>
          </div>

          {goalAnalysis && goalAnalysis.achieved && goalAnalysis.goalReachedCalendarYear && (
            <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="font-semibold text-success-900">
                  🎯 Obiettivo raggiunto nell'anno {goalAnalysis.goalReachedYear}
                </p>
                <p className="text-sm text-success-700">
                  Nel <strong>{goalAnalysis.goalReachedCalendarYear}</strong>
                  {goalAnalysis.goalReachedAge && <span> quando avrai <strong>{goalAnalysis.goalReachedAge} anni</strong></span>}
                </p>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" angle={-45} textAnchor="end" height={80} fontSize={11} />
              <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => `€${value.toLocaleString('it-IT')}`}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-gray-900 mb-2">Anno {data.yearNumber}</p>
                        {data.calendarYear && (
                          <p className="text-sm text-gray-600 mb-1">📅 {data.calendarYear}</p>
                        )}
                        {data.age && (
                          <p className="text-sm text-gray-600 mb-2">👤 Età: {data.age} anni</p>
                        )}
                        <div className="space-y-1 border-t border-gray-200 pt-2">
                          {payload.map((entry, index) => (
                            <p key={index} className="text-sm" style={{ color: entry.color }}>
                              {entry.name}: <strong>€{entry.value.toLocaleString('it-IT')}</strong>
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
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
                  <p className="text-success-700 mb-2">
                    Con questa strategia, dovresti raggiungere il tuo obiettivo di{' '}
                    <strong>€{goalAnalysis.targetAmount.toLocaleString('it-IT')}</strong>{' '}
                    {goalAnalysis.goalReachedYear && (
                      <>
                        nell'<strong>anno {goalAnalysis.goalReachedYear}</strong>
                        {goalAnalysis.goalReachedCalendarYear && (
                          <span> (nel <strong>{goalAnalysis.goalReachedCalendarYear}</strong>)</span>
                        )}
                        {goalAnalysis.goalReachedAge && (
                          <span> quando avrai <strong>{goalAnalysis.goalReachedAge} anni</strong></span>
                        )}
                      </>
                    )}.
                  </p>
                  <p className="text-success-700 mb-4">
                    Alla fine del periodo ({strategyData.yearsAvailable} anni) raggiungerai{' '}
                    <strong>€{goalAnalysis.finalValue.toLocaleString('it-IT')}</strong>, superando l'obiettivo
                    di <strong>€{goalAnalysis.difference.toLocaleString('it-IT')}</strong> (+{goalAnalysis.diffPercentage.toFixed(1)}%).
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
