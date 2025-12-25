import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, Play, Calendar, DollarSign, Percent,
  X, Check, AlertCircle, Loader, PiggyBank, TrendingUp, RefreshCw
} from 'lucide-react';
import {
  getPACTemplates,
  createPACTemplate,
  updatePACTemplate,
  deletePACTemplate,
  preparePACExecution,
  executePAC,
  getTodayDate
} from '../services/pacService';
import { getTransactions } from '../services/localStorageService';
import { getMacroAssetClasses, getMicroCategories } from '../config/assetClasses';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function PAC() {
  // State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState(getEmptyTemplateForm());

  // Execution state
  const [executionTemplate, setExecutionTemplate] = useState(null);
  const [executionDate, setExecutionDate] = useState(getTodayDate());
  const [executionAmount, setExecutionAmount] = useState('');
  const [executionPreview, setExecutionPreview] = useState(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);

  // Known tickers from transactions
  const [knownTickers, setKnownTickers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  function getEmptyTemplateForm() {
    return {
      name: '',
      totalAmount: '',
      reminderDay: '',
      allocations: [
        { id: '1', ticker: '', name: '', macroCategory: 'ETF', microCategory: '', percentage: '' }
      ]
    };
  }

  const loadData = () => {
    setLoading(true);
    try {
      const data = getPACTemplates();
      setTemplates(data);

      // Get unique tickers from existing transactions for autocomplete
      const transactions = getTransactions();
      const tickers = [...new Set(transactions.map(t => t.ticker))].filter(t => t && t !== 'CASH');
      setKnownTickers(tickers);
    } catch (error) {
      console.error('Error loading PAC templates:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TEMPLATE FORM HANDLERS
  // ============================================

  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(getEmptyTemplateForm());
    setShowTemplateModal(true);
  };

  const handleOpenEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      totalAmount: template.totalAmount.toString(),
      reminderDay: template.reminderDay?.toString() || '',
      allocations: template.allocations.map((a, i) => ({
        ...a,
        id: a.id || (i + 1).toString(),
        percentage: a.percentage.toString()
      }))
    });
    setShowTemplateModal(true);
  };

  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false);
    setEditingTemplate(null);
    setTemplateForm(getEmptyTemplateForm());
  };

  const handleAddAllocation = () => {
    setTemplateForm(prev => ({
      ...prev,
      allocations: [
        ...prev.allocations,
        { id: Date.now().toString(), ticker: '', name: '', macroCategory: 'ETF', microCategory: '', percentage: '' }
      ]
    }));
  };

  const handleRemoveAllocation = (id) => {
    if (templateForm.allocations.length <= 1) return;
    setTemplateForm(prev => ({
      ...prev,
      allocations: prev.allocations.filter(a => a.id !== id)
    }));
  };

  const handleAllocationChange = (id, field, value) => {
    setTemplateForm(prev => ({
      ...prev,
      allocations: prev.allocations.map(a => {
        if (a.id !== id) return a;

        const updated = { ...a, [field]: value };

        // Auto-fill name and categories from existing transactions when ticker changes
        if (field === 'ticker' && value) {
          const transactions = getTransactions();
          const lastTx = transactions.find(t => t.ticker?.toUpperCase() === value.toUpperCase());
          if (lastTx) {
            updated.name = lastTx.name || updated.name;
            updated.macroCategory = lastTx.macroCategory || lastTx.category || updated.macroCategory;
            updated.microCategory = lastTx.microCategory || lastTx.subCategory || updated.microCategory;
          }
        }

        return updated;
      })
    }));
  };

  const getTotalPercentage = () => {
    return templateForm.allocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0);
  };

  const handleSaveTemplate = () => {
    const totalPercentage = getTotalPercentage();

    if (totalPercentage !== 100) {
      alert(`La somma delle percentuali deve essere 100%. Attuale: ${totalPercentage}%`);
      return;
    }

    if (!templateForm.name.trim()) {
      alert('Inserisci un nome per il PAC');
      return;
    }

    if (!templateForm.totalAmount || parseFloat(templateForm.totalAmount) <= 0) {
      alert('Inserisci un importo valido');
      return;
    }

    const templateData = {
      name: templateForm.name.trim(),
      totalAmount: parseFloat(templateForm.totalAmount),
      reminderDay: templateForm.reminderDay ? parseInt(templateForm.reminderDay) : null,
      allocations: templateForm.allocations.map(a => ({
        id: a.id,
        ticker: a.ticker.toUpperCase().trim(),
        name: a.name.trim(),
        macroCategory: a.macroCategory,
        microCategory: a.microCategory,
        percentage: parseFloat(a.percentage)
      })).filter(a => a.ticker && a.percentage > 0)
    };

    try {
      if (editingTemplate) {
        updatePACTemplate(editingTemplate.id, templateData);
      } else {
        createPACTemplate(templateData);
      }
      loadData();
      handleCloseTemplateModal();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Errore nel salvataggio del template');
    }
  };

  const handleDeleteTemplate = (template) => {
    if (window.confirm(`Eliminare il PAC "${template.name}"?`)) {
      try {
        deletePACTemplate(template.id);
        loadData();
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  // ============================================
  // EXECUTION HANDLERS
  // ============================================

  const handleOpenExecution = (template) => {
    setExecutionTemplate(template);
    setExecutionDate(getTodayDate());
    setExecutionAmount(template.totalAmount.toString());
    setExecutionPreview(null);
    setExecutionResult(null);
    setShowExecutionModal(true);
  };

  const handleCloseExecutionModal = () => {
    setShowExecutionModal(false);
    setExecutionTemplate(null);
    setExecutionPreview(null);
    setExecutionResult(null);
  };

  const handleFetchPrices = async () => {
    if (!executionTemplate) return;

    setExecutionLoading(true);
    try {
      const modifiedAmount = parseFloat(executionAmount) || executionTemplate.totalAmount;
      const preview = await preparePACExecution(executionTemplate, executionDate, modifiedAmount);
      setExecutionPreview(preview);
    } catch (error) {
      console.error('Error preparing execution:', error);
      alert('Errore nel recupero dei prezzi');
    } finally {
      setExecutionLoading(false);
    }
  };

  const handleModifyPreviewPercentage = (itemIndex, newPercentage) => {
    if (!executionPreview) return;

    const totalAmount = parseFloat(executionAmount) || executionPreview.totalAmount;

    setExecutionPreview(prev => {
      const newItems = prev.items.map((item, i) => {
        if (i !== itemIndex) return item;

        const pct = parseFloat(newPercentage) || 0;
        const allocatedAmount = totalAmount * (pct / 100);
        const quantity = item.price ? allocatedAmount / item.price : null;

        return {
          ...item,
          modifiedPercentage: pct,
          allocatedAmount: Math.round(allocatedAmount * 100) / 100,
          quantity: quantity ? Math.round(quantity * 100000) / 100000 : null
        };
      });

      const newTotalPercentage = newItems.reduce((sum, i) => sum + i.modifiedPercentage, 0);
      const newTotalAllocated = newItems.reduce((sum, i) => sum + (i.allocatedAmount || 0), 0);

      return {
        ...prev,
        items: newItems,
        totalPercentage: newTotalPercentage,
        totalAllocated: Math.round(newTotalAllocated * 100) / 100
      };
    });
  };

  const handleConfirmExecution = async () => {
    if (!executionPreview || !executionPreview.canExecute) return;

    setExecutionLoading(true);
    try {
      const result = await executePAC(executionPreview);
      setExecutionResult(result);
    } catch (error) {
      console.error('Error executing PAC:', error);
      alert('Errore nell\'esecuzione del PAC');
    } finally {
      setExecutionLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PiggyBank className="w-7 h-7 text-blue-600" />
            Piano di Accumulo (PAC)
          </h1>
          <p className="text-gray-600 mt-1">
            Gestisci i tuoi acquisti ricorrenti
          </p>
        </div>
        <button
          onClick={handleOpenNewTemplate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuovo PAC
        </button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun PAC configurato</h3>
          <p className="text-gray-500 mb-4">
            Crea il tuo primo Piano di Accumulo per automatizzare gli acquisti mensili
          </p>
          <button
            onClick={handleOpenNewTemplate}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Crea PAC
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{template.name}</h3>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                  €{template.totalAmount}/mese
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {template.allocations.map((alloc, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{alloc.ticker}</span>
                    <span className="font-medium">{alloc.percentage}%</span>
                  </div>
                ))}
              </div>

              {template.lastExecutedDate && (
                <p className="text-xs text-gray-500 mb-3">
                  Ultimo: {format(new Date(template.lastExecutedDate), 'dd MMM yyyy', { locale: it })}
                </p>
              )}

              <div className="flex gap-2 pt-3 border-t">
                <button
                  onClick={() => handleOpenExecution(template)}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1 hover:bg-green-700 text-sm font-medium"
                >
                  <Play className="w-4 h-4" />
                  Esegui
                </button>
                <button
                  onClick={() => handleOpenEditTemplate(template)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteTemplate(template)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                {editingTemplate ? 'Modifica PAC' : 'Nuovo PAC'}
              </h2>
              <button onClick={handleCloseTemplateModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome PAC</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="es. PAC Mensile ETF World"
                />
              </div>

              {/* Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importo Mensile (€)</label>
                  <input
                    type="number"
                    value={templateForm.totalAmount}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="500"
                    min="0"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giorno Reminder (opz.)</label>
                  <input
                    type="number"
                    value={templateForm.reminderDay}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, reminderDay: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="5"
                    min="1"
                    max="31"
                  />
                </div>
              </div>

              {/* Allocations */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Allocazioni</label>
                  <span className={`text-sm font-medium ${getTotalPercentage() === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Totale: {getTotalPercentage()}%
                  </span>
                </div>

                <div className="space-y-3">
                  {templateForm.allocations.map((alloc, index) => (
                    <div key={alloc.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-12 gap-2">
                        {/* Ticker */}
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={alloc.ticker}
                            onChange={(e) => handleAllocationChange(alloc.id, 'ticker', e.target.value.toUpperCase())}
                            className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="SWDA.MI"
                            list={`tickers-${alloc.id}`}
                          />
                          <datalist id={`tickers-${alloc.id}`}>
                            {knownTickers.map(t => <option key={t} value={t} />)}
                          </datalist>
                        </div>

                        {/* Name */}
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={alloc.name}
                            onChange={(e) => handleAllocationChange(alloc.id, 'name', e.target.value)}
                            className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                            placeholder="Nome asset"
                          />
                        </div>

                        {/* Percentage */}
                        <div className="col-span-2">
                          <div className="relative">
                            <input
                              type="number"
                              value={alloc.percentage}
                              onChange={(e) => handleAllocationChange(alloc.id, 'percentage', e.target.value)}
                              className="w-full border rounded px-2 py-1.5 text-sm pr-6 focus:ring-2 focus:ring-blue-500"
                              placeholder="60"
                              min="0"
                              max="100"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                          </div>
                        </div>

                        {/* Category */}
                        <div className="col-span-2">
                          <select
                            value={alloc.macroCategory}
                            onChange={(e) => handleAllocationChange(alloc.id, 'macroCategory', e.target.value)}
                            className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            {Object.keys(getMacroAssetClasses()).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 flex items-center justify-center">
                          <button
                            onClick={() => handleRemoveAllocation(alloc.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            disabled={templateForm.allocations.length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddAllocation}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Asset
                </button>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={handleCloseTemplateModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={getTotalPercentage() !== 100}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Modal */}
      {showExecutionModal && executionTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Play className="w-5 h-5 text-green-600" />
                Esegui PAC: {executionTemplate.name}
              </h2>
              <button onClick={handleCloseExecutionModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Success Result */}
              {executionResult?.success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <Check className="w-5 h-5" />
                    PAC Eseguito con Successo!
                  </div>
                  <p className="text-green-700">
                    Create {executionResult.transactionsCreated} transazioni per un totale di €{executionResult.totalInvested.toFixed(2)}
                  </p>
                  <button
                    onClick={handleCloseExecutionModal}
                    className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Chiudi
                  </button>
                </div>
              )}

              {/* Execution Form (before preview) */}
              {!executionResult && !executionPreview && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Data Esecuzione
                      </label>
                      <input
                        type="date"
                        value={executionDate}
                        onChange={(e) => setExecutionDate(e.target.value)}
                        max={getTodayDate()}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Importo (€)
                      </label>
                      <input
                        type="number"
                        value={executionAmount}
                        onChange={(e) => setExecutionAmount(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        min="0"
                        step="1"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Allocazioni Template</h4>
                    <div className="space-y-1">
                      {executionTemplate.allocations.map((alloc, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>{alloc.ticker} - {alloc.name}</span>
                          <span className="font-medium">{alloc.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleFetchPrices}
                    disabled={executionLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                  >
                    {executionLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Recupero prezzi...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Recupera Prezzi e Calcola
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Preview Table */}
              {!executionResult && executionPreview && (
                <>
                  {/* Warnings */}
                  {executionPreview.errors.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
                        <AlertCircle className="w-5 h-5" />
                        Attenzione
                      </div>
                      <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {executionPreview.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-blue-800 font-medium">
                      Prezzi: {executionPreview.pricesType === 'historical' ? 'Storici' : 'Attuali'} ({executionPreview.executionDate})
                    </span>
                    <span className={`font-medium ${executionPreview.totalPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}>
                      Totale: {executionPreview.totalPercentage}%
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-3 py-2 font-medium text-gray-600">Ticker</th>
                          <th className="px-3 py-2 font-medium text-gray-600">%</th>
                          <th className="px-3 py-2 font-medium text-gray-600 text-right">Importo €</th>
                          <th className="px-3 py-2 font-medium text-gray-600 text-right">Prezzo €</th>
                          <th className="px-3 py-2 font-medium text-gray-600 text-right">Quantità</th>
                        </tr>
                      </thead>
                      <tbody>
                        {executionPreview.items.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">
                              <span className="font-medium">{item.ticker}</span>
                              <br />
                              <span className="text-xs text-gray-500">{item.name}</span>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.modifiedPercentage}
                                onChange={(e) => handleModifyPreviewPercentage(i, e.target.value)}
                                className="w-16 border rounded px-2 py-1 text-right"
                                min="0"
                                max="100"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              €{item.allocatedAmount?.toFixed(2) || '-'}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {item.price ? `€${item.price.toFixed(2)}` : (
                                <span className="text-red-500">N/D</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {item.quantity ? item.quantity.toFixed(5) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 bg-gray-50 font-medium">
                          <td className="px-3 py-2">TOTALE</td>
                          <td className="px-3 py-2">{executionPreview.totalPercentage}%</td>
                          <td className="px-3 py-2 text-right">€{executionPreview.totalAllocated.toFixed(2)}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setExecutionPreview(null)}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Indietro
                    </button>
                    <button
                      onClick={handleConfirmExecution}
                      disabled={executionLoading || !executionPreview.canExecute}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    >
                      {executionLoading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Esecuzione...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Conferma e Crea Transazioni
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PAC;
