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
  Download
} from 'lucide-react';
import { useState } from 'react';

type TransactionType = 'BUY' | 'SELL' | 'DIVIDEND';

interface Transaction {
  id: number;
  type: TransactionType;
  ticker: string;
  name: string;
  date: string;
  shares: number;
  price: number;
  total: number;
  fees: number;
}

// Mock transactions data
const transactions: Transaction[] = [
  {
    id: 1,
    type: 'BUY',
    ticker: 'VWCE.XETRA',
    name: 'Vanguard FTSE All-World',
    date: '2024-12-20',
    shares: 5,
    price: 112.30,
    total: 561.50,
    fees: 1.50,
  },
  {
    id: 2,
    type: 'DIVIDEND',
    ticker: 'CSPX.LSE',
    name: 'iShares Core S&P 500',
    date: '2024-12-15',
    shares: 120,
    price: 0.42,
    total: 50.40,
    fees: 0,
  },
  {
    id: 3,
    type: 'BUY',
    ticker: 'IWDA.LSE',
    name: 'iShares Core MSCI World',
    date: '2024-12-10',
    shares: 15,
    price: 82.10,
    total: 1231.50,
    fees: 2.00,
  },
  {
    id: 4,
    type: 'SELL',
    ticker: 'EIMI.LSE',
    name: 'iShares Core MSCI EM IMI',
    date: '2024-12-05',
    shares: 50,
    price: 27.20,
    total: 1360.00,
    fees: 1.50,
  },
  {
    id: 5,
    type: 'BUY',
    ticker: 'SGLD.LSE',
    name: 'Invesco Physical Gold',
    date: '2024-12-01',
    shares: 10,
    price: 175.80,
    total: 1758.00,
    fees: 2.50,
  },
  {
    id: 6,
    type: 'DIVIDEND',
    ticker: 'IWDA.LSE',
    name: 'iShares Core MSCI World',
    date: '2024-11-28',
    shares: 185,
    price: 0.28,
    total: 51.80,
    fees: 0,
  },
  {
    id: 7,
    type: 'BUY',
    ticker: 'CSPX.LSE',
    name: 'iShares Core S&P 500',
    date: '2024-11-20',
    shares: 8,
    price: 478.50,
    total: 3828.00,
    fees: 3.00,
  },
  {
    id: 8,
    type: 'BUY',
    ticker: 'AGGH.LSE',
    name: 'iShares Global Aggregate Bond',
    date: '2024-11-15',
    shares: 100,
    price: 4.68,
    total: 468.00,
    fees: 1.00,
  },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || t.type.toLowerCase() === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Summary calculations
  const totalBuys = transactions.filter(t => t.type === 'BUY').reduce((sum, t) => sum + t.total, 0);
  const totalSells = transactions.filter(t => t.type === 'SELL').reduce((sum, t) => sum + t.total, 0);
  const totalDividends = transactions.filter(t => t.type === 'DIVIDEND').reduce((sum, t) => sum + t.total, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.fees, 0);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Header title="Transactions" subtitle="Buy, Sell & Dividends History" />
        <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium">
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Buys</p>
              <p className="text-xl font-bold text-slate-900">€{formatCurrency(totalBuys)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Sells</p>
              <p className="text-xl font-bold text-slate-900">€{formatCurrency(totalSells)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Coins className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Dividends</p>
              <p className="text-xl font-bold text-emerald-600">+€{formatCurrency(totalDividends)}</p>
            </div>
          </div>
        </Card>
        <Card className="animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Fees</p>
              <p className="text-xl font-bold text-slate-900">€{formatCurrency(totalFees)}</p>
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
              placeholder="Search transactions..."
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
              <option value="all">All Types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="dividend">Dividend</option>
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
              <option value="all">All Time</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="animate-slide-up">
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
                  <p className="font-semibold text-slate-900">{transaction.ticker}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadge(transaction.type)}`}>
                    {transaction.type}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{transaction.name}</p>
              </div>

              {/* Shares & Price */}
              <div className="text-right">
                <p className="text-sm text-slate-600">
                  {transaction.type === 'DIVIDEND' ? `${transaction.shares} shares` : `${transaction.shares} × €${formatCurrency(transaction.price)}`}
                </p>
                {transaction.fees > 0 && (
                  <p className="text-xs text-slate-400">Fee: €{formatCurrency(transaction.fees)}</p>
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
      </Card>
    </div>
  );
}
