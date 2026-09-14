import React, { useState } from 'react';
import { cn } from '../utils/cn';

export interface RadarAxis {
  key: string;
  label: string;
  group?: string;
  shortLabel?: string;
}

export interface RadarSeries {
  id: string;
  name: string;
  color: string; // e.g. '#10b981'
  fillColor: string; // e.g. 'rgba(16, 185, 129, 0.35)'
  strokeColor: string;
  data: Record<string, number>; // key -> value (0 to 5)
}

interface RadarChartProps {
  axes: RadarAxis[];
  series: RadarSeries[];
  maxValue?: number;
  levels?: number;
  size?: number;
  className?: string;
  showLegend?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  axes,
  series,
  maxValue = 5,
  levels = 5,
  size = 560,
  className,
  showLegend = true
}) => {
  const [hoveredAxisKey, setHoveredAxisKey] = useState<string | null>(null);

  if (axes.length < 3) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
        Mindestens 3 Achsen für ein Netzdiagramm erforderlich.
      </div>
    );
  }

  const center = size / 2;
  const isLargeSet = axes.length > 10;
  // Radius calculation providing generous margin for labels
  const radius = isLargeSet ? size * 0.31 : size * 0.34;
  const angleStep = (2 * Math.PI) / axes.length;

  // Calculate coordinates for a point on the radar
  const getCoordinates = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const clampedVal = Math.max(0, Math.min(value, maxValue));
    const r = (clampedVal / maxValue) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Get grid polygon points for a given level (1 to levels)
  const getLevelPolygonPoints = (level: number) => {
    const levelVal = (level / levels) * maxValue;
    return axes
      .map((_, i) => {
        const { x, y } = getCoordinates(i, levelVal);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Get series polygon points
  const getSeriesPolygonPoints = (s: RadarSeries) => {
    return axes
      .map((axis, i) => {
        const val = s.data[axis.key] || 0;
        const { x, y } = getCoordinates(i, val);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Format multi-line label if needed
  const formatAxisLabelLines = (label: string): string[] => {
    if (label.includes('(') && label.includes(')')) {
      const parts = label.split('(');
      return [parts[0].trim(), `(${parts[1]}`];
    }
    if (label.length > 18) {
      const words = label.split(' ');
      if (words.length >= 2) {
        const mid = Math.ceil(words.length / 2);
        return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
      }
    }
    return [label];
  };

  return (
    <div className={cn("flex flex-col items-center select-none w-full", className)}>
      <div className="relative w-full max-w-[580px] aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full overflow-visible"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.5))' }}
        >
          <defs>
            {series.map(s => (
              <radialGradient key={`grad-${s.id}`} id={`grad-${s.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                <stop offset="70%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.15" />
              </radialGradient>
            ))}
          </defs>

          {/* 1. Concentric Level Polygons / Spiderweb Rings */}
          {Array.from({ length: levels }, (_, i) => i + 1).map(level => {
            const points = getLevelPolygonPoints(level);
            const isOuter = level === levels;
            return (
              <g key={`grid-level-${level}`}>
                <polygon
                  points={points}
                  fill={level % 2 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(15, 23, 42, 0.3)'}
                  stroke={isOuter ? 'rgba(148, 163, 184, 0.7)' : 'rgba(71, 85, 105, 0.45)'}
                  strokeWidth={isOuter ? '1.8' : '1.2'}
                  strokeDasharray={isOuter ? undefined : '3,3'}
                />
                {/* Level Scale Numbers on top vertical axis */}
                <text
                  x={center + 6}
                  y={center - (level / levels) * radius + 4}
                  fill={isOuter ? '#e2e8f0' : 'rgba(148, 163, 184, 0.85)'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {level}.0
                </text>
              </g>
            );
          })}

          {/* 2. Radial Spokes from Center to each Axis */}
          {axes.map((axis, i) => {
            const { x, y } = getCoordinates(i, maxValue);
            const isHovered = hoveredAxisKey === axis.key;
            return (
              <line
                key={`spoke-${axis.key}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={isHovered ? '#10b981' : 'rgba(100, 116, 139, 0.5)'}
                strokeWidth={isHovered ? '2.2' : '1.2'}
                strokeDasharray="2,2"
              />
            );
          })}

          {/* 3. Series Polygons & Vertices (Spiderwebs) */}
          {series.map(s => {
            const points = getSeriesPolygonPoints(s);
            return (
              <g key={`series-group-${s.id}`} className="transition-all duration-300">
                {/* Filled Spinnennetz Area with drop-shadow glow */}
                <polygon
                  points={points}
                  fill={`url(#grad-${s.id})`}
                  stroke={s.strokeColor || s.color}
                  strokeWidth="3.2"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                  style={{
                    filter: `drop-shadow(0 0 8px ${s.color}66)`
                  }}
                />

                {/* Point Circles on Vertices */}
                {axes.map((axis, i) => {
                  const val = s.data[axis.key] || 0;
                  const { x, y } = getCoordinates(i, val);
                  const isHovered = hoveredAxisKey === axis.key;

                  return (
                    <g
                      key={`point-${s.id}-${axis.key}`}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredAxisKey(axis.key)}
                      onMouseLeave={() => setHoveredAxisKey(null)}
                    >
                      {/* Outer Glow Halo if hovered */}
                      {isHovered && (
                        <circle
                          cx={x}
                          cy={y}
                          r={9}
                          fill={s.color}
                          opacity={0.3}
                          className="animate-pulse"
                        />
                      )}

                      {/* Vertex Circle */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 4.5}
                        fill={s.color}
                        stroke="#020617"
                        strokeWidth="2"
                      />

                      {/* Inner highlight core */}
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 2.5 : 1.8}
                        fill="#ffffff"
                        opacity={0.9}
                        pointerEvents="none"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* 4. Axis Labels with Multi-line support & Crisp Visibility */}
          {axes.map((axis, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const labelDistance = isLargeSet ? radius + 22 : radius + 26;
            const lx = center + labelDistance * Math.cos(angle);
            const ly = center + labelDistance * Math.sin(angle);

            const cos = Math.cos(angle);

            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (cos > 0.25) textAnchor = 'start';
            else if (cos < -0.25) textAnchor = 'end';

            const isHovered = hoveredAxisKey === axis.key;
            const displayLabel = isLargeSet ? (axis.shortLabel || axis.label) : axis.label;
            const lines = isLargeSet ? [displayLabel] : formatAxisLabelLines(displayLabel);

            return (
              <g
                key={`label-${axis.key}`}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredAxisKey(axis.key)}
                onMouseLeave={() => setHoveredAxisKey(null)}
              >
                <text
                  x={lx}
                  y={ly}
                  textAnchor={textAnchor}
                  fill={isHovered ? '#34d399' : '#e2e8f0'}
                  fontSize={isLargeSet ? (isHovered ? '10' : '8.5') : (isHovered ? '11.5' : '10.5')}
                  fontWeight={isHovered ? '900' : '700'}
                  className="transition-colors duration-150"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 6px rgba(52,211,153,0.6))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))'
                  }}
                >
                  {lines.map((line, lineIdx) => (
                    <tspan
                      key={lineIdx}
                      x={lx}
                      dy={lineIdx === 0 ? (lines.length > 1 ? '-0.3em' : '0.35em') : '1.15em'}
                      fill={lineIdx > 0 && !isHovered ? '#94a3b8' : undefined}
                      fontSize={lineIdx > 0 && !isLargeSet ? '9.5' : undefined}
                      fontWeight={lineIdx > 0 ? '600' : undefined}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredAxisKey && (() => {
          const axis = axes.find(a => a.key === hoveredAxisKey);
          if (!axis) return null;

          return (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-emerald-500/60 shadow-xl backdrop-blur-md pointer-events-none text-center min-w-[200px] animate-fadeIn">
              {axis.group && (
                <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wider">
                  {axis.group}
                </span>
              )}
              <div className="text-xs font-black text-white">{axis.label}</div>
              <div className="flex items-center justify-center gap-3 mt-1 pt-1 border-t border-slate-800/80">
                {series.map(s => {
                  const val = s.data[axis.key];
                  return (
                    <div key={s.id} className="flex items-center gap-1.5 text-xs font-mono font-bold">
                      <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-300 text-[10.5px]">{s.name}:</span>
                      <span style={{ color: s.color }}>
                        {typeof val === 'number' && val > 0 ? `${val.toFixed(1)} / 5.0` : '–'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      {showLegend && series.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-800/80 text-xs">
          {series.map(s => {
            const vals = Object.values(s.data).filter(v => typeof v === 'number' && v > 0);
            const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;

            return (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-sm">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                <span className="font-bold text-slate-200">{s.name}</span>
                {avg && (
                  <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-750" style={{ color: s.color }}>
                    Ø {avg} / 5.0
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-mono">
                  ({vals.length}/{axes.length})
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
