import React, { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

function Rebalancing() {
  const [strategy, setStrategy] = useState(null);

  useEffect(() => {
    // Load strategy
    const saved = localStorage.getItem('investment_strategy');
    if (saved) {
      setStrategy(JSON.parse(saved));
    }
  }, []);

  if (!strategy) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <RefreshCcw className="w-8 h-8 text-primary-600" />
            Ribilanciamento
          </h1>
          <p className="text-gray-600 mt-1">Analizza e ribilancia il tuo portafoglio</p>
        </div>

        <div className="card text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessuna Strategia Configurata
          </h3>
          <p className="text-gray-600 mb-6">
            Prima di utilizzare il ribilanciamento, configura la tua strategia di investimento
          </p>
          <a href="/strategy" className="btn-primary inline-flex items-center gap-2">
            <RefreshCcw className="w-5 h-5" />
            Vai a Strategia
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <RefreshCcw className="w-8 h-8 text-primary-600" />
          Ribilanciamento
        </h1>
        <p className="text-gray-600 mt-1">Analizza scostamenti e pianifica i prossimi acquisti</p>
      </div>

      {/* Placeholder - Coming Soon */}
      <div className="card">
        <div className="text-center py-12">
          <RefreshCcw className="w-16 h-16 text-primary-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Funzionalità in Sviluppo
          </h3>
          <p className="text-gray-600 mb-6">
            Qui vedrai l'analisi degli scostamenti e i suggerimenti di ribilanciamento
          </p>
          <div className="text-left max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2"><strong>Funzionalità previste:</strong></p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Confronto allocazione attuale vs obiettivo</li>
              <li>Scostamenti percentuali per asset class</li>
              <li>Calendario acquisti consigliati (PAC)</li>
              <li>Calcolo importi per ribilanciamento immediato (PIC)</li>
              <li>Alert automatici (6/12 mesi o eventi di mercato)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rebalancing;
