'use client';

import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';

// Mock holdings data
const holdings = [
  {
    id: 1,
    ticker: 'VWCE.XETRA',
    name: 'Vanguard FTSE All-World UCITS ETF',
    isin: 'IE00BK5BQT80',
    shares: 45,
    avgPrice: 98.50,
    currentPrice: 112.30,
    value: 5053.50,
    cost: 4432.50,
    pnl: 621.00,
    pnlPercent: 14.01,
    dayChange: 1.2,
    weight: 4.03,
    assetClass: 'Equity',
    region: 'Global',
  },
  {
    id: 2,
    ticker: 'CSPX.LSE',
    name: 'iShares Core S&P 500 UCITS ETF',
    isin: 'IE00B5BMR087',
    shares: 120,
    avgPrice: 420.00,
    currentPrice: 485.50,
    value: 58260.00,
    cost: 50400.00,
    pnl: 7860.00,
    pnlPercent: 15.60,
    dayChange: 0.85,
    weight: 46.49,
    assetClass: 'Equity',
    region: 'USA',
  },
  {
    id: 3,
    ticker: 'IWDA.LSE',
    name: 'iShares Core MSCI World UCITS ETF',
    isin: 'IE00B4L5Y983',
    shares: 200,
    avgPrice: 72.00,
    currentPrice: 82.45,
    value: 16490.00,
    cost: 14400.00,
    pnl: 2090.00,
    pnlPercent: 14.51,
    dayChange: -0.32,
    weight: 13.16,
    assetClass: 'Equity',
    region: 'Developed',
  },
  {
    id: 4,
    ticker: 'EIMI.LSE',
    name: 'iShares Core MSCI EM IMI UCITS ETF',
    isin: 'IE00BKM4GZ66',
    shares: 350,
    avgPrice: 28.50,
    currentPrice: 26.80,
    value: 9380.00,
    cost: 9975.00,
    pnl: -595.00,
    pnlPercent: -5.96,
    dayChange: -1.45,
    weight: 7.48,
    assetClass: 'Equity',
    region: 'Emerging',
  },
  {
    id: 5,
    ticker: 'AGGH.LSE',
    name: 'iShares Core Global Aggregate Bond',
    isin: 'IE00BDBRDM35',
    shares: 500,
    avgPrice: 4.85,
    currentPrice: 4.62,
    value: 2310.00,
    cost: 2425.00,
    pnl: -115.00,
    pnlPercent: -4.74,
    dayChange: 0.22,
    weight: 1.84,
    assetClass: 'Bond',
    region: 'Global',
  },
  {
    id: 6,
    ticker: 'SGLD.LSE',
    name: 'Invesco Physical Gold ETC',
    isin: 'IE00B579F325',
    shares: 80,
    avgPrice: 165.00,
    currentPrice: 178.50,
    value: 14280.00,
    cost: 13200.00,
    pnl: 1080.00,
    pnlPercent: 8.18,
    dayChange: 0.65,
    weight: 11.39,
    assetClass: 'Commodity',
    region: 'Global',
  },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function HoldingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'weight'>('value');
  const [filterAsset, setFilterAsset] = useState<string>('all');

  const filteredHoldings = holdings
    .filter(h => {
      const matchesSearch = h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           h.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterAsset === 'all' || h.assetClass.toLowerCase() === filterAsset;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'pnl') return b.pnlPercent - a.pnlPercent;
      return b.weight - a.weight;
    });

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalPnL = holdings.reduce((sum, h) => sum + h.pnl, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.cost, 0);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Header title="Holdings" subtitle="Your ETF Portfolio" />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-slate-900">€{formatCurrency(totalValue)}</p>
        </Card>
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-slate-900">€{formatCurrency(totalCost)}</p>
        </Card>
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Total P/L</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}€{formatCurrency(totalPnL)}
          </p>
        </Card>
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Return</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}{((totalPnL / totalCost) * 100).toFixed(2)}%
          </p>
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
              placeholder="Search by ticker or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Asset Class Filter */}
          <div className="relative">
            <select
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value="all">All Assets</option>
              <option value="equity">Equity</option>
              <option value="bond">Bond</option>
              <option value="commodity">Commodity</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'value' | 'pnl' | 'weight')}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              <option value="value">Sort by Value</option>
              <option value="pnl">Sort by P/L %</option>
              <option value="weight">Sort by Weight</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Holdings Table */}
      <Card className="animate-slide-up overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Asset</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Shares</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Avg Price</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Current</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Value</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">P/L</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Day</th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-600">Weight</th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map((holding) => (
                <tr
                  key={holding.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        holding.pnlPercent >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {holding.pnlPercent >= 0 ? (
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{holding.ticker}</p>
                        <p className="text-xs text-slate-500 max-w-[200px] truncate">{holding.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">{holding.shares}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">€{formatCurrency(holding.avgPrice)}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-medium text-slate-900">€{formatCurrency(holding.currentPrice)}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className="font-semibold text-slate-900">€{formatCurrency(holding.value)}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <p className={`font-semibold ${holding.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {holding.pnl >= 0 ? '+' : ''}€{formatCurrency(holding.pnl)}
                    </p>
                    <p className={`text-xs ${holding.pnlPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {holding.pnlPercent >= 0 ? '+' : ''}{holding.pnlPercent.toFixed(2)}%
                    </p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm ${
                      holding.dayChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {holding.dayChange >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {holding.dayChange >= 0 ? '+' : ''}{holding.dayChange.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${holding.weight}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-600 w-12 text-right">
                        {holding.weight.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
