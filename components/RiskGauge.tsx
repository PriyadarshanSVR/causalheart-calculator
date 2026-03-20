import React from 'react';

interface RiskGaugeProps {
  risk: number;
  baselineRisk: number;
}

const getRiskLevel = (risk: number) => {
  if (risk < 10) return {
    label: 'Low Risk',
    color: '#22c55e',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  };
  if (risk < 20) return {
    label: 'Moderate Risk',
    color: '#f59e0b',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  };
  return {
    label: 'High Risk',
    color: '#ef4444',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  };
};

// Build an SVG arc path.
// Angles in standard SVG degrees: 0=right, 90=down, 180=left.
// The gauge track goes from 180° (left) through the top to 0° (right).
// sweep-flag=0 means counter-clockwise in SVG coordinates, which travels through the top.
const describeArc = (
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  // Large-arc flag: 1 when angular span > 180°
  const span = ((endDeg - startDeg) + 360) % 360;
  const largeArc = span > 180 ? 1 : 0;
  // sweep-flag 0 = counter-clockwise (goes through the top of the arc)
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
};

export const RiskGauge: React.FC<RiskGaugeProps> = ({ risk, baselineRisk }) => {
  // Arc centre sits at (100, 95); radius 72.
  // The viewBox is 200 × 105 so the full semicircle (top of arc at y≈23, bottom at y=95)
  // fits entirely within the box with no overflow.
  const cx = 100;
  const cy = 95;
  const r = 72;

  // Map risk 0–100 to angle 180°→0° (left→right through the top)
  const clampedRisk = Math.min(Math.max(risk, 0), 100);
  const fillEndDeg = 180 - (clampedRisk / 100) * 180;

  const level = getRiskLevel(risk);
  const showReduction = risk < baselineRisk;
  const reduction = (baselineRisk - risk).toFixed(1);

  // Needle tip coordinates
  const needleRad = (fillEndDeg * Math.PI) / 180;
  const needleTipX = (cx + r * Math.cos(needleRad)).toFixed(2);
  const needleTipY = (cy + r * Math.sin(needleRad)).toFixed(2);

  return (
    <div className="flex flex-col items-center">
      {/* SVG arc — strictly clipped to its own bounds, no overflow */}
      <div className="relative w-56" style={{ height: '120px' }}>
        <svg viewBox="0 0 200 105" className="w-full h-full" style={{ overflow: 'hidden' }}>

          {/* Zone background tracks */}
          {/* Low zone: 180°→120° */}
          <path
            d={describeArc(cx, cy, r, 180, 120)}
            fill="none"
            stroke="#dcfce7"
            strokeWidth="16"
            strokeLinecap="butt"
          />
          {/* Medium zone: 120°→60° */}
          <path
            d={describeArc(cx, cy, r, 120, 60)}
            fill="none"
            stroke="#fef3c7"
            strokeWidth="16"
            strokeLinecap="butt"
          />
          {/* High zone: 60°→0° */}
          <path
            d={describeArc(cx, cy, r, 60, 0)}
            fill="none"
            stroke="#fee2e2"
            strokeWidth="16"
            strokeLinecap="butt"
          />

          {/* Active fill arc */}
          {clampedRisk > 0 && (
            <path
              d={describeArc(cx, cy, r, 180, fillEndDeg)}
              fill="none"
              stroke={level.color}
              strokeWidth="16"
              strokeLinecap="round"
            />
          )}

          {/* Needle dot at tip */}
          <circle
            cx={needleTipX}
            cy={needleTipY}
            r="7"
            fill="white"
            stroke={level.color}
            strokeWidth="3"
          />

          {/* Zone labels — placed near the arc ends */}
          <text x="16" y="102" fontSize="8" fill="#86efac" fontWeight="700" textAnchor="start">LOW</text>
          <text x="100" y="22" fontSize="8" fill="#fbbf24" fontWeight="700" textAnchor="middle">MED</text>
          <text x="184" y="102" fontSize="8" fill="#fca5a5" fontWeight="700" textAnchor="end">HIGH</text>
        </svg>

        {/* Score text — sits below the arc, centred horizontally */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span
            className="text-4xl font-extrabold tracking-tight leading-none"
            style={{ color: level.color }}
          >
            {risk}%
          </span>
          {showReduction && (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mt-1">
              -{reduction}% reduced
            </span>
          )}
        </div>
      </div>

      {/* Risk level badge */}
      <div
        className={`mt-3 px-4 py-1.5 rounded-full text-sm font-bold border ${level.bgColor} ${level.textColor} ${level.borderColor}`}
      >
        {level.label}
      </div>
    </div>
  );
};
