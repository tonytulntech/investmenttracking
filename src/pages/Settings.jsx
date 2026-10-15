import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Trash2, Database, Download, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { getSettings, updateSettings, getStorageInfo, clearAllTransactions, exportTransactions, updateAllSubCategories, exportFullBackup, restoreFullBackup } from '../services/localStorageService';
import { clearTERCache, getCachedTERs } from '../services/terCache';
import { clearPriceCache } from '../services/priceCache';
import { format } from 'date-fns';
import Papa from 'papaparse';
import { useMode } from '../context/ModeContext';
import { MODES } from '../config/modes';

function Settings() {
  const { mode, setMode } = useMode();
  const [settings, setSettings] = useState(getSettings());
  const [storageInfo, setStorageInfo] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [updatingSubCategories, setUpdatingSubCategories] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = () => {
    const info = getStorageInfo();
    setStorageInfo(info);
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettings(newSettings);
  };

  const handleClearData = () => {
    try {
      clearAllTransactions();
      setShowClearConfirm(false);
      loadStorageInfo();
      alert('Tutti i dati sono stati eliminati');
    } catch (error) {
      alert('Errore nell\'eliminazione dei dati');
    }
  };

  const handleExportBackup = () => {
    const data = exportTransactions();
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    try {
      const backup = exportFullBackup();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investitore_backup_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Errore durante l\'esportazione: ' + error.message);
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const backup = JSON.parse(evt.target.result);
        if (!window.confirm('Importare il backup? I dati attuali verranno sovrascritti.')) return;
        const count = restoreFullBackup(backup);
        alert(`Backup ripristinato! ${count} chiavi importate.\nRicarica la pagina per applicare.`);
        loadStorageInfo();
      } catch (error) {
        alert('Errore: ' + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleUpdateSubCategories = async () => {
    try {
      setUpdatingSubCategories(true);
      const result = await updateAllSubCategories();

      if (result.success) {
        alert(
          `✅ Aggiornamento completato!\n\n` +
          `• Totale transazioni: ${result.total}\n` +
          `• Aggiornate: ${result.updated}\n` +
          `• Saltate (già presenti): ${result.skipped}\n` +
          `• Errori: ${result.errors}\n\n` +
          `Ricarica la pagina per vedere le modifiche.`
        );
        loadStorageInfo();
      }
    } catch (error) {
      console.error('Error updating sub-categories:', error);
      alert('❌ Errore durante l\'aggiornamento delle sotto-categorie');
    } finally {
      setUpdatingSubCategories(false);
    }
  };

  const handleClearTERCache = () => {
    try {
      const cachedTERs = getCachedTERs();
      const count = Object.keys(cachedTERs).length;

      if (count === 0) {
        alert('ℹ️ Nessun TER in cache da eliminare');
        return;
      }

      if (window.confirm(`Vuoi eliminare ${count} TER dalla cache? I TER verranno ri-fetchati automaticamente.`)) {
        clearTERCache();
        alert(`✅ Cache TER pulita! Eliminati ${count} TER.\n\nRicarica la pagina per ri-fetchare i TER corretti.`);
        loadStorageInfo();
      }
    } catch (error) {
      console.error('Error clearing TER cache:', error);
      alert('❌ Errore durante la pulizia della cache TER');
    }
  };

  const handleClearPriceCache = () => {
    try {
      if (window.confirm('Vuoi eliminare la cache dei prezzi? I prezzi verranno ri-fetchati automaticamente.')) {
        clearPriceCache();
        alert('✅ Cache prezzi pulita!\n\nRicarica la pagina per aggiornare i prezzi.');
        loadStorageInfo();
      }
    } catch (error) {
      console.error('Error clearing price cache:', error);
      alert('❌ Errore durante la pulizia della cache prezzi');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-1)' }}>Impostazioni</h1>
        <p style={{ color: 'var(--text-2)', marginTop: '0.25rem' }}>Gestisci le preferenze dell'app</p>
      </div>

      {/* Modalità */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-1">Modalità di utilizzo</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
          Cambia quante pagine vedi. I tuoi dati non cambiano.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Modalità di utilizzo">
          {Object.entries(MODES).map(([key, m]) => {
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(key)}
                className="text-left rounded-lg p-4 transition-colors"
                style={{
                  background: active ? 'var(--accent-weak)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{m.label}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{m.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* General Settings */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Impostazioni Generali
        </h2>

        <div className="space-y-4">
          {/* Currency */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
              Valuta Predefinita
            </label>
            <select
              value={settings.currency}
              onChange={(e) => handleSettingChange('currency', e.target.value)}
              className="select max-w-xs"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-2)' }}>
              Formato Data
            </label>
            <select
              value={settings.dateFormat}
              onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
              className="select max-w-xs"
            >
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>

          {/* Auto Refresh */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-2)' }}>
                Aggiornamento Automatico Prezzi
              </label>
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                Aggiorna i prezzi automaticamente quando apri l'app
              </p>
            </div>
            <button
              onClick={() => handleSettingChange('autoRefreshPrices', !settings.autoRefreshPrices)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                settings.autoRefreshPrices ? 'bg-primary-600' : ''
              }`}
              style={{ minHeight: 24, ...(settings.autoRefreshPrices ? {} : { background: 'var(--surface-2)', border: '1px solid var(--border)' }) }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                  settings.autoRefreshPrices ? 'translate-x-6' : 'translate-x-1'
                }`}
                style={{ background: settings.autoRefreshPrices ? '#fff' : 'var(--text-3)' }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Storage Info */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          Dati e Archiviazione
        </h2>

        {storageInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>Transazioni</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>{storageInfo.transactionsCount}</p>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>Spazio Usato</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-1)' }}>
                  {(storageInfo.storageSize / 1024).toFixed(2)} KB
                </p>
              </div>
              <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)' }}>
                <p className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>Ultimo Sync</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {storageInfo.lastSync
                    ? format(new Date(storageInfo.lastSync), 'dd/MM/yyyy HH:mm')
                    : 'Mai'
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportJSON}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Backup Completo (JSON)
              </button>
              <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Ripristina Backup
                <input type="file" accept=".json" onChange={handleImportJSON} hidden />
              </label>
              <button
                onClick={handleExportBackup}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Esporta CSV
              </button>
              <button
                onClick={handleUpdateSubCategories}
                disabled={updatingSubCategories}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${updatingSubCategories ? 'animate-spin' : ''}`} />
                {updatingSubCategories ? 'Aggiornamento...' : 'Aggiorna Sotto-Categorie'}
              </button>
              <button
                onClick={handleClearTERCache}
                className="btn-secondary flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Pulisci Cache TER
              </button>
              <button
                onClick={handleClearPriceCache}
                className="btn-secondary flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Pulisci Cache Prezzi
              </button>
            </div>

            <div className="rounded-lg p-4 mt-4" style={{ background: 'var(--info-weak)', border: '1px solid var(--info)' }}>
              <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                <strong>💡 Nota:</strong> Usa "Aggiorna Sotto-Categorie" per rilevare automaticamente
                le sotto-categorie di tutte le transazioni esistenti (ETF: Azionario, Obbligazionario, etc.;
                Crypto: Bitcoin, Stablecoin, etc.).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-2 border-danger-200">
        <h2 className="text-lg font-semibold text-danger-700 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Zona Pericolosa
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--text-2)' }}>
              Elimina tutti i dati dell'app. <strong>Questa azione è irreversibile.</strong>
            </p>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Elimina Tutti i Dati
            </button>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60] p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-apple-lg max-w-md w-full p-6 animate-slide-up" style={{ background: 'var(--surface-1)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--neg-weak)' }}>
                <AlertCircle className="w-6 h-6" style={{ color: 'var(--neg)' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Conferma Eliminazione</h3>
                <p className="text-sm" style={{ color: 'var(--text-2)' }}>Questa azione non può essere annullata</p>
              </div>
            </div>

            <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-danger-800">
                Stai per eliminare <strong>tutte le transazioni</strong> e i dati dell'app.
                Assicurati di aver esportato un backup prima di procedere.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-secondary flex-1"
              >
                Annulla
              </button>
              <button
                onClick={handleClearData}
                className="flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors font-medium"
              >
                Elimina Tutto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* App Info */}
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <h2 className="text-lg font-semibold mb-4">
          Informazioni App
        </h2>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-2)' }}>
          <p><strong>Nome:</strong> Investment Tracker</p>
          <p><strong>Versione:</strong> 3.0.0</p>
          <p><strong>Tecnologie:</strong> React, Vite, TailwindCSS, LocalStorage</p>
          <p><strong>API:</strong> Yahoo Finance, CoinGecko</p>
        </div>
      </div>
    </div>
  );
}

export default Settings;
