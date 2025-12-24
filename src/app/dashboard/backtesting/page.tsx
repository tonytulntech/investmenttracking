'use client';

import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  Play,
  Settings,
  TrendingUp,
  Calendar,
  DollarSign,
  Percent,
  RefreshCw,
  ChevronDown,
  Info
} from 'lucide-react';
import { useState } from 'react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Mock backtest results
const backtestResults = {
  finalValue: 156420,
  totalInvested: 120000,
  totalReturn: 36420,
  returnPercent: 30.35,
  cagr: 8.52,
  maxDrawdown: -18.4,
  sharpeRatio: 0.85,
  volatility: 14.2,
};

// Mock chart data points
const chartData = [
  { date: '2020-01', portfolio: 10000, benchmark: 10000 },
  { date: '2020-06', portfolio: 9200, benchmark: 9500 },
  { date: '2021-01', portfolio: 12500, benchmark: 11800 },
  { date: '2021-06', portfolio: 15200, benchmark: 14200 },
  { date: '2022-01', portfolio: 18400, benchmark: 16500 },
  { date: '2022-06', portfolio: 15800, benchmark: 14800 },
  { date: '2023-01', portfolio: 19200, benchmark: 17200 },
  { date: '2023-06', portfolio: 22500, benchmark: 19800 },
  { date: '2024-01', portfolio: 26800, benchmark: 22500 },
  { date: '2024-06', portfolio: 30200, benchmark: 25200 },
];

export default function BacktestingPage() {
  const [pacAmount, setPacAmount] = useState(500);
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState('2020-01');
  const [endDate, setEndDate] = useState('2024-12');
  const [rebalance, setRebalance] = useState(true);
  const [rebalanceFreq, setRebalanceFreq] = useState('quarterly');
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(true);

  const runBacktest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasResults(true);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Header title="Backtesting" subtitle="PAC Simulation & Strategy Analysis" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1 animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Configuration</h3>
          </div>

          <div className="space-y-5">
            {/* PAC Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PAC Amount (€)
              </label>
              <input
                type="number"
                value={pacAmount}
                onChange={(e) => setPacAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Investment Frequency
              </label>
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Rebalancing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">
                  Auto Rebalancing
                </label>
                <button
                  onClick={() => setRebalance(!rebalance)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    rebalance ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    rebalance ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              {rebalance && (
                <div className="relative">
                  <select
                    value={rebalanceFreq}
                    onChange={(e) => setRebalanceFreq(e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                    <option value="threshold">5% Threshold</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Run Button */}
            <button
              onClick={runBacktest}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Backtest
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {hasResults ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-slate-500">Final Value</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    €{formatCurrency(backtestResults.finalValue)}
                  </p>
                </Card>
                <Card className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-slate-500">Total Return</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    +{backtestResults.returnPercent.toFixed(2)}%
                  </p>
                </Card>
                <Card className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-4 h-4 text-blue-600" />
                    <p className="text-sm text-slate-500">CAGR</p>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {backtestResults.cagr.toFixed(2)}%
                  </p>
                </Card>
                <Card className="animate-slide-up">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-slate-500">Max Drawdown</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {backtestResults.maxDrawdown}%
                  </p>
                </Card>
              </div>

              {/* Chart */}
              <Card className="animate-slide-up">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Portfolio vs Benchmark
                </h3>
                <div className="h-64 relative">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    {/* Grid */}
                    {[0, 50, 100, 150, 200].map((y) => (
                      <line
                        key={y}
                        x1="40"
                        y1={y}
                        x2="400"
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Y-axis labels */}
                    <text x="35" y="15" textAnchor="end" className="text-xs fill-slate-400">€30K</text>
                    <text x="35" y="100" textAnchor="end" className="text-xs fill-slate-400">€20K</text>
                    <text x="35" y="185" textAnchor="end" className="text-xs fill-slate-400">€10K</text>

                    {/* Portfolio line */}
                    <path
                      d={`M 50 180 L 90 185 L 130 155 L 170 130 L 210 105 L 250 135 L 290 100 L 330 70 L 370 45 L 390 30`}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Benchmark line */}
                    <path
                      d={`M 50 180 L 90 183 L 130 162 L 170 142 L 210 125 L 250 145 L 290 120 L 330 98 L 370 75 L 390 60`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Legend */}
                  <div className="absolute bottom-2 right-2 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-emerald-500" />
                      <span className="text-slate-600">Portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-slate-400 border-dashed" />
                      <span className="text-slate-600">Benchmark</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="animate-slide-up">
                  <p className="text-sm text-slate-500 mb-1">Sharpe Ratio</p>
                  <p className="text-xl font-bold text-slate-900">{backtestResults.sharpeRatio}</p>
                  <p className="text-xs text-slate-400">Risk-adjusted return</p>
                </Card>
                <Card className="animate-slide-up">
                  <p className="text-sm text-slate-500 mb-1">Volatility</p>
                  <p className="text-xl font-bold text-slate-900">{backtestResults.volatility}%</p>
                  <p className="text-xs text-slate-400">Annualized std dev</p>
                </Card>
                <Card className="animate-slide-up">
                  <p className="text-sm text-slate-500 mb-1">Total Invested</p>
                  <p className="text-xl font-bold text-slate-900">€{formatCurrency(backtestResults.totalInvested)}</p>
                  <p className="text-xs text-slate-400">{Math.round(backtestResults.totalInvested / pacAmount)} contributions</p>
                </Card>
              </div>
            </>
          ) : (
            <Card className="animate-slide-up">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Play className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No Simulation Results
                </h3>
                <p className="text-slate-500 max-w-md">
                  Configure your PAC parameters and run a backtest to see historical performance analysis.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
