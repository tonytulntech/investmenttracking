'use client';

import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Info,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';

// Fama-French Factor Data
const famaFrenchFactors = {
  market: { name: 'Market (Mkt-RF)', exposure: 0.98, contribution: 8.2 },
  size: { name: 'Size (SMB)', exposure: -0.12, contribution: -0.8 },
  value: { name: 'Value (HML)', exposure: -0.25, contribution: -1.2 },
  momentum: { name: 'Momentum (MOM)', exposure: 0.15, contribution: 1.1 },
  quality: { name: 'Quality (QMJ)', exposure: 0.32, contribution: 2.4 },
};

// Risk metrics
const riskMetrics = {
  beta: 0.95,
  alpha: 1.8,
  rSquared: 0.94,
  trackingError: 2.1,
  informationRatio: 0.86,
};

// Monte Carlo simulation results
const monteCarloResults = {
  median: 185000,
  percentile5: 142000,
  percentile25: 165000,
  percentile75: 210000,
  percentile95: 258000,
  probabilityGoal: 78,
};

// Sector exposure
const sectorExposure = [
  { name: 'Technology', weight: 28.5, benchmark: 25.0 },
  { name: 'Healthcare', weight: 14.2, benchmark: 13.5 },
  { name: 'Financials', weight: 12.8, benchmark: 14.0 },
  { name: 'Consumer Disc.', weight: 11.5, benchmark: 10.8 },
  { name: 'Industrials', weight: 9.8, benchmark: 10.2 },
  { name: 'Communication', weight: 8.2, benchmark: 8.5 },
  { name: 'Consumer Staples', weight: 6.5, benchmark: 7.0 },
  { name: 'Energy', weight: 4.2, benchmark: 5.5 },
  { name: 'Others', weight: 4.3, benchmark: 5.5 },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function AnalyticsPage() {
  const [simulations, setSimulations] = useState(10000);
  const [timeHorizon, setTimeHorizon] = useState(10);
  const [targetAmount, setTargetAmount] = useState(200000);
  const [isRunning, setIsRunning] = useState(false);

  const runMonteCarlo = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Header title="Analytics" subtitle="Factor Analysis & Risk Metrics" />

      {/* Top Row - Factor Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Fama-French Factors */}
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-slate-900">Fama-French Factor Exposure</h3>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <Info className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="space-y-4">
            {Object.values(famaFrenchFactors).map((factor) => (
              <div key={factor.name} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600 truncate">{factor.name}</div>
                <div className="flex-1">
                  <div className="h-6 bg-slate-100 rounded-lg relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-full rounded-lg ${
                        factor.exposure >= 0 ? 'bg-emerald-500 left-1/2' : 'bg-red-500 right-1/2'
                      }`}
                      style={{
                        width: `${Math.abs(factor.exposure) * 50}%`,
                        [factor.exposure >= 0 ? 'left' : 'right']: '50%'
                      }}
                    />
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-300" />
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className={`text-sm font-semibold ${
                    factor.exposure >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {factor.exposure >= 0 ? '+' : ''}{factor.exposure.toFixed(2)}
                  </span>
                </div>
                <div className="w-20 text-right">
                  <span className={`text-sm ${
                    factor.contribution >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {factor.contribution >= 0 ? '+' : ''}{factor.contribution}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total Factor Contribution</span>
              <span className="font-semibold text-emerald-600">+9.7%</span>
            </div>
          </div>
        </Card>

        {/* Risk Metrics */}
        <Card className="animate-slide-up">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Risk Metrics</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500 mb-1">Beta</p>
              <p className="text-2xl font-bold text-slate-900">{riskMetrics.beta}</p>
              <p className="text-xs text-slate-400">vs MSCI World</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500 mb-1">Alpha (ann.)</p>
              <p className="text-2xl font-bold text-emerald-600">+{riskMetrics.alpha}%</p>
              <p className="text-xs text-slate-400">Excess return</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500 mb-1">R-Squared</p>
              <p className="text-2xl font-bold text-slate-900">{riskMetrics.rSquared}</p>
              <p className="text-xs text-slate-400">Correlation</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500 mb-1">Tracking Error</p>
              <p className="text-2xl font-bold text-slate-900">{riskMetrics.trackingError}%</p>
              <p className="text-xs text-slate-400">Annualized</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 col-span-2">
              <p className="text-sm text-emerald-700 mb-1">Information Ratio</p>
              <p className="text-3xl font-bold text-emerald-700">{riskMetrics.informationRatio}</p>
              <p className="text-xs text-emerald-600">Alpha / Tracking Error</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Middle Row - Monte Carlo */}
      <Card className="mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-slate-900">Monte Carlo Simulation</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Configuration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Simulations
              </label>
              <div className="relative">
                <select
                  value={simulations}
                  onChange={(e) => setSimulations(Number(e.target.value))}
                  className="w-full appearance-none px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                  <option value={50000}>50,000</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Time Horizon (years)
              </label>
              <input
                type="number"
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Amount (€)
              </label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <button
              onClick={runMonteCarlo}
              disabled={isRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-medium disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Simulation'
              )}
            </button>
          </div>

          {/* Results Distribution */}
          <div className="lg:col-span-2">
            <div className="h-48 relative bg-gradient-to-t from-purple-50 to-transparent rounded-xl p-4">
              {/* Simplified distribution visualization */}
              <svg viewBox="0 0 300 120" className="w-full h-full">
                {/* Bell curve approximation */}
                <path
                  d="M 20 110 Q 50 110 80 100 Q 110 85 130 60 Q 150 30 160 20 Q 170 30 180 60 Q 200 85 230 100 Q 260 110 280 110"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="3"
                />
                <path
                  d="M 20 110 Q 50 110 80 100 Q 110 85 130 60 Q 150 30 160 20 Q 170 30 180 60 Q 200 85 230 100 Q 260 110 280 110 L 280 120 L 20 120 Z"
                  fill="url(#purpleGradient)"
                  opacity="0.3"
                />
                <defs>
                  <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Percentile markers */}
                <line x1="80" y1="0" x2="80" y2="110" stroke="#ef4444" strokeDasharray="4 4" opacity="0.5" />
                <line x1="160" y1="0" x2="160" y2="110" stroke="#22c55e" strokeDasharray="4 4" opacity="0.5" />
                <line x1="240" y1="0" x2="240" y2="110" stroke="#3b82f6" strokeDasharray="4 4" opacity="0.5" />
              </svg>

              {/* Labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 px-4">
                <span>€{formatCurrency(monteCarloResults.percentile5)}</span>
                <span className="font-semibold text-purple-600">€{formatCurrency(monteCarloResults.median)}</span>
                <span>€{formatCurrency(monteCarloResults.percentile95)}</span>
              </div>
            </div>
          </div>

          {/* Key Results */}
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-purple-50">
              <p className="text-xs text-purple-600 mb-1">Median Outcome</p>
              <p className="text-xl font-bold text-purple-700">€{formatCurrency(monteCarloResults.median)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-1">5th Percentile</p>
              <p className="text-lg font-semibold text-slate-700">€{formatCurrency(monteCarloResults.percentile5)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500 mb-1">95th Percentile</p>
              <p className="text-lg font-semibold text-slate-700">€{formatCurrency(monteCarloResults.percentile95)}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50">
              <p className="text-xs text-emerald-600 mb-1">P(Goal ≥ €{formatCurrency(targetAmount)})</p>
              <p className="text-xl font-bold text-emerald-700">{monteCarloResults.probabilityGoal}%</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Row - Sector Exposure */}
      <Card className="animate-slide-up">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-slate-900">Sector Exposure vs Benchmark</h3>
        </div>

        <div className="space-y-3">
          {sectorExposure.map((sector) => {
            const diff = sector.weight - sector.benchmark;
            return (
              <div key={sector.name} className="flex items-center gap-4">
                <div className="w-32 text-sm text-slate-600">{sector.name}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-orange-400 rounded-full"
                      style={{ width: `${sector.weight * 3}%` }}
                    />
                    <div
                      className="absolute top-1 left-0 h-2 bg-slate-400 rounded-full opacity-50"
                      style={{ width: `${sector.benchmark * 3}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium text-slate-900">
                  {sector.weight}%
                </div>
                <div className="w-16 text-right">
                  <span className={`text-sm font-medium ${
                    diff >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
