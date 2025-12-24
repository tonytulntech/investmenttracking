'use client';

import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  Plus
} from 'lucide-react';
import { useState } from 'react';
import { useHoldings } from '@/hooks/useHoldings';
import { AddHoldingModal } from '@/components/holdings/AddHoldingModal';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function HoldingsPage() {
  const { holdings, loading, error, totals, apiStats, refetch, addHolding } = useHoldings();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'weight'>('value');
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddHolding = async (holdingData: any) => {
    await addHolding({
      ...holdingData,
      user_id: '', // Will be set by Supabase RLS or we handle it server-side
    });
  };

  const filteredHoldings = holdings
    .filter(h => {
      const matchesSearch = h.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           h.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterAsset === 'all' || h.asset_class.toLowerCase() === filterAsset;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'value') return b.value - a.value;
      if (sortBy === 'pnl') return b.pnl_percent - a.pnl_percent;
      const aWeight = (a.value / totals.value) * 100;
      const bWeight = (b.value / totals.value) * 100;
      return bWeight - aWeight;
    });

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Header title="Holdings" subtitle="Your ETF Portfolio" />

        {/* Actions */}
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
            API: {apiStats.remaining}/20 calls remaining
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Aggiungi
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
          <p className="text-sm text-slate-500 mb-1">Total Value</p>
          <p className="text-2xl font-bold text-slate-900">€{formatCurrency(totals.value)}</p>
        </Card>
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-slate-900">€{formatCurrency(totals.cost)}</p>
        </Card>
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Total P/L</p>
          <p className={`text-2xl font-bold ${totals.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totals.pnl >= 0 ? '+' : ''}€{formatCurrency(totals.pnl)}
          </p>
        </Card>
        <Card className="animate-slide-up">
          <p className="text-sm text-slate-500 mb-1">Return</p>
          <p className={`text-2xl font-bold ${totals.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totals.pnl >= 0 ? '+' : ''}{totals.cost > 0 ? ((totals.pnl / totals.cost) * 100).toFixed(2) : '0.00'}%
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <span className="ml-2 text-slate-500">Loading holdings...</span>
          </div>
        ) : (
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
                {filteredHoldings.map((holding) => {
                  const weight = totals.value > 0 ? (holding.value / totals.value) * 100 : 0;

                  return (
                    <tr
                      key={holding.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            holding.pnl_percent >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                          }`}>
                            {holding.pnl_percent >= 0 ? (
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
                        <p className="font-medium text-slate-900">€{formatCurrency(holding.avg_price)}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-medium text-slate-900">€{formatCurrency(holding.current_price)}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className="font-semibold text-slate-900">€{formatCurrency(holding.value)}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <p className={`font-semibold ${holding.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {holding.pnl >= 0 ? '+' : ''}€{formatCurrency(holding.pnl)}
                        </p>
                        <p className={`text-xs ${holding.pnl_percent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {holding.pnl_percent >= 0 ? '+' : ''}{holding.pnl_percent.toFixed(2)}%
                        </p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 text-sm ${
                          holding.day_change_percent >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {holding.day_change_percent >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {holding.day_change_percent >= 0 ? '+' : ''}{holding.day_change_percent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(weight, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-12 text-right">
                            {weight.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredHoldings.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No holdings found
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add Holding Modal */}
      <AddHoldingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddHolding}
      />
    </div>
  );
}
