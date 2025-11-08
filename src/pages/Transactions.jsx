import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FileText, X, Calendar, DollarSign, Hash, Tag, Building2, FileDown, FileUp, Loader, Globe, MapPin } from 'lucide-react';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, exportTransactions, bulkImportTransactions } from '../services/localStorageService';
import { searchSecurity } from '../services/priceService';
import { fetchAllocationData } from '../services/allocationService';
import { format } from 'date-fns';
import Papa from 'papaparse';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState(getEmptyForm());
  const [allocationData, setAllocationData] = useState(null);
  const [fetchingAllocation, setFetchingAllocation] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType]);

  function getEmptyForm() {
    return {
      name: '',
      ticker: '',
      isin: '',
      category: 'ETF',
      date: new Date().toISOString().split('T')[0],
      price: '',
      quantity: '',
      currency: 'EUR',
      notes: '',
      type: 'buy'
    };
  }

  const loadTransactions = () => {
    const data = getTransactions();
    setTransactions(data);
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.ticker?.toLowerCase().includes(term) ||
        tx.name?.toLowerCase().includes(term) ||
        tx.isin?.toLowerCase().includes(term)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(tx => tx.type === filterType);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredTransactions(filtered);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    setFormData(getEmptyForm());
    setAllocationData(null);
    setShowModal(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      name: transaction.name || '',
      ticker: transaction.ticker || '',
      isin: transaction.isin || '',
      category: transaction.category || 'ETF',
      date: transaction.date || new Date().toISOString().split('T')[0],
      price: transaction.price || '',
      quantity: transaction.quantity || '',
      currency: transaction.currency || 'EUR',
      notes: transaction.notes || '',
      type: transaction.type || 'buy'
    });
    // Load existing allocation data if available
    if (transaction.allocation) {
      setAllocationData(transaction.allocation);
    } else {
      setAllocationData(null);
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa transazione?')) {
      return;
    }

    try {
      deleteTransaction(id);
      loadTransactions();
    } catch (error) {
      alert('Errore nell\'eliminazione della transazione');
    }
  };

  // Auto-fetch allocation data when ticker or category changes
  useEffect(() => {
    const fetchAllocation = async () => {
      // Only fetch if we have a ticker and category, and we're not editing (or if editing and no allocation data exists)
      if (formData.ticker && formData.category && formData.ticker.length >= 2) {
        // Don't re-fetch if we're editing and already have allocation data
        if (editingTransaction && editingTransaction.allocation) {
          return;
        }

        setFetchingAllocation(true);
        try {
          const data = await fetchAllocationData(formData.ticker, formData.category);
          setAllocationData(data);
        } catch (error) {
          console.error('Error fetching allocation:', error);
          setAllocationData(null);
        } finally {
          setFetchingAllocation(false);
        }
      }
    };

    // Debounce the fetch to avoid too many API calls
    const timeoutId = setTimeout(fetchAllocation, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.ticker, formData.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.ticker || !formData.date || !formData.price || !formData.quantity) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    try {
      const transactionData = {
        ...formData,
        price: parseFloat(formData.price),
        quantity: parseFloat(formData.quantity),
        // Include allocation data if available
        allocation: allocationData?.allocation || null,
        allocationMetadata: allocationData?.metadata || null
      };

      if (editingTransaction) {
        updateTransaction(editingTransaction.id, transactionData);
      } else {
        addTransaction(transactionData);
      }

      setShowModal(false);
      setAllocationData(null);
      loadTransactions();
    } catch (error) {
      alert('Errore nel salvare la transazione');
    }
  };

  const handleExport = () => {
    const data = exportTransactions();
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const importData = results.data
            .filter(row => row.ticker && row.price && row.quantity)
            .map(row => ({
              name: row.name || row.ticker,
              ticker: row.ticker,
              isin: row.isin || '',
              category: row.category || 'ETF',
              date: row.date || new Date().toISOString().split('T')[0],
              price: parseFloat(row.price),
              quantity: parseFloat(row.quantity),
              currency: row.currency || 'EUR',
              notes: row.notes || '',
              type: row.type || 'buy'
            }));

          bulkImportTransactions(importData);
          loadTransactions();
          alert(`${importData.length} transazioni importate con successo!`);
        } catch (error) {
          alert('Errore nell\'importazione del CSV');
        }
      }
    });
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transazioni</h1>
          <p className="text-gray-600 mt-1">Gestisci le tue operazioni</p>
        </div>
        <div className="flex gap-2">
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <FileUp className="w-4 h-4" />
            <span className="hidden sm:inline">Importa CSV</span>
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
          <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuova</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca ticker, nome o ISIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="select min-w-[150px]"
          >
            <option value="all">Tutti i tipi</option>
            <option value="buy">Acquisto</option>
            <option value="sell">Vendita</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessuna transazione
          </h3>
          <p className="text-gray-600 mb-6">
            Aggiungi la tua prima transazione per iniziare
          </p>
          <button onClick={handleAdd} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Aggiungi Transazione
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Ticker</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th className="text-right">Quantità</th>
                  <th className="text-right">Prezzo</th>
                  <th className="text-right">Totale</th>
                  <th className="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.date)}</td>
                    <td>
                      <span className={`badge ${tx.type === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                        {tx.type === 'buy' ? 'Acquisto' : 'Vendita'}
                      </span>
                    </td>
                    <td className="font-semibold">{tx.ticker}</td>
                    <td className="text-gray-600 max-w-xs truncate">{tx.name || '-'}</td>
                    <td>
                      <span className="badge badge-primary">{tx.category}</span>
                    </td>
                    <td className="text-right">{tx.quantity}</td>
                    <td className="text-right">€{tx.price.toFixed(2)}</td>
                    <td className="text-right font-medium">
                      €{(tx.quantity * tx.price).toFixed(2)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tx)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Modifica"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-apple-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTransaction ? 'Modifica Transazione' : 'Nuova Transazione'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo Operazione *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'buy' })}
                    className={`p-4 rounded-lg border-2 font-medium transition-all ${
                      formData.type === 'buy'
                        ? 'border-success-600 bg-success-50 text-success-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Acquisto
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'sell' })}
                    className={`p-4 rounded-lg border-2 font-medium transition-all ${
                      formData.type === 'sell'
                        ? 'border-danger-600 bg-danger-50 text-danger-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Vendita
                  </button>
                </div>
              </div>

              {/* Ticker & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Ticker *
                  </label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                    placeholder="VWCE.DE"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome asset"
                    className="input"
                  />
                </div>
              </div>

              {/* ISIN & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ISIN
                  </label>
                  <input
                    type="text"
                    value={formData.isin}
                    onChange={(e) => setFormData({ ...formData, isin: e.target.value.toUpperCase() })}
                    placeholder="IE00BK5BQT80"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="select"
                    required
                  >
                    <option value="ETF">ETF</option>
                    <option value="Stock">Stock</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Bond">Bond</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="input"
                  required
                />
              </div>

              {/* Price & Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Prezzo *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Quantità *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0.0000"
                    className="input"
                    required
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valuta
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="select"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              {/* Total Preview */}
              {formData.price && formData.quantity && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <p className="text-sm text-primary-700 mb-1">Totale Operazione</p>
                  <p className="text-2xl font-bold text-primary-900">
                    €{(parseFloat(formData.price) * parseFloat(formData.quantity)).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive (opzionale)"
                  rows="3"
                  className="input resize-none"
                />
              </div>

              {/* Allocation Data Display */}
              {fetchingAllocation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                  <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Recupero dati allocazione...
                    </p>
                    <p className="text-xs text-blue-700">
                      Ottenendo informazioni su paesi, settori e mercati
                    </p>
                  </div>
                </div>
              )}

              {!fetchingAllocation && allocationData && allocationData.allocation && (
                <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-5 h-5 text-success-700" />
                    <h4 className="text-sm font-semibold text-success-900">
                      Allocazione Automatica Rilevata
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Countries */}
                    {allocationData.allocation.countries && Object.keys(allocationData.allocation.countries).length > 0 && (
                      <div>
                        <p className="font-medium text-success-900 mb-1">Paesi:</p>
                        <p className="text-success-700">
                          {Object.keys(allocationData.allocation.countries).slice(0, 3).join(', ')}
                          {Object.keys(allocationData.allocation.countries).length > 3 && '...'}
                        </p>
                      </div>
                    )}

                    {/* Sectors */}
                    {allocationData.allocation.sectors && Object.keys(allocationData.allocation.sectors).length > 0 && (
                      <div>
                        <p className="font-medium text-success-900 mb-1">Settori:</p>
                        <p className="text-success-700">
                          {Object.keys(allocationData.allocation.sectors).slice(0, 3).join(', ')}
                          {Object.keys(allocationData.allocation.sectors).length > 3 && '...'}
                        </p>
                      </div>
                    )}

                    {/* Continents */}
                    {allocationData.allocation.continents && Object.keys(allocationData.allocation.continents).length > 0 && (
                      <div>
                        <p className="font-medium text-success-900 mb-1">Continenti:</p>
                        <p className="text-success-700">
                          {Object.keys(allocationData.allocation.continents).slice(0, 3).join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Market Types */}
                    {allocationData.allocation.marketTypes && Object.keys(allocationData.allocation.marketTypes).length > 0 && (
                      <div>
                        <p className="font-medium text-success-900 mb-1">Tipo Mercato:</p>
                        <p className="text-success-700">
                          {Object.keys(allocationData.allocation.marketTypes).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-success-600 mt-2 italic">
                    ✓ Questi dati verranno salvati automaticamente con la transazione
                  </p>
                </div>
              )}

              {!fetchingAllocation && allocationData && allocationData.metadata?.note && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    ℹ️ {allocationData.metadata.note}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Annulla
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingTransaction ? 'Salva Modifiche' : 'Aggiungi Transazione'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
