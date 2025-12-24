'use client';

import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  ChevronDown,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { AddTransactionModal } from '@/components/transactions/AddTransactionModal';

type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getTypeIcon = (type: TransactionType) => {
  switch (type) {
    case 'BUY':
      return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
    case 'SELL':
      return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    case 'DIVIDEND':
      return <Coins className="w-4 h-4 text-blue-600" />;
  }
};

const getTypeBadge = (type: TransactionType) => {
  const styles = {
    BUY: 'bg-emerald-100 text-emerald-700',
    SELL: 'bg-red-100 text-red-700',
    DIVIDEND: 'bg-blue-100 text-blue-700',
  };
  return styles[type];
};

export default function TransactionsPage() {
  const { transactions, loading, error, totals, refetch, addTransaction } = useTransactions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch =
        (t.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      const matchesType = filterType === 'all' || t.type.toLowerCase() === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Header title="Transazioni" subtitle="Acquisti, Vendite e Dividendi" />
        <div className="flex items-center gap-4">
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Aggiorna"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Aggiungi Transazione
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Totale Acquisti</p>
              <p className="text-xl font-bold text-slate-900">€{formatCurrency(totals.buys)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Totale Vendite</p>
              <p className="text-xl font-bold text-slate-900">€{formatCurrency(totals.sells)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Coins className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Dividendi</p>
              <p className="text-xl font-bold text-emerald-600">+€{formatCurrency(totals.dividends)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Totale Commissioni</p>
              <p className="text-xl font-bold text-slate-900">€{formatCurrency(totals.fees)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6 animate-slide-up">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca transazioni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value="all">Tutti i Tipi</option>
              <option value="buy">Acquisti</option>
              <option value="sell">Vendite</option>
              <option value="dividend">Dividendi</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Range */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value="all">Tutto il Periodo</option>
              <option value="month">Questo Mese</option>
              <option value="quarter">Questo Trimestre</option>
              <option value="year">Quest'Anno</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            Esporta
          </button>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="animate-slide-up">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <span className="ml-2 text-slate-500">Caricamento transazioni...</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Nessuna transazione</p>
            <p className="text-sm text-slate-400 mt-1">Clicca su "Aggiungi Transazione" per iniziare</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  transaction.type === 'BUY' ? 'bg-emerald-100' :
                  transaction.type === 'SELL' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {getTypeIcon(transaction.type)}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{transaction.ticker || 'Unknown'}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(transaction.type)}`}>
                      {transaction.type === 'BUY' ? 'ACQUISTO' : transaction.type === 'SELL' ? 'VENDITA' : 'DIVIDENDO'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{transaction.name || 'Unknown Asset'}</p>
                </div>

                {/* Shares & Price */}
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    {transaction.type === 'DIVIDEND'
                      ? `${transaction.shares} shares`
                      : `${transaction.shares} × €${formatCurrency(transaction.price)}`}
                  </p>
                  {transaction.fees > 0 && (
                    <p className="text-xs text-slate-400">Comm: €{formatCurrency(transaction.fees)}</p>
                  )}
                </div>

                {/* Total */}
                <div className="text-right min-w-[100px]">
                  <p className={`text-lg font-bold ${
                    transaction.type === 'SELL' || transaction.type === 'DIVIDEND'
                      ? 'text-emerald-600'
                      : 'text-slate-900'
                  }`}>
                    {transaction.type === 'SELL' || transaction.type === 'DIVIDEND' ? '+' : '-'}€{formatCurrency(transaction.total)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addTransaction}
      />
    </div>
  );
}
