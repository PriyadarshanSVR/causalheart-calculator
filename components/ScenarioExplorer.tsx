import React, { useState, useMemo } from 'react';
import { Intervention, RiskAnalysisResult } from '../types';
import { ArrowRight, Check, AlertCircle, Layers, Clock } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceLine, CartesianGrid, Legend,
} from 'recharts';
import { RiskGauge } from './RiskGauge';

interface Props {
  result: RiskAnalysisResult;
  onReset: () => void;
}

// ── Benefit level helpers ────────────────────────────────────────────────────

const BENEFIT_BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  moderate: 'border-l-amber-500',
  low: 'border-l-blue-400',
  none: 'border-l-green-400',
};

const BENEFIT_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border border-red-200',
  moderate: 'bg-amber-100 text-amber-700 border border-amber-200',
  low: 'bg-blue-100 text-blue-600 border border-blue-200',
  none: 'bg-green-100 text-green-700 border border-green-200',
};

const BENEFIT_REDUCTION_COLOR: Record<string, string> = {
  high: 'text-red-600',
  moderate: 'text-amber-600',
  low: 'text-blue-600',
  none: 'text-green-600',
};

const AREA_COLORS: Record<string, { stroke: string; fill: string }> = {
  high: { stroke: '#dc2626', fill: '#fecaca' },
  moderate: { stroke: '#d97706', fill: '#fde68a' },
  low: { stroke: '#2563eb', fill: '#bfdbfe' },
  none: { stroke: '#16a34a', fill: '#bbf7d0' },
};

// Distinct colours for each cumulative trajectory line (up to 7 interventions)
const TRAJECTORY_PALETTE = [
  { stroke: '#6366f1', dot: '#6366f1' }, // indigo   — 1st intervention
  { stroke: '#10b981', dot: '#10b981' }, // emerald  — 2nd
  { stroke: '#f59e0b', dot: '#f59e0b' }, // amber    — 3rd
  { stroke: '#3b82f6', dot: '#3b82f6' }, // blue     — 4th
  { stroke: '#ec4899', dot: '#ec4899' }, // pink     — 5th
  { stroke: '#14b8a6', dot: '#14b8a6' }, // teal     — 6th
  { stroke: '#8b5cf6', dot: '#8b5cf6' }, // violet   — 7th
];

const DOMAIN_ICONS: Record<string, string> = {
  Smoking: '🚭',
  Activity: '🏃',
  Weight: '⚖️',
  Diet: '🥗',
  Sleep: '😴',
  Alcohol: '🍷',
  'Sun Exposure': '☀️',
};

// ── Temporal graph (Recharts AreaChart) ──────────────────────────────────────

const TemporalGraph = ({
  data,
  benefitLevel,
  id,
}: {
  data: { year1: number; year5: number; year10: number };
  benefitLevel: string;
  id: string;
}) => {
  const colors = AREA_COLORS[benefitLevel] ?? AREA_COLORS.low;
  const gradientId = `tg-gradient-${id}`;

  const chartData = [
    { label: 'Now', value: 0 },
    { label: '1yr', value: data.year1 },
    { label: '5yr', value: data.year5 },
    { label: '10yr', value: data.year10 },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
          <p className="font-bold text-slate-700">{label}</p>
          <p style={{ color: colors.stroke }}>-{payload[0].value}% reduction in risk</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
      <h5 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
        <Clock size={10} /> Risk Reduction Timeline
      </h5>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.fill} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.fill} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide domain={[0, 'dataMax + 2']} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.stroke}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ fill: colors.stroke, r: 3 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-slate-500">
        <span>1yr: <span className="font-bold" style={{ color: colors.stroke }}>-{data.year1}%</span></span>
        <span>5yr: <span className="font-bold" style={{ color: colors.stroke }}>-{data.year5}%</span></span>
        <span>10yr: <span className="font-bold" style={{ color: colors.stroke }}>-{data.year10}%</span></span>
      </div>
    </div>
  );
};

// ── Intervention card ────────────────────────────────────────────────────────

