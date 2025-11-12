import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, DollarSign, Calendar, AlertCircle, TrendingDown, Clock, Zap, Plus, X, Layers, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart, PieChart, Pie, Cell } from 'recharts';
import { ASSET_CLASSES } from '../config/assetClasses';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

// Helper functions for custom categories in localStorage
const loadCustomCategories = () => {
  try {
    const saved = localStorage.getItem('customAssetCategories');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error loading custom categories:', error);
    return {};
  }
};

const saveCustomCategories = (customCategories) => {
  try {
    localStorage.setItem('customAssetCategories', JSON.stringify(customCategories));
  } catch (error) {
    console.error('Error saving custom categories:', error);
  }
};

function Strategy() {
  const [strategyData, setStrategyData] = useState({
    goalName: '',
    currentAge: '',
    yearsAvailable: '',
    initialInvestment: '',
    monthlyInvestment: '',
    targetAmount: '',
    riskLevel: 50,
    // MICRO allocation (new)
    microAllocation: {},
    // MACRO allocation (auto-calculated from MICRO)
    assetAllocation: {}
  });
  const [projectionData, setProjectionData] = useState([]);
  const [goalAnalysis, setGoalAnalysis] = useState(null);
  const [showAddMicro, setShowAddMicro] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState('');
  const [selectedMicro, setSelectedMicro] = useState('');
  const [customCategories, setCustomCategories] = useState(loadCustomCategories());
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [newCustomMacro, setNewCustomMacro] = useState('');
  const [newCustomMicro, setNewCustomMicro] = useState('');

  // Load custom categories on mount
  useEffect(() => {
    setCustomCategories(loadCustomCategories());
  }, []);

  // Get all available MICRO categories grouped by MACRO (including custom)
  const getAllMicroCategories = () => {
    const result = {};

    // Add standard categories from config
    Object.entries(ASSET_CLASSES).forEach(([macro, data]) => {
      result[macro] = Object.keys(data.microCategories);
    });

    // Add custom categories
    Object.entries(customCategories).forEach(([macro, micros]) => {
      if (!result[macro]) {
        result[macro] = [];
      }
      result[macro] = [...result[macro], ...micros];
    });

    return result;
  };

  const microCategoriesByMacro = getAllMicroCategories();

  // Add custom category
  const handleAddCustomCategory = () => {
    if (!newCustomMacro || !newCustomMicro) {
      alert('Inserisci sia la Macro che la Micro categoria');
      return;
    }

    const updatedCustom = { ...customCategories };
    if (!updatedCustom[newCustomMacro]) {
      updatedCustom[newCustomMacro] = [];
    }

    // Check if micro already exists
    if (updatedCustom[newCustomMacro].includes(newCustomMicro)) {
      alert('Questa micro categoria esiste già');
      return;
    }

    updatedCustom[newCustomMacro].push(newCustomMicro);
    setCustomCategories(updatedCustom);
    saveCustomCategories(updatedCustom);

    setNewCustomMacro('');
    setNewCustomMicro('');
    setShowCustomCategoryModal(false);
    alert('Categoria personalizzata aggiunta con successo!');
  };

  // Delete custom category
  const handleDeleteCustomCategory = (macro, micro) => {
    const updatedCustom = { ...customCategories };
    if (updatedCustom[macro]) {
      updatedCustom[macro] = updatedCustom[macro].filter(m => m !== micro);
      if (updatedCustom[macro].length === 0) {
        delete updatedCustom[macro];
      }
    }
    setCustomCategories(updatedCustom);
    saveCustomCategories(updatedCustom);
  };

  // Calculate MACRO allocation from MICRO (including custom categories)
  const calculateMacroFromMicro = (microAlloc) => {
    const macroAlloc = {};

    // Map each MICRO to its MACRO and sum up
    Object.entries(microAlloc).forEach(([microCat, percentage]) => {
      // Find which MACRO this MICRO belongs to
      let foundMacro = null;

      // First check standard categories
      Object.entries(ASSET_CLASSES).forEach(([macro, data]) => {
        if (Object.keys(data.microCategories).includes(microCat)) {
          foundMacro = macro;
        }
      });

      // Then check custom categories
      if (!foundMacro) {
        Object.entries(customCategories).forEach(([macro, micros]) => {
          if (micros.includes(microCat)) {
            foundMacro = macro;
          }
        });
      }

      if (foundMacro) {
        macroAlloc[foundMacro] = (macroAlloc[foundMacro] || 0) + percentage;
      }
    });

    return macroAlloc;
  };

  const handleMicroAllocationChange = (microCat, value) => {
    const newMicroAlloc = {
      ...strategyData.microAllocation,
      [microCat]: parseFloat(value) || 0
    };

    // Auto-calculate MACRO from MICRO
    const newMacroAlloc = calculateMacroFromMicro(newMicroAlloc);

    setStrategyData(prev => ({
      ...prev,
      microAllocation: newMicroAlloc,
      assetAllocation: newMacroAlloc
    }));
  };

  const handleAddMicroCategory = () => {
    if (!selectedMicro) return;

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
  const isAllocationValid = totalMicroAllocation === 100;

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

    // Adjust for risk level (risk 0-100% scales return ±100%)
    // Risk 90 = +80% return, Risk 50 = 0% adjustment, Risk 10 = -80% return
    const riskAdjustment = ((riskLevel - 50) / 50) * 1.0;
    const finalReturn = weightedReturn * (1 + riskAdjustment);

    return Math.max(0, finalReturn); // Never negative
  };

  const calculateProjection = () => {
    const { initialInvestment, monthlyInvestment, yearsAvailable, currentAge } = strategyData;
    const initial = parseFloat(initialInvestment) || 0;
    const monthly = parseFloat(monthlyInvestment) || 0;
    const years = parseInt(yearsAvailable) || 0;
    const age = parseInt(currentAge) || null;

    if (years === 0) return [];

    const annualReturn = calculateExpectedReturn() / 100;
    const monthlyReturn = annualReturn / 12;
    const projection = [];

    let currentValue = initial;
    const currentYear = new Date().getFullYear();

    for (let year = 1; year <= years; year++) {
      // Apply monthly contributions and compound interest for 12 months
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
    const { targetAmount, yearsAvailable, initialInvestment, monthlyInvestment } = strategyData;
    const target = parseFloat(targetAmount) || 0;
    const years = parseInt(yearsAvailable) || 0;

    if (target === 0 || years === 0) return null;

    const projection = calculateProjection();
    const finalValue = projection[projection.length - 1]?.value || 0;
    const achieved = finalValue >= target;
    const difference = finalValue - target;
    const diffPercentage = (difference / target) * 100;

    // Find when goal is reached
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
      const loadedData = JSON.parse(saved);
      // Ensure microAllocation exists (backwards compatibility with old strategies)
      if (!loadedData.microAllocation) {
        loadedData.microAllocation = {};
      }
      // Ensure assetAllocation exists
      if (!loadedData.assetAllocation) {
        loadedData.assetAllocation = {};
      }
      setStrategyData(loadedData);
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

          <div className="grid grid-cols-3 gap-4">
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

      {/* MICRO Asset Allocation */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Asset Allocation (MICRO Categorie)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Definisci la tua allocazione target per sotto-categorie specifiche
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomCategoryModal(!showCustomCategoryModal)}
              className="btn-secondary flex items-center gap-2"
              title="Gestisci categorie personalizzate"
            >
              <Settings className="w-4 h-4" />
              Categorie Custom
            </button>
            <button
              onClick={() => setShowAddMicro(!showAddMicro)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Categoria
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Nota:</strong> La somma delle percentuali MICRO deve essere esattamente 100%.
              Le MACRO si calcolano automaticamente aggregando le MICRO.
            </p>
          </div>

          {/* Add MICRO Category Modal */}
          {showAddMicro && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-3">Seleziona Categoria MICRO</h3>
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
                    {Object.keys(microCategoriesByMacro).map(macro => (
                      <option key={macro} value={macro}>
                        {macro}
                        {customCategories[macro] ? ' (con custom)' : ''}
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
                    {selectedMacro && microCategoriesByMacro[selectedMacro]?.map(micro => (
                      <option key={micro} value={micro}>{micro}</option>
                    ))}
                  </select>
                </div>
              </div>
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

          {/* Custom Category Management Modal */}
          {showCustomCategoryModal && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Gestisci Categorie Personalizzate
              </h3>

              {/* Add New Custom Category */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Aggiungi Nuova Categoria Custom</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MACRO Categoria (nuova o esistente)
                    </label>
                    <input
                      type="text"
                      value={newCustomMacro}
                      onChange={(e) => setNewCustomMacro(e.target.value)}
                      placeholder="es: ETF, Azioni, ecc."
                      className="input"
                      list="existing-macros"
                    />
                    <datalist id="existing-macros">
                      {Object.keys(ASSET_CLASSES).map(macro => (
                        <option key={macro} value={macro} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MICRO Categoria (nome)
                    </label>
                    <input
                      type="text"
                      value={newCustomMicro}
                      onChange={(e) => setNewCustomMicro(e.target.value)}
                      placeholder="es: Momentum Azionario Asia"
                      className="input"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomCategory}
                    className="btn-primary"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Aggiungi Custom
                  </button>
                </div>
              </div>

              {/* List Existing Custom Categories */}
              {Object.keys(customCategories).length > 0 && (
                <div className="bg-white rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Categorie Custom Esistenti</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {Object.entries(customCategories).map(([macro, micros]) => (
                      <div key={macro} className="border-l-4 border-green-500 pl-3">
                        <p className="font-medium text-gray-900">{macro}</p>
                        <div className="space-y-1 mt-1">
                          {micros.map(micro => (
                            <div key={micro} className="flex items-center justify-between text-sm bg-gray-50 rounded px-2 py-1">
                              <span className="text-gray-700">{micro}</span>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Eliminare "${micro}" da "${macro}"?`)) {
                                    handleDeleteCustomCategory(macro, micro);
                                  }
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowCustomCategoryModal(false)}
                className="btn-secondary w-full"
              >
                Chiudi
              </button>
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
              {Object.entries(strategyData.microAllocation).map(([microCat, value]) => (
                <div key={microCat} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-gray-900">
                      {microCat}
                    </label>
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
              ))}
            </div>
          )}

          {/* Total */}
          <div className={`p-4 rounded-lg border-2 ${isAllocationValid ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Totale MICRO Allocazione:</span>
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
                  .map(([macro, percentage]) => (
                    <div key={macro} className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-600">{macro}</p>
                      <p className="text-lg font-bold text-purple-600">{percentage.toFixed(1)}%</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
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
