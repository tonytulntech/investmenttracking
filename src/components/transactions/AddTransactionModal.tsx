'use client';

import { useState } from 'react';
import { X, Search, Loader2, Calendar, ArrowDownLeft, ArrowUpRight, Coins, TrendingUp, Globe } from 'lucide-react';

interface ETFResult {
  id: string;
  ticker: string;
  code: string;
  exchange: string;
  name: string;
  isin: string;
  type: string;
  currency: string;
  asset_class: string;
  region: string;
  provider: string;
  ter: number;
  distribution: string;
  exchanges_count: number;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: {
    ticker: string;
    name: string;
    isin?: string;
    type: 'BUY' | 'SELL' | 'DIVIDEND';
    shares: number;
    price: number;
    fees: number;
    date: string;
    notes?: string;
    asset_class?: string;
    region?: string;
  }) => Promise<void>;
}

export function AddTransactionModal({ isOpen, onClose, onAdd }: AddTransactionModalProps) {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ETFResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<{
    ticker: string;
    name: string;
    isin: string;
    asset_class: string;
    region: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    type: 'BUY' as 'BUY' | 'SELL' | 'DIVIDEND',
    shares: '',
    price: '',
    fees: '0',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Search local ETF database (zero API calls!)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/etf/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('Ricerca fallita');
      }

      const results: ETFResult[] = await response.json();

      if (results.length === 0) {
        setSearchError('Nessun risultato. Prova con "VWCE", "CSPX", "IWDA"...');
      }

      setSearchResults(results);
    } catch (error) {
      setSearchError('Errore nella ricerca. Riprova.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAsset = (etf: ETFResult) => {
    setSelectedAsset({
      ticker: etf.ticker,
      name: etf.name,
      isin: etf.isin,
      asset_class: etf.asset_class,
      region: etf.region,
    });
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setSubmitting(true);
    try {
      await onAdd({
        ticker: selectedAsset.ticker,
        name: selectedAsset.name,
        isin: selectedAsset.isin,
        type: formData.type,
        shares: parseFloat(formData.shares),
        price: parseFloat(formData.price),
        fees: parseFloat(formData.fees) || 0,
        date: formData.date,
        notes: formData.notes || undefined,
        asset_class: selectedAsset.asset_class,
        region: selectedAsset.region,
      });

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      alert(`Errore: ${error?.message || 'Impossibile salvare. Riprova.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAsset(null);
    setSearchError(null);
    setFormData({
      type: 'BUY',
      shares: '',
      price: '',
      fees: '0',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUY': return <ArrowDownLeft className="w-4 h-4" />;
      case 'SELL': return <ArrowUpRight className="w-4 h-4" />;
      case 'DIVIDEND': return <Coins className="w-4 h-4" />;
    }
  };

  const getExchangeLabel = (exchange: string) => {
    switch (exchange) {
      case 'XETRA': return '🇩🇪 Xetra';
      case 'MI': return '🇮🇹 Milano';
      case 'LSE': return '🇬🇧 Londra';
      case 'US': return '🇺🇸 USA';
      case 'PA': return '🇫🇷 Parigi';
      case 'AS': return '🇳🇱 Amsterdam';
      default: return exchange;
    }
  };

  const getAssetClassBadge = (assetClass: string) => {
    const styles: Record<string, string> = {
      equity: 'bg-blue-100 text-blue-700',
      bond: 'bg-amber-100 text-amber-700',
      commodity: 'bg-yellow-100 text-yellow-700',
      crypto: 'bg-purple-100 text-purple-700',
      cash: 'bg-slate-100 text-slate-700',
    };
    return styles[assetClass] || 'bg-slate-100 text-slate-700';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            {step === 'search' ? 'Cerca ETF' : 'Nuova Transazione'}
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === 'search' ? (
            <div className="space-y-4">
              {/* Search info */}
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Ricerca locale - nessun consumo API</span>
              </div>

              {/* Search input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca per ticker (VWCE, CSPX, IWDA...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cerca'}
                </button>
              </div>

              {searchError && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">{searchError}</p>
              )}

              {/* Results */}
              <div className="max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((etf) => (
                      <button
                        key={etf.id}
                        onClick={() => handleSelectAsset(etf)}
                        className="w-full p-4 text-left rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{etf.code}</span>
                              <span className="text-xs text-slate-500">{getExchangeLabel(etf.exchange)}</span>
                              {etf.type === 'ETF' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${getAssetClassBadge(etf.asset_class)}`}>
                                  {etf.asset_class}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate mt-0.5">{etf.name}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                              {etf.provider && <span>{etf.provider}</span>}
                              {etf.ter && <span>TER: {(etf.ter * 100).toFixed(2)}%</span>}
                              {etf.distribution && (
                                <span className={etf.distribution === 'ACC' ? 'text-blue-500' : 'text-green-500'}>
                                  {etf.distribution === 'ACC' ? '📈 Acc' : '💰 Dist'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                            etf.type === 'ETF' ? 'bg-emerald-100 text-emerald-700' :
                            etf.type === 'ETC' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {etf.type}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !searchError && !searching && (
                  <div className="text-center py-8 text-slate-400">
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Cerca un ETF o ETC</p>
                    <p className="text-sm mt-2">Es: VWCE, CSPX, IWDA, SGLD, EIMI</p>
                    <p className="text-xs mt-3 text-slate-300">Disponibili sia .XETRA che .MI</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedAsset({ ticker: '', name: '', isin: '', asset_class: 'equity', region: 'Global' });
                    setStep('details');
                  }}
                  className="w-full p-3 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Inserisci manualmente →
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo Transazione</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['BUY', 'SELL', 'DIVIDEND'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                        formData.type === type
                          ? type === 'BUY' ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : type === 'SELL' ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {getTypeIcon(type)}
                      <span className="font-medium">{type === 'BUY' ? 'Acquisto' : type === 'SELL' ? 'Vendita' : 'Dividendo'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticker & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ticker *</label>
                  <input
                    type="text"
                    value={selectedAsset?.ticker || ''}
                    onChange={(e) => setSelectedAsset(prev => prev ? {...prev, ticker: e.target.value} : null)}
                    placeholder="VWCE.XETRA"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={selectedAsset?.name || ''}
                    onChange={(e) => setSelectedAsset(prev => prev ? {...prev, name: e.target.value} : null)}
                    placeholder="Vanguard FTSE All-World"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Shares & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {formData.type === 'DIVIDEND' ? 'Shares (per calcolo)' : 'Quantità *'}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.shares}
                    onChange={(e) => setFormData(prev => ({...prev, shares: e.target.value}))}
                    placeholder="10"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {formData.type === 'DIVIDEND' ? 'Dividendo per share (€)' : 'Prezzo (€) *'}
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({...prev, price: e.target.value}))}
                    placeholder={formData.type === 'DIVIDEND' ? '0.42' : '100.50'}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Date & Fees */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Commissioni (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fees}
                    onChange={(e) => setFormData(prev => ({...prev, fees: e.target.value}))}
                    placeholder="1.50"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                  placeholder="PAC mensile, broker XYZ..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Total Preview */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Totale</span>
                  <span className="text-lg font-bold text-slate-900">
                    €{((parseFloat(formData.shares) || 0) * (parseFloat(formData.price) || 0) + (parseFloat(formData.fees) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep('search')}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-colors disabled:opacity-50 ${
                    formData.type === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600'
                      : formData.type === 'SELL' ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {getTypeIcon(formData.type)}
                      <span>{formData.type === 'BUY' ? 'Registra Acquisto' : formData.type === 'SELL' ? 'Registra Vendita' : 'Registra Dividendo'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
