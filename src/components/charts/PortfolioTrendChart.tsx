'use client';

import { useState, useEffect } from 'react';

interface DataPoint {
  date: string;
  value: number;
}

interface PortfolioTrendChartProps {
  data: DataPoint[];
  categories?: { name: string; color: string }[];
}

export function PortfolioTrendChart({ data, categories }: PortfolioTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: DataPoint; x: number; y: number } | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  // Create smooth path with animation
  const createPath = () => {
    const visiblePoints = Math.floor(data.length * animationProgress);
    if (visiblePoints < 2) return '';

    let path = `M ${getX(0)} ${getY(data[0].value)}`;

    for (let i = 1; i < visiblePoints; i++) {
      const x = getX(i);
      const y = getY(data[i].value);

      // Bezier curve for smoothness
      const prevX = getX(i - 1);
      const prevY = getY(data[i - 1].value);
      const cpX = (prevX + x) / 2;

      path += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
    }

    return path;
  };

  // Area fill path
  const createAreaPath = () => {
    const linePath = createPath();
    if (!linePath) return '';

    const visiblePoints = Math.floor(data.length * animationProgress);
    const lastX = getX(visiblePoints - 1);

    return `${linePath} L ${lastX} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
  };

  const formatValue = (val: number) => {
    if (val >= 1000) return `€${(val / 1000).toFixed(0)}K`;
    return `€${val.toFixed(0)}`;
  };

  // Y-axis labels
  const yLabels = [minValue, minValue + valueRange * 0.5, maxValue];

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yLabels.map((val, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={width - padding.right}
              y2={getY(val)}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={getY(val)}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs fill-slate-400"
            >
              {formatValue(val)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path
          d={createAreaPath()}
          fill="url(#areaGradient)"
        />

        {/* Line */}
        <path
          d={createPath()}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive points */}
        {data.map((point, i) => {
          const x = getX(i);
          const y = getY(point.value);
          const isVisible = i < Math.floor(data.length * animationProgress);

          return isVisible ? (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint({ point, x, y })}
              />
              {hoveredPoint?.point === point && (
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="white"
                  stroke="#22c55e"
                  strokeWidth="3"
                />
              )}
            </g>
          ) : null;
        })}

        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((point, i) => {
          const index = data.indexOf(point);
          return (
            <text
              key={i}
              x={getX(index)}
              y={height - 8}
              textAnchor="middle"
              className="text-xs fill-slate-400"
            >
              {point.date}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute pointer-events-none bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 15}%`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <p className="text-emerald-400 font-bold">€{hoveredPoint.point.value.toLocaleString()}</p>
          <p className="text-slate-400 text-xs">{hoveredPoint.point.date}</p>
          <p className="text-emerald-400 text-xs">+1.2%</p>
        </div>
      )}

      {/* Categories legend */}
      {categories && (
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: cat.color }}
            >
              {cat.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
