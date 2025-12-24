'use client';

import { Header } from '@/components/layout/Header';
import { Card, StatCard } from '@/components/ui/Card';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Format currency consistently (avoid hydration mismatch)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Mock data - will be replaced with real data from Supabase
const stats = {
  totalValue: 125340.50,
  dayChange: 1847.23,
  dayChangePercent: 1.49,
  totalPnL: 23450.80,
  totalPnLPercent: 23.05,
};

const topPerformers = [
  { ticker: 'VWCE.XETRA', name: 'Vanguard FTSE All-World', change: 12.5, value: 25340 },
  { ticker: 'CSPX.LSE', name: 'iShares Core S&P 500', change: 8.3, value: 18920 },
  { ticker: 'IWDA.LSE', name: 'iShares MSCI World', change: 6.7, value: 32100 },
];

const worstPerformers = [
  { ticker: 'EIMI.LSE', name: 'iShares EM IMI', change: -4.2, value: 8450 },
  { ticker: 'AGGH.LSE', name: 'iShares Global Aggregate', change: -2.1, value: 12300 },
];

const allocations = [
  { name: 'USA', value: 45, color: '#22c55e' },
  { name: 'Europe', value: 25, color: '#3b82f6' },
  { name: 'Asia', value: 20, color: '#f97316' },
  { name: 'Emerging', value: 10, color: '#8b5cf6' },
];

export default function DashboardPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Header title="Welcome back!" subtitle="Your Portfolio Statistics" />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-up">
        <StatCard
          title="Portfolio Value"
          value={`€${formatCurrency(stats.totalValue)}`}
          change={stats.dayChangePercent}
          changeLabel="vs yesterday"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Total P/L"
          value={`€${formatCurrency(stats.totalPnL)}`}
          change={stats.totalPnLPercent}
          changeLabel="all time"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Day Change"
          value={`€${formatCurrency(stats.dayChange)}`}
          change={stats.dayChangePercent}
          icon={<Activity className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          title="Holdings"
          value="16 ETFs"
          icon={<PieChart className="w-5 h-5 text-purple-600" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Allocation Chart */}
        <Card title="Allocation by Region" className="animate-slide-up">
          <div className="flex items-center gap-6">
            {/* Simple Donut representation */}
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {allocations.reduce((acc, item, index) => {
                  const offset = acc.offset;
                  acc.elements.push(
                    <circle
                      key={item.name}
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="4"
                      strokeDasharray={`${item.value} ${100 - item.value}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  acc.offset += item.value;
                  return acc;
                }, { elements: [] as JSX.Element[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900">€125K</span>
                <span className="text-xs text-slate-500">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2">
              {allocations.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                  <span className="text-sm font-semibold text-slate-900 ml-auto">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <Card title="Quick Stats" className="animate-slide-up">
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <div>
                <p className="text-sm text-slate-500">Active Holdings</p>
                <p className="text-xl font-bold text-slate-900">16</p>
              </div>
              <span className="text-sm text-slate-500">€125.3K</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <div>
                <p className="text-sm text-slate-500">This Month</p>
                <p className="text-xl font-bold text-slate-900">+€3,240</p>
              </div>
              <span className="badge-success">+2.6%</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
              <div>
                <p className="text-sm text-slate-500">YTD Return</p>
                <p className="text-xl font-bold text-slate-900">+€18,450</p>
              </div>
              <span className="badge-success">+17.3%</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="animate-slide-up">
          <div className="space-y-3">
            {[
              { type: 'BUY', ticker: 'VWCE', amount: '€500', date: 'Today' },
              { type: 'DIVIDEND', ticker: 'CSPX', amount: '€23.50', date: 'Yesterday' },
              { type: 'BUY', ticker: 'IWDA', amount: '€1,000', date: '3 days ago' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  item.type === 'BUY' ? 'bg-emerald-100' : 'bg-blue-100'
                }`}>
                  {item.type === 'BUY' ? (
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.ticker}</p>
                  <p className="text-xs text-slate-500">{item.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{item.amount}</p>
                  <p className="text-xs text-slate-500">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card title="Top Performers" className="animate-slide-up">
          <div className="space-y-3">
            {topPerformers.map((item) => (
              <div
                key={item.ticker}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{item.ticker}</p>
                    <p className="text-xs text-slate-500">{item.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    €{formatCurrency(item.value)}
                  </p>
                  <p className="text-sm text-emerald-600 flex items-center justify-end gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +{item.change}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Worst Performers */}
        <Card title="Worst Performers" className="animate-slide-up">
          <div className="space-y-3">
            {worstPerformers.map((item) => (
              <div
                key={item.ticker}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{item.ticker}</p>
                    <p className="text-xs text-slate-500">{item.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    €{formatCurrency(item.value)}
                  </p>
                  <p className="text-sm text-red-600 flex items-center justify-end gap-1">
                    <ArrowDownRight className="w-3 h-3" />
                    {item.change}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
