'use client';

import { useState } from 'react';

interface CountryData {
  name: string;
  code: string;
  value: number;
  percentage: number;
  color: string;
}

interface WorldHeatMapProps {
  data: CountryData[];
  total: number;
}

// Simplified world map paths (major investment regions)
const regions: Record<string, { path: string; label: string; x: number; y: number }> = {
  US: {
    path: "M 50 80 L 150 80 L 160 120 L 140 160 L 50 160 L 40 120 Z",
    label: "USA",
    x: 100,
    y: 120
  },
  EU: {
    path: "M 240 60 L 320 50 L 340 100 L 320 140 L 260 150 L 230 110 Z",
    label: "Europe",
    x: 280,
    y: 100
  },
  CN: {
    path: "M 420 80 L 500 70 L 520 120 L 500 160 L 420 150 L 400 110 Z",
    label: "China",
    x: 460,
    y: 115
  },
  JP: {
    path: "M 530 90 L 560 85 L 570 110 L 560 130 L 530 125 Z",
    label: "Japan",
    x: 550,
    y: 108
  },
  EM: {
    path: "M 280 170 L 380 160 L 400 220 L 360 260 L 280 250 L 260 210 Z",
    label: "Emerging",
    x: 330,
    y: 210
  },
  UK: {
    path: "M 220 55 L 240 50 L 245 75 L 235 85 L 215 80 Z",
    label: "UK",
    x: 230,
    y: 68
  }
};

export function WorldHeatMap({ data, total }: WorldHeatMapProps) {
  const [hoveredCountry, setHoveredCountry] = useState<CountryData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getCountryData = (code: string) => {
    return data.find(d => d.code === code);
  };

  const getHeatColor = (percentage: number) => {
    if (percentage >= 40) return '#22c55e'; // Green - high
    if (percentage >= 25) return '#84cc16'; // Lime
    if (percentage >= 15) return '#eab308'; // Yellow
    if (percentage >= 5) return '#f97316';  // Orange
    return '#94a3b8'; // Gray - low/none
  };

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 600 300"
        className="w-full h-full"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }}
      >
        {/* Background */}
        <rect width="600" height="300" fill="#f8fafc" rx="8" />

        {/* Grid lines for effect */}
        {[...Array(6)].map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={i * 50}
            x2="600"
            y2={i * 50}
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 50}
            y1="0"
            x2={i * 50}
            y2="300"
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />
        ))}

        {/* Regions */}
        {Object.entries(regions).map(([code, region]) => {
          const countryData = getCountryData(code);
          const percentage = countryData?.percentage || 0;
          const color = getHeatColor(percentage);

          return (
            <g key={code}>
              <path
                d={region.path}
                fill={color}
                stroke="#ffffff"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-300 hover:opacity-80"
                style={{
                  filter: hoveredCountry?.code === code ? 'brightness(1.1) drop-shadow(0 4px 8px rgba(0,0,0,0.2))' : 'none',
                  transform: hoveredCountry?.code === code ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${region.x}px ${region.y}px`
                }}
                onMouseEnter={() => countryData && setHoveredCountry(countryData)}
                onMouseLeave={() => setHoveredCountry(null)}
              />
              <text
                x={region.x}
                y={region.y}
                textAnchor="middle"
                className="text-xs font-medium fill-white pointer-events-none"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {region.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredCountry && (
        <div
          className="absolute pointer-events-none z-10 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl"
          style={{
            left: Math.min(mousePos.x + 10, 200),
            top: mousePos.y - 60,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <p className="font-bold text-lg">{hoveredCountry.name}</p>
          <p className="text-emerald-400 text-xl font-bold">
            €{hoveredCountry.value.toLocaleString()}
          </p>
          <p className="text-slate-400 text-sm">
            {hoveredCountry.percentage.toFixed(1)}% del portfolio
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600">&gt;40%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-lime-500" />
          <span className="text-slate-600">&gt;25%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-slate-600">&gt;15%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-slate-600">&gt;5%</span>
        </div>
      </div>
    </div>
  );
}
