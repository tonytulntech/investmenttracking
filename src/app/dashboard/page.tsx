'use client';

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { WorldHeatMap } from '@/components/charts/WorldHeatMap';
import { PortfolioTrendChart } from '@/components/charts/PortfolioTrendChart';
import { Calendar, MoreVertical } from 'lucide-react';

// Format currency consistently (avoid hydration mismatch)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Mock data - will be replaced with real data from Supabase
const portfolioStats = {
  activeHoldings: { count: 16, value: 125340 },
  newPositions: { count: 3, value: 8500 },
  dividends: { count: 12, value: 2450 },
};

// Asset allocation data (for donut chart)
const assetAllocation = [
  { name: 'Azionario', value: 65, amount: 81471, color: '#22c55e' },
  { name: 'Obbligazionario', value: 20, amount: 25068, color: '#f97316' },
  { name: 'Commodities', value: 10, amount: 12534, color: '#3b82f6' },
  { name: 'Cash', value: 5, amount: 6267, color: '#8b5cf6' },
];

// Geographic allocation (for heat map)
const geoAllocation = [
  { name: 'Stati Uniti', code: 'US', value: 56400, percentage: 45 },
  { name: 'Europa', code: 'EU', value: 31335, percentage: 25 },
  { name: 'Cina', code: 'CN', value: 12534, percentage: 10 },
  { name: 'Giappone', code: 'JP', value: 8774, percentage: 7 },
  { name: 'UK', code: 'UK', value: 6267, percentage: 5 },
  { name: 'Emergenti', code: 'EM', value: 10030, percentage: 8 },
];

// Portfolio details
const portfolioDetails = {
  openedRequests: { label: 'Holdings Attivi', value: 16 },
  engaged: { label: 'In Profit', value: 75, isPercent: true },
  sent: { label: 'YTD Return', value: 18.5, isPercent: true },
};

// Performance breakdown (bar chart data)
const performanceBreakdown = [
  { label: 'Q1', positive: 8, negative: 4 },
  { label: 'Q2', positive: 32, negative: 21 },
  { label: 'Q3', positive: 60, negative: 57 },
];

// Portfolio trend data
const portfolioTrend = [
  { date: 'Gen', value: 95000 },
  { date: 'Feb', value: 98000 },
  { date: 'Mar', value: 102000 },
  { date: 'Apr', value: 99000 },
  { date: 'Mag', value: 108000 },
  { date: 'Giu', value: 112000 },
  { date: 'Lug', value: 118000 },
  { date: 'Ago', value: 115000 },
  { date: 'Set', value: 120000 },
  { date: 'Ott', value: 122000 },
  { date: 'Nov', value: 119000 },
  { date: 'Dic', value: 125340 },
];

const trendCategories = [
  { name: 'Azionario', color: '#f97316' },
  { name: 'Obbligazionario', color: '#22c55e' },
  { name: 'Totale', color: '#e2e8f0' },
];

export default function DashboardPage() {
  const totalPortfolio = 125340;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header with Stats */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-8 gap-6">
        <Header title="Welcome back!" subtitle="Your Portfolio Statistics" />

        {/* Top Stats - like reference */}
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-sm text-slate-500">Holdings Attivi</p>
            <p className="text-3xl font-bold text-slate-900">
              {portfolioStats.activeHoldings.count}
              <span className="text-sm font-normal text-slate-400 ml-2">
                €{(portfolioStats.activeHoldings.value / 1000).toFixed(1)}K
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Nuove Posizioni</p>
            <p className="text-3xl font-bold text-slate-900">
              {portfolioStats.newPositions.count}
              <span className="text-sm font-normal text-slate-400 ml-2">
                €{(portfolioStats.newPositions.value / 1000).toFixed(1)}K
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Dividendi YTD</p>
            <p className="text-3xl font-bold text-slate-900">
              {portfolioStats.dividends.count}
              <span className="text-sm font-normal text-slate-400 ml-2">
                €{(portfolioStats.dividends.value / 1000).toFixed(1)}K
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Asset Allocation Donut */}
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Asset Allocation</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                <Calendar className="w-4 h-4" />
                This month
              </button>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {assetAllocation.reduce((acc, item, index) => {
                  const offset = acc.offset;
                  const dashArray = `${item.value} ${100 - item.value}`;
                  acc.elements.push(
                    <circle
                      key={item.name}
                      cx="18"
                      cy="18"
                      r="14"
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="3.5"
                      strokeDasharray={dashArray}
                      strokeDashoffset={-offset}
                      className="transition-all duration-500"
                      style={{
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                      }}
                    />
                  );
                  acc.offset += item.value;
                  return acc;
                }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">€{(totalPortfolio / 1000).toFixed(1)}K</span>
                <span className="text-sm text-slate-500">Totale</span>
              </div>
            </div>

            {/* Legend with values */}
            <div className="flex flex-col gap-3 flex-1">
              {assetAllocation.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600 flex-1">{item.name}</span>
                  <span className="text-sm text-slate-400">...........</span>
                  <span className="text-sm font-semibold text-slate-900">
                    €{(item.amount / 1000).toFixed(1)}K
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Right: Geographic Heat Map */}
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Map Preview</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-sm text-slate-600 hover:bg-slate-200 transition-colors">
                <Calendar className="w-4 h-4" />
                This month
              </button>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="h-64">
            <WorldHeatMap
              data={geoAllocation.map(g => ({ ...g, color: '' }))}
              total={totalPortfolio}
            />
          </div>
        </Card>
      </div>

      {/* Bottom Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Details / Performance */}
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Details</h3>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Top stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-slate-500">{portfolioDetails.openedRequests.label}</p>
              <p className="text-2xl font-bold text-slate-900">{portfolioDetails.openedRequests.value}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{portfolioDetails.engaged.label}</p>
              <p className="text-2xl font-bold text-slate-900">{portfolioDetails.engaged.value}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">{portfolioDetails.sent.label}</p>
              <p className="text-2xl font-bold text-slate-900">{portfolioDetails.sent.value}%</p>
            </div>
          </div>

          {/* Performance bars */}
          <div className="flex items-end justify-between h-32 gap-4">
            {performanceBreakdown.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5">
                  {/* Positive bar */}
                  <div className="w-full flex justify-center">
                    <div
                      className="w-8 rounded-t-lg bg-gradient-to-t from-green-400 to-green-300"
                      style={{ height: `${item.positive * 1.5}px` }}
                    />
                  </div>
                  {/* Negative bar */}
                  <div className="w-full flex justify-center">
                    <div
                      className="w-8 rounded-b-lg bg-gradient-to-b from-orange-300 to-red-400"
                      style={{ height: `${item.negative * 1.2}px` }}
                    />
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs text-emerald-600">{item.positive}%</p>
                  <p className="text-xs text-red-500">{item.negative}%</p>
                </div>
                <p className="text-xs text-slate-500 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Portfolio Trend Chart */}
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Portfolio Trend</h3>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div className="relative">
            <PortfolioTrendChart
              data={portfolioTrend}
              categories={trendCategories}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
