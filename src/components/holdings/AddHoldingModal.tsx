'use client';

import { useState } from 'react';
import { X, Search, Plus, Loader2 } from 'lucide-react';
import { getCachedSearch } from '@/lib/eodhd-cached';

interface AddHoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (holding: {
    ticker: string;
    name: string;
    isin: string;
    shares: number;
    avg_price: number;
    asset_class: 'equity' | 'bond' | 'commodity' | 'crypto' | 'cash';
    region: string;
  }) => Promise<void>;
}

export function AddHoldingModal({ isOpen, onClose, onAdd }: AddHoldingModalProps) {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState<{
    ticker: string;
    name: string;
    isin: string;
    exchange: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    shares: '',
    avg_price: '',
    asset_class: 'equity' as const,
    region: 'Global',
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const results = await getCachedSearch(searchQuery);
      setSearchResults(results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAsset = (asset: any) => {
    setSelectedAsset({
      ticker: `${asset.Code}.${asset.Exchange}`,
      name: asset.Name,
      isin: asset.ISIN || '',
      exchange: asset.Exchange,
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
        shares: parseFloat(formData.shares),
        avg_price: parseFloat(formData.avg_price),
        asset_class: formData.asset_class,
        region: formData.region,
      });

      // Reset and close
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding holding:', error);
      alert('Errore durante il salvataggio. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedAsset(null);
    setFormData({
      shares: '',
      avg_price: '',
      asset_class: 'equity',
      region: 'Global',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            {step === 'search' ? 'Cerca ETF/Azione' : 'Dettagli Posizione'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'search' ? (
            <div className="space-y-4">
              {/* Search input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cerca per nome o ticker (es. VWCE, S&P 500)..."
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

              {/* Search results */}
              <div className="max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectAsset(result)}
                        className="w-full p-4 text-left rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {result.Code}
                              <span className="text-slate-400 font-normal ml-2">
                                {result.Exchange}
                              </span>
                            </p>
                            <p className="text-sm text-slate-500 truncate max-w-[300px]">
                              {result.Name}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                            {result.Type}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery && !searching ? (
                  <div className="text-center py-8 text-slate-500">
                    Nessun risultato. Prova con un altro termine.
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    Cerca un ETF o azione da aggiungere al portfolio
                  </div>
                )}
              </div>

              {/* Manual entry option */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedAsset({
                      ticker: '',
                      name: '',
                      isin: '',
                      exchange: '',
                    });
                    setStep('details');
                  }}
                  className="w-full p-3 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Oppure inserisci manualmente →
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ticker & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ticker *
                  </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ISIN
                  </label>
                  <input
                    type="text"
                    value={selectedAsset?.isin || ''}
                    onChange={(e) => setSelectedAsset(prev => prev ? {...prev, isin: e.target.value} : null)}
                    placeholder="IE00BK5BQT80"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={selectedAsset?.name || ''}
                  onChange={(e) => setSelectedAsset(prev => prev ? {...prev, name: e.target.value} : null)}
                  placeholder="Vanguard FTSE All-World UCITS ETF"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Shares & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantità *
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
                    Prezzo Medio (€) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.avg_price}
                    onChange={(e) => setFormData(prev => ({...prev, avg_price: e.target.value}))}
                    placeholder="100.50"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Asset Class & Region */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Asset Class
                  </label>
                  <select
                    value={formData.asset_class}
                    onChange={(e) => setFormData(prev => ({...prev, asset_class: e.target.value as any}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="equity">Azionario</option>
                    <option value="bond">Obbligazionario</option>
                    <option value="commodity">Commodities</option>
                    <option value="crypto">Crypto</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Regione
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData(prev => ({...prev, region: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="Global">Globale</option>
                    <option value="USA">USA</option>
                    <option value="Europe">Europa</option>
                    <option value="Emerging">Emergenti</option>
                    <option value="Asia">Asia</option>
                    <option value="Other">Altro</option>
                  </select>
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Aggiungi
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