const InterventionCard = ({
  item,
  isSelected,
  onToggle,
  featured = false,
}: {
  item: Intervention;
  isSelected: boolean;
  onToggle: (id: string) => void;
  featured?: boolean;
}) => {
  const borderAccent = BENEFIT_BORDER[item.benefitLevel] ?? 'border-l-slate-400';
  const badgeClass = BENEFIT_BADGE[item.benefitLevel] ?? BENEFIT_BADGE.low;
  const reductionColor = BENEFIT_REDUCTION_COLOR[item.benefitLevel] ?? 'text-slate-700';
  const domainIcon = DOMAIN_ICONS[item.domain] ?? '📋';
  const padding = featured ? 'p-6' : 'p-5';

  let cardClass = '';
  if (item.achieved) {
    cardClass = 'relative rounded-xl border border-green-200 bg-green-50/40 flex flex-col cursor-default overflow-hidden';
  } else if (isSelected) {
    cardClass = `relative group rounded-xl border-l-4 ${borderAccent} border border-blue-400 bg-blue-50 shadow-lg ring-2 ring-blue-300 ring-offset-1 transform scale-[1.01] transition-all duration-300 cursor-pointer flex flex-col overflow-hidden`;
  } else {
    cardClass = `relative group rounded-xl border-l-4 ${borderAccent} border border-slate-100 bg-white hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer flex flex-col overflow-hidden`;
  }

  return (
    <div
      className={cardClass}
      onClick={() => !item.achieved && onToggle(item.id)}
    >
      {/* Achieved banner */}
      {item.achieved && (
        <div className="bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 flex items-center gap-1">
          <Check size={10} /> Already Optimized
        </div>
      )}

      <div className={`${padding} flex flex-col sm:flex-row gap-4 justify-between items-start flex-1`}>

        {/* Left: Info */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeClass}`}>
              <span>{domainIcon}</span>
              {item.domain}
            </span>
            {!item.achieved && item.benefitLevel === 'high' && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-red-500">Big difference</span>
            )}
            {isSelected && (
              <div className="ml-auto bg-blue-600 text-white rounded-full p-1 shadow-sm flex-shrink-0">
                <Check size={13} />
              </div>
            )}
          </div>

          <h4 className="text-lg font-bold text-gray-900">{item.title}</h4>
          <p className="text-sm text-gray-500 mt-1 mb-4">{item.description}</p>

          <div className="grid grid-cols-2 gap-4 text-sm bg-white/60 p-3 rounded-lg border border-gray-100/70">
            <div>
              <span className="block text-[10px] text-gray-400 uppercase font-bold">Current</span>
              <span className="font-semibold text-gray-700">{item.currentValueDisplay}</span>
            </div>
            {!item.achieved && (
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-bold">Target</span>
                <span className="font-semibold text-blue-700">{item.targetValueDisplay}</span>
              </div>
            )}
          </div>

          {!item.achieved && (
            <TemporalGraph
              data={item.temporalProjection}
              benefitLevel={item.benefitLevel}
              id={item.id}
            />
          )}
        </div>

        {/* Right: Effect Size */}
        {!item.achieved && (
          <div className="text-right pl-0 sm:pl-4 sm:border-l border-gray-100 min-w-full sm:min-w-[120px] mt-4 sm:mt-0 flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end border-t sm:border-t-0 pt-4 sm:pt-0">
            <div>
              <span className="block text-[10px] text-gray-400 mb-0.5 uppercase font-bold">Reduction</span>
              <span className={`text-4xl font-black tracking-tight ${reductionColor}`}>
                -{item.absoluteReduction}%
              </span>
            </div>
            <div className="text-right mt-0 sm:mt-2">
              <div className="text-[10px] text-gray-400">95% CI</div>
              <div className="text-xs font-mono text-gray-500">
                [-{item.confidenceInterval[0]}%, -{item.confidenceInterval[1]}%]
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const ScenarioExplorer: React.FC<Props> = ({ result, onReset }) => {
  // Single source of truth: ordered array of selected intervention IDs.
  // Using an array (not a Set) means selection order is inherently preserved
  // and there can never be duplicates — one atomic state update, no sync issues.
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);

  // Derived set used only for O(1) membership checks in the card UI
  const selectedInterventions = useMemo(() => new Set(selectionOrder), [selectionOrder]);

  const toggleIntervention = (id: string) => {
    setSelectionOrder(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)   // remove — also removes any accidental duplicate
        : [...prev, id],               // append once
    );
  };

  // Ordered non-achieved interventions that are currently selected
  const orderedSelected = useMemo(() =>
    selectionOrder
      .map(id => result.interventions.find(i => i.id === id))
      .filter((i): i is Intervention => !!i && !i.achieved),
    [selectionOrder, result.interventions],
  );

  // Final combined risk (all selected interventions applied)
  const modifiedRisk = useMemo(() => {
    let current = result.baselineRisk;
    orderedSelected.forEach(inv => {
      current = current * (1 - inv.relativeReduction / 100);
    });
    return Math.max(0.5, parseFloat(current.toFixed(1)));
  }, [result.baselineRisk, orderedSelected]);

  const absoluteReductionTotal = (result.baselineRisk - modifiedRisk).toFixed(1);

  // ── Build trajectory data for the line chart ────────────────────────────────
  // Each row has: year label, baseline value, plus one column per cumulative
  // snapshot (after 1st selected intervention, after 1st+2nd, …).
  // Growth follows a logistic curve so risk accelerates realistically.
  const { trajectoryData, cumulativeSnapshots } = useMemo(() => {
    const points = [0, 1, 2, 3, 5, 7, 10];
    const k = 0.35;
    const norm = 1 - Math.exp(-k * 10);

    // Compute the cumulative risk at the 10-yr mark after each added intervention
    const snapshotRisks: number[] = [];
    let runningRisk = result.baselineRisk;
    orderedSelected.forEach(inv => {
      runningRisk = Math.max(0.5, runningRisk * (1 - inv.relativeReduction / 100));
      snapshotRisks.push(parseFloat(runningRisk.toFixed(1)));
    });

    const rows = points.map(yr => {
      const growthFactor = yr === 0 ? 0 : (1 - Math.exp(-k * yr)) / norm;
      const row: Record<string, any> = {
        year: yr === 0 ? 'Now' : `Yr ${yr}`,
        baseline: parseFloat((result.baselineRisk * growthFactor).toFixed(1)),
      };
      snapshotRisks.forEach((sr, idx) => {
        row[`snap_${idx}`] = parseFloat((sr * growthFactor).toFixed(1));
      });
      return row;
    });

    const snapshots = orderedSelected.map((inv, idx) => ({
      key: `snap_${idx}`,
      label: inv.title,
      color: TRAJECTORY_PALETTE[idx % TRAJECTORY_PALETTE.length],
      isLatest: idx === orderedSelected.length - 1,
    }));

    return { trajectoryData: rows, cumulativeSnapshots: snapshots };
  }, [result.baselineRisk, orderedSelected]);

  // Split interventions: featured = first non-achieved high-impact (or just first non-achieved), rest in grid
  const nonAchieved = result.interventions.filter(i => !i.achieved);
  const achieved = result.interventions.filter(i => i.achieved);
  const [featuredItem, ...restNonAchieved] = nonAchieved;
  const gridItems = [...restNonAchieved, ...achieved];

  return (
    <div className="w-full pb-20">

      {/* Top Summary Card */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-slate-50 text-slate-900 rounded-2xl p-6 mb-8 shadow-xl border border-slate-200/60">

        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8">

          {/* Left: Gauge */}
          <div className="flex-1 flex flex-col items-center lg:items-start justify-center">
            <h2 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 w-full text-center lg:text-left">
              Your Estimated 10-Year Heart Risk
            </h2>
            <div className="flex justify-center lg:justify-start w-full">
              <RiskGauge risk={modifiedRisk} baselineRisk={result.baselineRisk} />
            </div>

            {selectedInterventions.size === 0 ? (
              <p className="text-slate-500 text-sm mt-4 max-w-md text-center lg:text-left">
                Based on your current lifestyle. Tap an action below to see how much it could help.
              </p>
            ) : (
              <div className="mt-6 bg-emerald-50 rounded-lg p-4 border border-emerald-100 w-full">
                <h4 className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Layers size={14} /> Your Selected Actions
                </h4>
                <ul className="space-y-2 mb-3">
                  {result.interventions.filter(i => selectedInterventions.has(i.id)).map(i => (
                    <li key={i.id} className="flex items-start gap-2 text-sm text-emerald-900 font-medium">
                      <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      {i.title}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-emerald-200 flex justify-between items-center">
                  <span className="text-sm text-emerald-700">Estimated Benefit</span>
                  <span className="font-bold text-emerald-800">
                    {result.baselineRisk}% <ArrowRight size={14} className="inline mx-1" /> {modifiedRisk}%
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-center">
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200">
                    ↓ {absoluteReductionTotal}% potential reduction in your risk
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Risk Trajectory Line Chart */}
          <div className="w-full lg:w-1/2 bg-white/70 border border-slate-100 rounded-xl p-4 flex flex-col">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 text-center">
              10-Year Risk Trajectory
            </h4>
            <p className="text-[10px] text-slate-400 text-center mb-3">
              {orderedSelected.length === 0
                ? 'Select actions below — each one adds a new line showing your improving risk'
                : orderedSelected.length === 1
                ? 'Grey dotted = no changes · Coloured = with 1 action'
                : `Grey dotted = no changes · Each line adds one more action (${orderedSelected.length} selected)`}
            </p>
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trajectoryData}
                  margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, Math.ceil(result.baselineRisk + 2)]}
                    width={34}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: 11,
                      boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'baseline') return [`${value}%`, 'No changes'];
                      const snap = cumulativeSnapshots.find(s => s.key === name);
                      const label = snap
                        ? `+${cumulativeSnapshots.indexOf(snap) + 1}: ${snap.label}`
                        : name;
                      return [`${value}%`, label];
                    }}
                    labelFormatter={(label) => `📅 ${label}`}
                  />

                  {/* Baseline — dotted grey; fades once any intervention is selected */}
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="#94a3b8"
                    strokeWidth={orderedSelected.length > 0 ? 1.5 : 2.5}
                    strokeOpacity={orderedSelected.length > 0 ? 0.4 : 1}
                    strokeDasharray="6 3"
                    dot={false}
                    activeDot={{ r: 4, fill: '#94a3b8' }}
                    name="baseline"
                    animationDuration={500}
                    isAnimationActive
                  />

                  {/* One line per cumulative snapshot — earlier ones fade, latest is boldest */}
                  {cumulativeSnapshots.map((snap, idx) => {
                    const totalSnaps = cumulativeSnapshots.length;
                    const isLatest = idx === totalSnaps - 1;
                    // Earlier lines get progressively more transparent and thinner
                    const opacity = isLatest ? 1 : 0.35 + (idx / totalSnaps) * 0.3;
                    const strokeW = isLatest ? 2.5 : 1.5;
                    return (
                      <Line
                        key={snap.key}
                        type="monotone"
                        dataKey={snap.key}
                        stroke={snap.color.stroke}
                        strokeWidth={strokeW}
                        strokeOpacity={opacity}
                        dot={isLatest
                          ? { fill: snap.color.dot, r: 3, strokeWidth: 0 }
                          : false}
                        activeDot={{ r: 4, fill: snap.color.dot }}
                        name={snap.key}
                        animationDuration={500}
                        isAnimationActive
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-3">
              {/* Baseline entry */}
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <svg width="20" height="4">
                  <line x1="0" y1="2" x2="20" y2="2"
                    stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 2" />
                </svg>
                No changes
              </span>
              {/* One entry per snapshot */}
              {cumulativeSnapshots.map((snap, idx) => (
                <span
                  key={snap.key}
                  className="flex items-center gap-1.5 text-[11px] font-medium"
                  style={{ color: snap.color.stroke,
                    opacity: idx === cumulativeSnapshots.length - 1 ? 1 : 0.6 }}
                >
                  <svg width="20" height="4">
                    <line x1="0" y1="2" x2="20" y2="2"
                      stroke={snap.color.stroke} strokeWidth="2.5" />
                  </svg>
                  +{idx + 1} {snap.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Intervention section header */}
      <h3 className="text-xl font-bold text-gray-800 mb-6 px-1 flex items-center gap-2">
        Your Personalised Action Plan
        <span className="text-xs font-normal text-white bg-blue-600 px-2 py-0.5 rounded-full">
          Tap to explore
        </span>
      </h3>

      {/* Featured top intervention (full width) */}
      {featuredItem && (
        <div className="mb-4">
          <InterventionCard
            item={featuredItem}
            isSelected={selectedInterventions.has(featuredItem.id)}
            onToggle={toggleIntervention}
            featured
          />
        </div>
      )}

      {/* Remaining cards grid */}
      {gridItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {gridItems.map(item => (
            <InterventionCard
              key={item.id}
              item={item}
              isSelected={selectedInterventions.has(item.id)}
              onToggle={toggleIntervention}
            />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-12 p-5 bg-amber-50 rounded-xl border border-amber-200/60 text-sm text-amber-900 flex gap-4 shadow-sm">
        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-bold mb-1 text-amber-800">Medical Disclaimer</p>
          <p className="opacity-80 text-xs leading-relaxed">
            This tool uses health data from large population studies to estimate how lifestyle changes
            may affect your heart risk. Results are estimates, not guarantees — everyone is different.
            Always speak to a healthcare professional before making significant changes to your lifestyle.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center pb-8">
        <button
          onClick={onReset}
          className="text-slate-500 hover:text-slate-800 underline text-sm font-medium transition-colors"
        >
          Start Over with New Data
        </button>
      </div>
    </div>
  );
};
