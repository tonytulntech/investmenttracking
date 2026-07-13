import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, FileText, X, Calendar, DollarSign, Hash, Tag, FileDown, FileUp, Loader, Sparkles, AlertTriangle, CheckCircle2, Info, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction, exportTransactions, bulkImportTransactions, clearAllTransactions, getImportBatches, deleteImportBatch } from '../services/localStorageService';
import { searchSecurity, fetchMultiplePrices } from '../services/priceService';
import { detectSubCategory } from '../services/categoryDetectionService';
import { cacheTER, getTER } from '../services/terDetectionService';
import { getAllMacroCategories, getMicroCategoriesForMacro } from '../config/assetCategoriesData';
import { getAssetInfo, isTickerMapped } from '../config/assetTickerMapping';
import { checkCashAvailability } from '../services/cashFlowService';
import { isCrypto } from '../services/coinGecko';
import { lookupISIN } from '../services/isinMapping';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { parseCSVFile, findDuplicates } from '../services/csvImportService';
import { reportTickers } from '../services/tickerReportService';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState(getEmptyForm());
  const [availableMicroCategories, setAvailableMicroCategories] = useState({});
  const [autoFillSource, setAutoFillSource] = useState(null); // 'mapping', 'history', or null

  // ── Import preview state ──────────────────────────────────────────────────
  const [importPreview, setImportPreview]         = useState(null);
  const [importLoading, setImportLoading]         = useState(false);
  const [importFilename, setImportFilename]       = useState('');
  const [importPlatformLabel, setImportPlatformLabel] = useState(''); // user-editable platform label
  const [dupInfo, setDupInfo]                     = useState(null);   // { duplicates, unique } — for display in preview
  const [dupStrategy, setDupStrategy]             = useState(null);   // null | { duplicates, unique, total } — for override modal
  const [unknownReported, setUnknownReported]     = useState(false);  // ticker sconosciuti segnalati?
  const [cashPrompt, setCashPrompt]               = useState(null);   // null | { total, batchId }
  const [showBatches, setShowBatches]             = useState(false);
  const [importBatches, setImportBatches]         = useState([]);
  const [excludedExpanded, setExcludedExpanded]   = useState(false);

  useEffect(() => {
    loadTransactions();
    loadBatches();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filterType, filterCategory, filterPlatform]);

  const PLATFORM_OPTIONS = [
    'Manuale', 'Fineco', 'DeGiro', 'Trading 212', 'IBKR',
    'Binance', 'Crypto.com', 'Coinbase', 'Altro',
  ];

  function getEmptyForm() {
    return {
      name: '',
      ticker: '',
      isin: '',
      macroCategory: 'ETF',
      microCategory: '',
      date: new Date().toISOString().split('T')[0],
      price: '',
      quantity: '',
      commission: '',
      ter: '', // Total Expense Ratio (%)
      currency: 'EUR',
      notes: '',
      type: 'buy',
      cashFlowType: 'income', // income (entrata) or expense (uscita) for Cash transactions
      platform: 'Manuale',
    };
  }

  // Update micro categories when macro category changes
  useEffect(() => {
    if (formData.macroCategory) {
      const microCats = getMicroCategoriesForMacro(formData.macroCategory);
      setAvailableMicroCategories(microCats);

      // Special handling for Cash: auto-fill microCategory and name
      if (formData.macroCategory === 'Cash') {
        setFormData(prev => ({
          ...prev,
          microCategory: 'Liquidità',
          name: 'Cash',
          ticker: prev.ticker || 'CASH'
        }));
      } else {
        // Reset micro category if not valid for new macro
        if (formData.microCategory && !(formData.microCategory in microCats)) {
          setFormData(prev => ({ ...prev, microCategory: '' }));
        }
      }
    }
  }, [formData.macroCategory]);

  // Auto-fill form when ticker changes
  // Priority: 1) Central mapping (assetTickerMapping.js), 2) Last transaction for same ticker
  const handleTickerChange = (newTicker) => {
    const normalizedTicker = newTicker.toUpperCase().trim();
    setFormData(prev => ({ ...prev, ticker: normalizedTicker }));
    setAutoFillSource(null);

    if (!newTicker || editingTransaction) return; // Don't auto-fill when editing

    // PRIORITY 1: Check central asset mapping
    const mappingInfo = getAssetInfo(normalizedTicker);
    if (mappingInfo) {
      console.log(`✨ Auto-filling from central mapping for ${normalizedTicker}:`, mappingInfo);
      setAutoFillSource('mapping');
      setFormData(prev => ({
        ...prev,
        ticker: normalizedTicker,
        name: mappingInfo.name || prev.name,
        isin: mappingInfo.isin || prev.isin,
        macroCategory: mappingInfo.macro || prev.macroCategory,
        microCategory: mappingInfo.micro || prev.microCategory,
        // Keep current date, price, quantity, commission (user will update these)
        date: new Date().toISOString().split('T')[0],
        price: '',
        quantity: '',
        commission: ''
      }));
      return; // Don't check history if mapping found
    }

    // PRIORITY 2: Fall back to last transaction for this ticker
    const lastTransaction = transactions
      .filter(tx => tx.ticker.toUpperCase() === normalizedTicker)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    if (lastTransaction) {
      console.log(`📋 Auto-filling from last transaction for ${newTicker}`);
      setAutoFillSource('history');
      setFormData(prev => ({
        ...prev,
        ticker: normalizedTicker,
        name: lastTransaction.name || prev.name,
        isin: lastTransaction.isin || prev.isin,
        macroCategory: lastTransaction.macroCategory || lastTransaction.category || prev.macroCategory,
        microCategory: lastTransaction.microCategory || lastTransaction.subCategory || prev.microCategory,
        currency: lastTransaction.currency || prev.currency,
        ter: lastTransaction.ter || prev.ter, // Auto-fill TER from last transaction
        platform: lastTransaction.platform || prev.platform,
        // Keep current date, price, quantity, commission (user will update these)
        date: new Date().toISOString().split('T')[0],
        price: '',
        quantity: '',
        commission: ''
      }));
    }
  };

  // Auto-fill TER from cache when ticker changes
  useEffect(() => {
    if (formData.ticker && !formData.ter && !editingTransaction) {
      const cachedTER = getTER(formData.ticker);
      if (cachedTER !== null) {
        setFormData(prev => ({
          ...prev,
          ter: cachedTER.toString()
        }));
        console.log(`💾 Auto-filled TER from cache for ${formData.ticker}: ${cachedTER}%`);
      }
    }
  }, [formData.ticker]);

  const loadTransactions = () => {
    const data = getTransactions();
    setTransactions(data);
  };

  const loadBatches = () => setImportBatches(getImportBatches());

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

    if (filterCategory !== 'all') {
      filtered = filtered.filter(tx =>
        tx.macroCategory === filterCategory || tx.category === filterCategory
      );
    }

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(tx =>
        (tx.platform || 'Manuale') === filterPlatform
      );
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredTransactions(filtered);
  };

  const handleAdd = () => {
    setEditingTransaction(null);
    setFormData(getEmptyForm());
    setAutoFillSource(null);
    setShowModal(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setAutoFillSource(null);
    setFormData({
      name: transaction.name || '',
      ticker: transaction.ticker || '',
      isin: transaction.isin || '',
      macroCategory: transaction.macroCategory || transaction.category || 'ETF',
      microCategory: transaction.microCategory || transaction.subCategory || '',
      date: transaction.date || new Date().toISOString().split('T')[0],
      price: transaction.price || '',
      quantity: transaction.quantity || '',
      commission: transaction.commission || '',
      ter: transaction.ter || '',
      currency: transaction.currency || 'EUR',
      notes: transaction.notes || '',
      type: transaction.type || 'buy',
      cashFlowType: transaction.cashFlowType || 'income',
      platform: transaction.platform || 'Manuale',
    });
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

  const toggleExcludeFromStats = (tx) => {
    updateTransaction(tx.id, { excludeFromStats: !tx.excludeFromStats });
    loadTransactions();
  };

  const restoreAllExcluded = () => {
    transactions.filter(tx => tx.excludeFromStats).forEach(tx => {
      updateTransaction(tx.id, { excludeFromStats: false });
    });
    loadTransactions();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // For Cash, price and quantity are handled differently
    const isCash = formData.macroCategory === 'Cash';

    if (!formData.ticker || !formData.date) {
      alert('Compila tutti i campi obbligatori');
      return;
    }

    if (!isCash && (!formData.price || !formData.quantity)) {
      alert('Compila prezzo e quantità');
      return;
    }

    if (isCash && !formData.quantity) {
      alert('Compila l\'importo del contante');
      return;
    }

    try {
      // Check cash availability for non-cash purchases
      if (!isCash && formData.type === 'buy' && !editingTransaction) {
        const purchaseAmount = parseFloat(formData.price) * parseFloat(formData.quantity);
        const commission = formData.commission ? parseFloat(formData.commission) : 0;
        const cashCheck = checkCashAvailability(purchaseAmount, commission);

        if (!cashCheck.sufficient) {
          const confirmPurchase = window.confirm(
            `⚠️ ATTENZIONE: Liquidità insufficiente!\n\n` +
            `Necessario: €${cashCheck.needed.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n` +
            `Disponibile: €${cashCheck.available.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n` +
            `Mancano: €${cashCheck.shortfall.toLocaleString('it-IT', { minimumFractionDigits: 2 })}\n\n` +
            `Vuoi procedere comunque? (Il cash disponibile andrà in negativo)`
          );

          if (!confirmPurchase) {
            return;
          }
        }
      }

      // Auto-detect sub-category in background (silently)
      let detectedSubCategory = null;
      try {
        detectedSubCategory = await detectSubCategory(formData.ticker, formData.category);
        if (detectedSubCategory) {
          console.log(`✓ Auto-detected sub-category for ${formData.ticker}: ${detectedSubCategory}`);
        }
      } catch (error) {
        console.error('Error auto-detecting sub-category:', error);
        // Continue anyway - sub-category is optional
      }

      const transactionData = {
        ...formData,
        // For Cash: price is always 1, quantity is the amount
        price: isCash ? 1 : parseFloat(formData.price),
        quantity: parseFloat(formData.quantity),
        commission: (isCash || !formData.commission) ? 0 : parseFloat(formData.commission),
        ter: formData.ter ? parseFloat(formData.ter) : null, // Parse TER as number or null
        subCategory: detectedSubCategory || '', // Save detected sub-category silently
        // Mark as cash for special handling
        isCash: isCash
      };

      // Cache TER for future auto-fill (synchronization across same ticker)
      if (formData.ter && formData.ticker) {
        const terValue = parseFloat(formData.ter);
        cacheTER(formData.ticker, {
          ter: terValue,
          source: 'manual',
          lastUpdated: new Date().toISOString()
        });
        console.log(`💾 Cached TER for ${formData.ticker}: ${terValue}% (manual entry - will sync to other transactions)`);
      }

      if (editingTransaction) {
        updateTransaction(editingTransaction.id, transactionData);
      } else {
        addTransaction(transactionData);
      }

      setShowModal(false);
      loadTransactions();
    } catch (error) {
      alert('Errore nel salvare la transazione');
    }
  };

  const handleDeleteAll = () => {
    const first = window.confirm('Sei sicuro di voler eliminare TUTTE le transazioni? Questa azione è irreversibile.');
    if (!first) return;
    const second = window.confirm('Ultima conferma: verranno cancellate tutte le transazioni e il portafoglio verrà azzerato. Procedere?');
    if (!second) return;
    clearAllTransactions();
    loadTransactions();
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

  // ── Import: parse → dup check (auto-skip) → platform picker → confirm ────
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFilename(file.name);
    e.target.value = '';

    setImportLoading(true);
    try {
      const result = await parseCSVFile(file);
      // Pre-compute duplicates so preview can show the summary immediately
      const existing = getTransactions();
      const { duplicates, unique } = findDuplicates(result.transactions, existing);
      setDupInfo({ duplicates, unique });
      setUnknownReported(false);
      // Set editable platform label (user can override in preview)
      setImportPlatformLabel(result.platformLabel);
      setImportPreview(result);
    } catch (err) {
      alert('Errore nel leggere il file CSV: ' + err.message);
    } finally {
      setImportLoading(false);
    }
  };

  // Default confirm: auto-skip duplicates, no modal
  const handlePreviewConfirm = (opts = {}) => {
    if (!importPreview) return;
    let toImport = dupInfo ? dupInfo.unique : importPreview.transactions;
    // Opzione: escludi i ticker non riconosciuti (li caricherai dopo l'aggiornamento del DB)
    if (opts.onlyKnown && importPreview.unknownTickers?.length) {
      const unknownSet = new Set(importPreview.unknownTickers.map(u => (u.ticker || '').toUpperCase()));
      toImport = toImport.filter(tx => (tx.isCash || tx.macroCategory === 'Cash') || !unknownSet.has((tx.ticker || '').toUpperCase()));
    }
    if (toImport.length === 0) { setImportPreview(null); setDupInfo(null); return; }
    const withLabel = toImport.map(tx => ({ ...tx, platform: importPlatformLabel || tx.platform || 'Importato' }));
    doImport(withLabel);
  };

  // Segnala i ticker sconosciuti al team (mailto + salvataggio locale)
  const handleReportUnknown = () => {
    if (!importPreview?.unknownTickers?.length) return;
    reportTickers(importPreview.unknownTickers, { openMail: true });
    setUnknownReported(true);
  };

  // Override modal: user wants to manage duplicates manually
  const handleDupStrategy = (strategy) => {
    let toImport;
    if (strategy === 'unique')  toImport = dupInfo.unique;
    else if (strategy === 'all') toImport = importPreview.transactions;
    else if (strategy === 'replace') {
      const existing = getTransactions();
      const dupKeys = new Set(dupInfo.duplicates.map(d =>
        `${d.ticker?.toUpperCase()}|${d.date}|${d.type}|${Math.round(parseFloat(d.quantity) * 100)}`
      ));
      const kept = existing.filter(tx => {
        const k = `${tx.ticker?.toUpperCase()}|${tx.date}|${tx.type}|${Math.round(parseFloat(tx.quantity) * 100)}`;
        return !dupKeys.has(k);
      });
      localStorage.setItem('investment_tracker_transactions', JSON.stringify(kept));
      toImport = importPreview.transactions;
    }
    setDupStrategy(null);
    const withLabel = toImport.map(tx => ({ ...tx, platform: importPlatformLabel || tx.platform || 'Importato' }));
    doImport(withLabel);
  };

  const doImport = (txList) => {
    if (!txList || txList.length === 0) { setImportPreview(null); setDupInfo(null); return; }

    const { batchId } = bulkImportTransactions(txList, {
      platformLabel: importPreview.platformLabel,
      filename: importFilename,
      dateRange: importPreview.dateRange || '',
    });
    loadTransactions();
    loadBatches();
    setImportPreview(null);
    setDupInfo(null);

    // Check if there are buy transactions that need cash reconciliation
    const buyTx = txList.filter(tx => tx.type === 'buy' && !tx.isCash);
    if (buyTx.length > 0) {
      const totalCost = buyTx.reduce((sum, tx) => sum + (parseFloat(tx.price) || 0) * (parseFloat(tx.quantity) || 0) + (parseFloat(tx.commission) || 0), 0);
      setCashPrompt({ total: totalCost, batchId });
    }

    // Fetch prices in background
    const tickers = [...new Set(txList.filter(tx => !tx.isCash && tx.ticker).map(tx => tx.ticker))];
    if (tickers.length > 0) {
      const categoriesMap = {};
      txList.forEach(tx => { if (tx.ticker) categoriesMap[tx.ticker] = tx.macroCategory; });
      fetchMultiplePrices(tickers, categoriesMap).catch(err => console.error('Price fetch error:', err));
    }
  };

  const handleCashPrompt = (confirm) => {
    if (confirm && cashPrompt) {
      addTransaction({
        ticker: 'CASH',
        name: `Deposito — ${importPreview?.platformLabel || 'Import'}`,
        macroCategory: 'Cash',
        microCategory: 'Liquidità',
        isCash: true,
        type: 'buy',
        cashFlowType: 'income',
        price: 1,
        quantity: Math.round(cashPrompt.total * 100) / 100,
        commission: 0,
        currency: 'EUR',
        date: new Date().toISOString().split('T')[0],
        notes: `Deposito auto-generato per import ${importFilename}`,
        platform: importPreview?.platformLabel || 'Import',
        importBatchId: cashPrompt.batchId,
      });
      loadTransactions();
    }
    setCashPrompt(null);
  };

  const handleDeleteBatch = (batchId, count) => {
    if (!window.confirm(`Eliminare questo import? Verranno rimosse ${count} transazioni.`)) return;
    deleteImportBatch(batchId);
    loadTransactions();
    loadBatches();
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
          <label className={`btn-secondary flex items-center gap-2 cursor-pointer ${importLoading ? 'opacity-60 pointer-events-none' : ''}`}>
            {importLoading
              ? <Loader className="w-4 h-4 animate-spin" />
              : <FileUp className="w-4 h-4" />}
            <span className="hidden sm:inline">{importLoading ? 'Analisi...' : 'Importa CSV'}</span>
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" disabled={importLoading} />
          </label>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Esporta CSV</span>
          </button>
          <button
            onClick={() => { loadBatches(); setShowBatches(true); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Cronologia import</span>
            {importBatches.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 font-semibold">{importBatches.length}</span>
            )}
          </button>
          <button onClick={handleDeleteAll} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Elimina tutto</span>
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
          <div className="flex-[3] relative">
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
            className="select w-32 sm:w-36"
          >
            <option value="all">Tutti i tipi</option>
            <option value="buy">Acquisto</option>
            <option value="sell">Vendita</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="select w-32 sm:w-40"
          >
            <option value="all">Tutte le categorie</option>
            {getAllMacroCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="select w-32 sm:w-36"
          >
            <option value="all">Tutti i broker</option>
            {[...new Set(transactions.map(tx => tx.platform || 'Manuale'))].sort().map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Excluded-from-stats recap ─────────────────────────────────────── */}
      {(() => {
        const excluded = transactions.filter(tx => tx.excludeFromStats);
        if (!excluded.length) return null;
        return (
          <div style={{
            background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.35)',
            borderRadius: 12, padding: '12px 16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <EyeOff size={16} color="#FF9F0A" />
                <span style={{ fontWeight: 600, color: '#FF9F0A', fontSize: '0.88rem' }}>
                  {excluded.length} transazion{excluded.length === 1 ? 'e esclusa' : 'i escluse'} dalle statistiche
                </span>
                <span style={{ fontSize: '0.78rem', color: '#888' }}>
                  · non vengono conteggiate in Performance, Dashboard, Analisi
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={restoreAllExcluded}
                  style={{
                    fontSize: '0.76rem', padding: '4px 12px', borderRadius: 8,
                    background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.4)',
                    color: '#FF9F0A', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Ripristina tutte
                </button>
                <button
                  onClick={() => setExcludedExpanded(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4 }}
                >
                  {excludedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
            </div>

            {excludedExpanded && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {excluded.map(tx => (
                  <div key={tx.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ color: '#888', minWidth: 75 }}>{tx.date}</span>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 5,
                        background: tx.type === 'buy' ? 'rgba(48,209,88,0.15)' : 'rgba(255,69,58,0.15)',
                        color: tx.type === 'buy' ? '#30D158' : '#FF453A'
                      }}>
                        {tx.type === 'buy' ? 'ACQUISTO' : 'VENDITA'}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-1, #fff)' }}>{tx.ticker}</span>
                      <span style={{ color: '#888' }}>{tx.name}</span>
                      <span style={{ color: 'var(--text-2, #ccc)' }}>
                        €{(tx.quantity * tx.price).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleExcludeFromStats(tx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: '0.72rem', padding: '3px 10px', borderRadius: 6,
                        background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.3)',
                        color: '#30D158', cursor: 'pointer', fontWeight: 600
                      }}
                    >
                      <Eye size={12} /> Ripristina
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
                  <th>Broker</th>
                  <th>MACRO</th>
                  <th>MICRO</th>
                  <th className="text-right">Quantità</th>
                  <th className="text-right">Prezzo</th>
                  <th className="text-right">Totale</th>
                  <th className="text-right">Commissioni</th>
                  <th className="text-right">TER %</th>
                  <th className="text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} style={tx.excludeFromStats ? { opacity: 0.45 } : {}}>
                    <td>{formatDate(tx.date)}</td>
                    <td>
                      <span className={`badge ${tx.type === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                        {tx.type === 'buy' ? 'Acquisto' : 'Vendita'}
                      </span>
                    </td>
                    <td className="font-semibold">
                      {tx.ticker}
                      {tx.excludeFromStats && (
                        <span style={{
                          marginLeft: 5, fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px',
                          borderRadius: 4, background: 'rgba(255,159,10,0.18)', color: '#FF9F0A',
                          verticalAlign: 'middle'
                        }}>ESCLUSA</span>
                      )}
                    </td>
                    <td className="text-gray-600 max-w-xs truncate">{tx.name || '-'}</td>
                    <td>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, padding: '2px 7px',
                        borderRadius: 6, background: '#f0f4ff', color: '#3b5bdb',
                        border: '1px solid #dbe4ff', whiteSpace: 'nowrap',
                      }}>
                        {tx.platform || 'Manuale'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-primary">{tx.macroCategory || tx.category || '-'}</span>
                    </td>
                    <td>
                      {(tx.microCategory || tx.subCategory) ? (
                        <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                          {tx.microCategory || tx.subCategory}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Non rilevata</span>
                      )}
                    </td>
                    <td className="text-right">{tx.quantity.toLocaleString('it-IT', { maximumFractionDigits: 8 })}</td>
                    <td className="text-right">€{tx.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                    <td className="text-right font-medium">
                      €{(tx.quantity * tx.price).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                    </td>
                    <td className="text-right">
                      {tx.commission && tx.commission > 0 ? (
                        <span className="text-orange-700">
                          €{tx.commission.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right">
                      {tx.ter && tx.ter > 0 ? (
                        <span className="text-sm font-medium text-purple-700">
                          {tx.ter.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleExcludeFromStats(tx)}
                          title={tx.excludeFromStats ? 'Includi nelle statistiche' : 'Escludi dalle statistiche'}
                          style={{
                            padding: 7, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: tx.excludeFromStats ? 'rgba(255,159,10,0.15)' : 'transparent',
                            color: tx.excludeFromStats ? '#FF9F0A' : '#aaa',
                            transition: 'all 0.15s'
                          }}
                        >
                          {tx.excludeFromStats ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
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

              {/* Cash Flow Type (only for Cash) */}
              {formData.macroCategory === 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo Movimento *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cashFlowType: 'income' })}
                      className={`p-4 rounded-lg border-2 font-medium transition-all ${
                        formData.cashFlowType === 'income'
                          ? 'border-success-600 bg-success-50 text-success-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      💰 Entrata (Guadagno)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cashFlowType: 'expense' })}
                      className={`p-4 rounded-lg border-2 font-medium transition-all ${
                        formData.cashFlowType === 'expense'
                          ? 'border-danger-600 bg-danger-50 text-danger-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      💸 Uscita (Spesa)
                    </button>
                  </div>
                </div>
              )}

              {/* Ticker & Name */}
              <div className={formData.macroCategory === 'Cash' ? '' : 'grid grid-cols-2 gap-4'}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    {formData.macroCategory === 'Cash' ? 'Descrizione *' : 'Ticker *'}
                  </label>
                  <input
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => handleTickerChange(e.target.value)}
                    placeholder={formData.macroCategory === 'Cash' ? 'es. Contante, Conto Corrente, Deposito...' : 'VWCE.DE'}
                    className="input"
                    required
                  />
                  {!editingTransaction && formData.macroCategory !== 'Cash' && autoFillSource === 'mapping' && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Riconosciuto dal database centrale - MACRO/MICRO auto-compilati
                    </p>
                  )}
                  {!editingTransaction && formData.macroCategory !== 'Cash' && autoFillSource === 'history' && (
                    <p className="text-xs text-blue-600 mt-1">
                      📋 Form auto-compilato dall'ultima transazione
                    </p>
                  )}
                  {formData.macroCategory === 'Cash' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Esempio: "Conto Corrente Intesa", "Contante Portafoglio", "Deposito Vincolato"
                    </p>
                  )}
                </div>
                {formData.macroCategory !== 'Cash' && (
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
                )}
              </div>

              {/* ISIN - Only show if NOT Cash */}
              {formData.macroCategory !== 'Cash' && (
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
              )}

              {/* MACRO Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MACRO-Asset Class *
                </label>
                <select
                  value={formData.macroCategory}
                  onChange={(e) => setFormData({ ...formData, macroCategory: e.target.value, microCategory: '' })}
                  className="select"
                  required
                >
                  {getAllMacroCategories().map(macro => (
                    <option key={macro} value={macro}>{macro}</option>
                  ))}
                </select>
              </div>

              {/* MICRO Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MICRO-Asset Class
                  {formData.macroCategory && Object.keys(availableMicroCategories).length > 0 && ' *'}
                </label>
                <select
                  value={formData.microCategory}
                  onChange={(e) => setFormData({ ...formData, microCategory: e.target.value })}
                  className="select"
                  required={formData.macroCategory && Object.keys(availableMicroCategories).length > 0}
                  disabled={!formData.macroCategory || Object.keys(availableMicroCategories).length === 0}
                >
                  <option value="">-- Seleziona --</option>
                  {Object.keys(availableMicroCategories).map(micro => (
                    <option key={micro} value={micro}>{micro}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {!formData.macroCategory && 'Seleziona prima una MACRO-Asset Class'}
                  {formData.macroCategory && Object.keys(availableMicroCategories).length === 0 && 'Nessuna sottocategoria disponibile'}
                </p>
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

              {/* Price & Quantity - Different for Cash */}
              {formData.macroCategory === 'Cash' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Importo € *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1000.00"
                    className="input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Importo totale in euro del contante
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Prezzo *
                    </label>
                    <input
                      type="number"
                      step="any"
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
                      step="any"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0.0000"
                      className="input"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Currency & Commission - No commission for Cash */}
              {formData.macroCategory === 'Cash' ? (
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
              ) : (
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commissioni €
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.commission}
                      onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                      placeholder="0.00"
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Commissioni di broker/exchange
                    </p>
                  </div>
                </div>
              )}

              {/* TER Field - Only show if NOT Cash */}
              {formData.macroCategory !== 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    TER (Total Expense Ratio) %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.ter}
                    onChange={(e) => setFormData({ ...formData, ter: e.target.value })}
                    placeholder="0.22"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.ter
                      ? `Costo annuale: ~${formData.ter}% del patrimonio investito`
                      : 'Inserisci il TER manualmente. Verrà salvato e sincronizzato per lo stesso ticker'}
                  </p>
                </div>
              )}

              {/* Total Preview */}
              {formData.quantity && (formData.macroCategory === 'Cash' || formData.price) && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-primary-700 mb-1">
                        {formData.macroCategory === 'Cash' ? 'Importo Contante' : 'Totale Operazione'}
                      </p>
                      <p className="text-2xl font-bold text-primary-900">
                        €{formData.macroCategory === 'Cash'
                          ? parseFloat(formData.quantity).toFixed(2)
                          : (parseFloat(formData.price) * parseFloat(formData.quantity)).toFixed(2)
                        }
                      </p>
                    </div>
                    {formData.macroCategory !== 'Cash' && formData.commission && parseFloat(formData.commission) > 0 && (
                      <div>
                        <p className="text-sm text-primary-700 mb-1">Commissioni</p>
                        <p className="text-lg font-semibold text-orange-700">
                          +€{parseFloat(formData.commission).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Totale: €{((parseFloat(formData.price) * parseFloat(formData.quantity)) + parseFloat(formData.commission)).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broker / Piattaforma
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="select"
                >
                  {PLATFORM_OPTIONS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Broker o piattaforma usata per questa transazione
                </p>
              </div>

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
      {/* ── IMPORT PREVIEW MODAL ───────────────────────────────────────── */}
      {importPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
        }}>
          <div style={{
            background: 'var(--surface-1)', borderRadius: 16, width: '100%', maxWidth: 780,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #0A84FF, #30D158)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FileUp size={16} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Anteprima importazione</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 1 }}>
                  File: <span style={{ fontStyle: 'italic' }}>{importFilename}</span>
                </div>
              </div>
              <button onClick={() => { setImportPreview(null); setDupInfo(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Platform picker row */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}>🏦 Piattaforma:</span>
              <select
                value={importPlatformLabel}
                onChange={e => setImportPlatformLabel(e.target.value)}
                style={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: '#0A84FF', border: '1.5px solid #0A84FF', borderRadius: 7, padding: '4px 10px', background: 'var(--surface-1)', cursor: 'pointer' }}
              >
                {['Fineco', 'DeGiro', 'Trading 212', 'IBKR', 'Binance', 'Crypto.com', 'Coinbase', 'Manuale', 'Formato generico (export app)', importPlatformLabel]
                  .filter((v, i, a) => v && a.indexOf(v) === i)
                  .map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {(importPreview.platform === 'generic' || importPreview.platform === 'unknown') && (
                <span style={{ fontSize: '0.68rem', color: '#FF9F0A', whiteSpace: 'nowrap' }}>⚠️ Seleziona il broker corretto</span>
              )}
            </div>

            {/* Stats row */}
            <div style={{
              display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div style={{ flex: 1, padding: '12px 20px', borderRight: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} color="#30D158" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Da importare</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#30D158', lineHeight: 1.1 }}>
                  {dupInfo ? dupInfo.unique.length : importPreview.transactions.length}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>transazioni nuove</div>
              </div>
              <div style={{ flex: 1, padding: '12px 20px', borderRight: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color={dupInfo?.duplicates.length > 0 ? '#FF9F0A' : 'var(--text-3)'} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Duplicate</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: dupInfo?.duplicates.length > 0 ? '#FF9F0A' : 'var(--text-3)', lineHeight: 1.1 }}>
                  {dupInfo?.duplicates.length ?? 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
                  {dupInfo?.duplicates.length > 0 ? 'saltate auto.' : 'nessuna'}
                </div>
              </div>
              <div style={{ flex: 1, padding: '12px 20px', borderRight: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} color="#FF9F0A" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Scartate</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: importPreview.skipped.length > 0 ? '#FF9F0A' : 'var(--text-3)', lineHeight: 1.1 }}>
                  {importPreview.skipped.length}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>righe non valide</div>
              </div>
              <div style={{ flex: 1, padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} color="#0A84FF" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Avvisi</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: importPreview.warnings.length > 0 ? '#FF453A' : 'var(--text-3)', lineHeight: 1.1 }}>
                  {importPreview.warnings.length}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>messaggi</div>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Warnings */}
              {importPreview.warnings.length > 0 && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)' }}>
                  {importPreview.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: '#FF453A', display: 'flex', gap: 6 }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Ticker non riconosciuti — rischio prezzo/statistiche */}
              {importPreview.unknownTickers?.length > 0 && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <AlertTriangle size={15} color="#FF9F0A" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>
                        {importPreview.unknownTickers.length} {importPreview.unknownTickers.length === 1 ? 'titolo non ancora nel database' : 'titoli non ancora nel database'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-2)', marginTop: 3, lineHeight: 1.5 }}>
                        Per questi titoli il prezzo di mercato potrebbe non essere trovato → verrebbe usato il costo di carico,
                        alterando leggermente le statistiche. Puoi <strong>segnalarli</strong> per farli aggiungere, oppure
                        <strong> importare solo i riconosciuti</strong> e ricaricare il CSV quando saranno disponibili.
                      </div>
                    </div>
                  </div>
                  {/* Lista */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {importPreview.unknownTickers.map(u => (
                      <span key={u.ticker} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 9px', fontSize: '0.72rem' }}>
                        <strong style={{ color: 'var(--text-1)' }}>{u.ticker}</strong>
                        {u.name && u.name !== u.ticker && <span style={{ color: 'var(--text-3)' }}>{u.name.slice(0, 22)}</span>}
                      </span>
                    ))}
                  </div>
                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleReportUnknown}
                      disabled={unknownReported}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: unknownReported ? 'var(--surface-2)' : '#FF9F0A', color: unknownReported ? 'var(--text-3)' : '#1a1a1a', fontSize: '0.75rem', fontWeight: 700, cursor: unknownReported ? 'default' : 'pointer' }}>
                      {unknownReported ? '✓ Segnalati' : '✉ Segnala al team'}
                    </button>
                    <button
                      onClick={() => handlePreviewConfirm({ onlyKnown: true })}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      Importa solo i riconosciuti
                    </button>
                  </div>
                </div>
              )}

              {/* Skipped rows summary */}
              {importPreview.skipped.length > 0 && (
                <details style={{ fontSize: '0.78rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#FF9F0A', fontWeight: 600, marginBottom: 6 }}>
                    ⚠️ {importPreview.skipped.length} righe ignorate — clicca per dettagli
                  </summary>
                  <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {importPreview.skipped.slice(0, 30).map((s, i) => (
                      <div key={i} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(255,159,10,0.06)', border: '1px solid rgba(255,159,10,0.15)', fontSize: '0.7rem', color: 'var(--text-2)' }}>
                        <span style={{ color: '#FF9F0A', fontWeight: 700 }}>Riga {s.rowIndex + 2}</span> — {s.reason}
                      </div>
                    ))}
                    {importPreview.skipped.length > 30 && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', textAlign: 'center' }}>... e altre {importPreview.skipped.length - 30}</div>
                    )}
                  </div>
                </details>
              )}

              {/* Preview table */}
              {importPreview.transactions.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                    Anteprima prime {Math.min(8, importPreview.transactions.length)} righe:
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                          {['Ticker', 'Nome', 'Data', 'Tipo', 'Prezzo', 'Quantità', 'Comm.', 'Categoria'].map(h => (
                            <th key={h} style={{ padding: '5px 8px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.62rem' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.transactions.slice(0, 8).map((tx, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                            <td style={{ padding: '6px 8px', fontWeight: 700, color: tx.type === 'buy' ? '#30D158' : '#FF453A' }}>{tx.ticker}</td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.name}</td>
                            <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{tx.date}</td>
                            <td style={{ padding: '6px 8px' }}>
                              <span style={{ padding: '2px 7px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700,
                                background: tx.type === 'buy' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
                                color: tx.type === 'buy' ? '#30D158' : '#FF453A' }}>
                                {tx.type === 'buy' ? 'ACQ' : 'VND'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                              {tx.price > 0 ? `€${tx.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : <span style={{ color: '#FF9F0A' }}>—</span>}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }}>{tx.quantity.toLocaleString('it-IT', { maximumFractionDigits: 6 })}</td>
                            <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-3)' }}>
                              {tx.commission > 0 ? `€${tx.commission.toFixed(2)}` : '—'}
                            </td>
                            <td style={{ padding: '6px 8px', color: 'var(--text-3)' }}>{tx.macroCategory}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.transactions.length > 8 && (
                      <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 6 }}>
                        ... e altre {importPreview.transactions.length - 8} transazioni
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  Nessuna transazione valida trovata nel file.
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              {/* Dup management shortcut */}
              {dupInfo?.duplicates.length > 0 && (
                <button
                  onClick={() => setDupStrategy({ duplicates: dupInfo.duplicates, unique: dupInfo.unique, total: importPreview.transactions.length })}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #FF9F0A', background: 'rgba(255,159,10,0.06)', cursor: 'pointer', color: '#a05c00', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  ↺ Gestisci {dupInfo.duplicates.length} duplicate
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button onClick={() => { setImportPreview(null); setDupInfo(null); }} style={{
                padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', cursor: 'pointer', color: 'var(--text-2)',
                fontSize: '0.82rem', fontWeight: 600,
              }}>Annulla</button>
              {(() => {
                const n = dupInfo ? dupInfo.unique.length : importPreview.transactions.length;
                return (
                  <button
                    onClick={handlePreviewConfirm}
                    disabled={n === 0}
                    style={{
                      padding: '9px 24px', borderRadius: 8, border: 'none',
                      background: n > 0 ? '#30D158' : 'var(--surface-3)',
                      cursor: n > 0 ? 'pointer' : 'not-allowed',
                      color: n > 0 ? '#fff' : 'var(--text-3)',
                      fontSize: '0.82rem', fontWeight: 700,
                      boxShadow: n > 0 ? '0 2px 12px rgba(48,209,88,0.4)' : 'none',
                    }}
                  >
                    ✓ Importa {n} transazioni
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── DUPLICATE STRATEGY MODAL ──────────────────────────────────────── */}
      {dupStrategy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>⚠️ Transazioni duplicate trovate</div>
            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 20 }}>
              <strong style={{ color: '#FF9F0A' }}>{dupStrategy.duplicates.length}</strong> transazioni su {dupStrategy.total} esistono già nel portafoglio (stesso ticker, data, tipo e quantità).
              Come vuoi procedere?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => handleDupStrategy('unique')} style={{ padding: '14px 16px', borderRadius: 10, border: '2px solid #30D158', background: 'rgba(48,209,88,0.06)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1a7a35' }}>✓ Aggiungi solo le nuove ({dupStrategy.unique.length})</div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 3 }}>Importa solo le transazioni che non esistono già. Consigliato.</div>
              </button>
              <button onClick={() => handleDupStrategy('replace')} style={{ padding: '14px 16px', borderRadius: 10, border: '2px solid #FF9F0A', background: 'rgba(255,159,10,0.06)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#a05c00' }}>↺ Sostituisci i duplicati ({dupStrategy.duplicates.length})</div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 3 }}>Elimina le versioni esistenti e importa quelle nuove.</div>
              </button>
              <button onClick={() => handleDupStrategy('all')} style={{ padding: '14px 16px', borderRadius: 10, border: '2px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151' }}>+ Aggiungi tutte ({dupStrategy.total})</div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginTop: 3 }}>Importa tutto inclusi i duplicati. Crea transazioni doppie.</div>
              </button>
            </div>
            <button onClick={() => setDupStrategy(null)} style={{ marginTop: 16, width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── CASH PROMPT MODAL ─────────────────────────────────────────────── */}
      {cashPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 420, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>💰 Registrare il deposito?</div>
            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 8 }}>
              Hai importato acquisti per un totale di <strong>€{cashPrompt.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.
            </p>
            <p style={{ fontSize: '0.82rem', color: '#666', marginBottom: 20 }}>
              Vuoi creare automaticamente una voce Cash di deposito corrispondente? Senza di essa il saldo cash risulterà negativo.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleCashPrompt(false)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', color: '#666', fontWeight: 600 }}>
                No, lo gestisco io
              </button>
              <button onClick={() => handleCashPrompt(true)} style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: '#0A84FF', cursor: 'pointer', fontSize: '0.82rem', color: '#fff', fontWeight: 700 }}>
                Sì, crea deposito €{cashPrompt.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CRONOLOGIA IMPORT MODAL ────────────────────────────────────────── */}
      {showBatches && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Cronologia Import</div>
              <button onClick={() => setShowBatches(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {importBatches.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', padding: '32px' }}>Nessun import registrato.</div>
              ) : importBatches.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: '1px solid #f0f0f0', background: '#fafafa' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#0A84FF,#30D158)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileUp size={15} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{b.platformLabel}</div>
                    <div style={{ fontSize: '0.68rem', color: '#888', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {new Date(b.importedAt).toLocaleString('it-IT')} · {b.count} transazioni
                      {b.dateRange && ` · ${b.dateRange}`}
                    </div>
                    {b.filename && <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: 1 }}>{b.filename}</div>}
                  </div>
                  <button
                    onClick={() => handleDeleteBatch(b.id, b.count)}
                    style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #ffdddd', background: '#fff5f5', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#cc2222', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
