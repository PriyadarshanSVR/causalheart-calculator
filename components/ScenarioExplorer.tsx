import React, { useState, useMemo } from 'react';
import { Intervention, RiskAnalysisResult } from '../types';
import { Check, AlertCircle } from 'lucide-react';

interface Props {
  result: RiskAnalysisResult;
  onReset: () => void;
}

// ── Risk level helpers ────────────────────────────────────────────────────────

const getRiskLevel = (risk: number) => {
  if (risk < 10) return { label: 'Low Risk',      color: '#22c55e', barColor: 'bg-green-500',  badgeBg: 'bg-green-100',  badgeText: 'text-green-700' };
  if (risk < 20) return { label: 'Moderate Risk', color: '#f59e0b', barColor: 'bg-amber-400',  badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700' };
  return           { label: 'High Risk',          color: '#ef4444', barColor: 'bg-red-500',    badgeBg: 'bg-red-100',    badgeText: 'text-red-700'   };
};

const DOMAIN_ICONS: Record<string, string> = {
  Smoking:       '🚭',
  Activity:      '🏃',
  Weight:        '⚖️',
  Diet:          '🥗',
  Sleep:         '😴',
  Alcohol:       '🍷',
  'Sun Exposure':'☀️',
};

// Domain badge colors (background + text)
const DOMAIN_COLORS: Record<string, string> = {
  Activity:      'bg-teal-100 text-teal-700',
  Diet:          'bg-lime-100 text-lime-700',
  Weight:        'bg-sky-100 text-sky-700',
  Smoking:       'bg-rose-100 text-rose-700',
  Sleep:         'bg-indigo-100 text-indigo-700',
  Alcohol:       'bg-purple-100 text-purple-700',
  'Sun Exposure':'bg-amber-100 text-amber-700',
};

// Left-border accent per benefit level
const CARD_BORDER: Record<string, string> = {
  high:     'border-l-emerald-500',
  moderate: 'border-l-amber-400',
  low:      'border-l-blue-400',
  none:     'border-l-slate-200',
};

// Reduction text colour per benefit level
const REDUCTION_COLOR: Record<string, string> = {
  high:     'text-emerald-600',
  moderate: 'text-amber-600',
  low:      'text-blue-600',
  none:     'text-slate-400',
};

// ── Risk bar ─────────────────────────────────────────────────────────────────

const RiskBar = ({ risk }: { risk: number }) => {
  const level = getRiskLevel(risk);
  // Map 0–50%+ onto bar width; cap at 100%
  const fillPct = Math.min(100, (risk / 50) * 100);
  return (
    <div className="mt-3 mb-1">
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${level.barColor}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[11px] text-gray-400 font-medium">
        <span>Low (0%)</span>
        <span>High (50%+)</span>
      </div>
    </div>
  );
};

// ── Stat chip ─────────────────────────────────────────────────────────────────

const StatChip = ({ value, label }: { value: string; label: string }) => (
  <div className="flex-1 min-w-0 text-center">
    <p className="text-base font-black text-slate-800 leading-tight">{value}</p>
    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{label}</p>
  </div>
);

// ── Intervention card ─────────────────────────────────────────────────────────

const InterventionCard = ({
  item,
  isFeatured,
  isSelected,
  onToggle,
}: {
  item: Intervention;
  isFeatured: boolean;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) => {
  const borderAccent = CARD_BORDER[item.benefitLevel] ?? 'border-l-slate-200';
  const reductionColor = REDUCTION_COLOR[item.benefitLevel] ?? 'text-slate-500';
  const domainColor = DOMAIN_COLORS[item.domain] ?? 'bg-slate-100 text-slate-600';
  const domainIcon = DOMAIN_ICONS[item.domain] ?? '📋';

  return (
    <div
      onClick={() => onToggle(item.id)}
      className={`
        relative rounded-xl border border-slate-200 border-l-4 ${borderAccent} bg-white
        cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-300 shadow-md bg-blue-50/30' : 'hover:shadow-sm hover:border-slate-300'}
      `}
    >
      <div className="p-5">
        {/* Top labels row */}
        <div className="flex items-center gap-2 mb-3">
          {isFeatured && (
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
              Biggest difference for you
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${domainColor} ${isFeatured ? 'ml-auto' : ''}`}>
            <span>{domainIcon}</span>
            {item.domain}
          </span>
          {isSelected && (
            <div className="ml-auto bg-blue-600 text-white rounded-full p-1 flex-shrink-0">
              <Check size={12} />
            </div>
          )}
        </div>

        {/* Main content row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: title + description + current/target */}
          <div className="flex-1 min-w-0">
            <h4 className="text-[15px] font-bold text-slate-900 leading-tight mb-1">{item.title}</h4>
            <p className="text-[13px] text-slate-500 mb-3 leading-snug">{item.description}</p>
            <p className="text-[12px] text-slate-500">
              Current:{' '}
              <span className="font-semibold text-slate-700">{item.currentValueDisplay}</span>
              {'  ·  '}
              Target:{' '}
              <span className="font-semibold text-blue-600">{item.targetValueDisplay}</span>
            </p>
          </div>

          {/* Right: reduction % + CI */}
          <div className="text-right flex-shrink-0 pl-3 border-l border-slate-100">
            <p className={`text-2xl font-black tracking-tight ${reductionColor}`}>
              −{item.absoluteReduction}%
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">95% range</p>
            <p className="text-[11px] text-slate-500 font-mono">
              −{item.confidenceInterval[0]}% to −{item.confidenceInterval[1]}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Achieved card ─────────────────────────────────────────────────────────────

const AchievedCard = ({ item }: { item: Intervention }) => {
  const domainIcon = DOMAIN_ICONS[item.domain] ?? '✅';
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200">
      <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Check size={12} className="text-emerald-600" strokeWidth={3} />
      </div>
      <div>
        <p className="text-[13px] font-bold text-slate-800 leading-tight">
          {domainIcon} {item.domain}
        </p>
        <p className="text-[12px] text-slate-500 mt-0.5">{item.currentValueDisplay}</p>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const ScenarioExplorer: React.FC<Props> = ({ result, onReset }) => {
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectionOrder), [selectionOrder]);

  const toggleIntervention = (id: string) => {
    setSelectionOrder(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const orderedSelected = useMemo(() =>
    selectionOrder
      .map(id => result.interventions.find(i => i.id === id))
      .filter((i): i is Intervention => !!i && !i.achieved),
    [selectionOrder, result.interventions]
  );

  // Apply selected interventions to baseline risk
  const displayRisk = useMemo(() => {
    let r = result.baselineRisk;
    orderedSelected.forEach(inv => { r = r * (1 - inv.relativeReduction / 100); });
    return Math.max(0.5, parseFloat(r.toFixed(1)));
  }, [result.baselineRisk, orderedSelected]);

  const totalReduction = (result.baselineRisk - displayRisk).toFixed(1);
  const level = getRiskLevel(displayRisk);

  const nonAchieved = result.interventions.filter(i => !i.achieved);
  const achieved    = result.interventions.filter(i => i.achieved);
  const relativeRisk = (result.baselineRisk / result.typicalRisk).toFixed(1);
  const inN = Math.round(result.baselineRisk);

  return (
    <div className="w-full max-w-2xl mx-auto pb-20">

      {/* ── Risk Summary Card ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <p className="text-[12px] text-slate-500 font-medium mb-3">
          Your estimated 10-year heart and stroke risk
        </p>

        {/* Big number + badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-5xl font-black tracking-tight" style={{ color: level.color }}>
            {displayRisk}%
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${level.badgeBg} ${level.badgeText}`}>
            {level.label}
          </span>
          {selectedSet.size > 0 && (
            <span className="text-sm text-emerald-600 font-semibold ml-1">
              ↓ {totalReduction}% reduced
            </span>
          )}
        </div>

        {/* Risk bar */}
        <RiskBar risk={displayRisk} />

        {/* 3 stats */}
        <div className="flex items-stretch divide-x divide-slate-100 mt-4 pt-4 border-t border-slate-100">
          <StatChip value={`${result.typicalRisk}%`} label="Typical person, same sex" />
          <div className="flex-shrink-0 w-px" />
          <StatChip value={`${relativeRisk}×`}       label="Your relative risk" />
          <div className="flex-shrink-0 w-px" />
          <StatChip value={`${inN} in 100`}           label="People like you affected" />
        </div>

        {/* Selected actions summary */}
        {selectedSet.size > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Selected actions
            </p>
            <div className="flex flex-wrap gap-2">
              {result.interventions.filter(i => selectedSet.has(i.id)).map(i => (
                <span
                  key={i.id}
                  onClick={() => toggleIntervention(i.id)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[12px] font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <Check size={11} strokeWidth={3} />
                  {i.title}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {result.baselineRisk}% → {displayRisk}% with these changes
            </p>
          </div>
        )}
      </div>

      {/* ── Action Plan ──────────────────────────────────────────────────── */}
      {nonAchieved.length > 0 && (
        <>
          <div className="mb-5">
            <h3 className="text-[17px] font-bold text-slate-900">Your personalised action plan</h3>
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
              Ranked by estimated benefit for someone with your profile. Tap a card to see its effect on your risk.
            </p>
          </div>

          <div className="space-y-3">
            {nonAchieved.map((item, idx) => (
              <InterventionCard
                key={item.id}
                item={item}
                isFeatured={idx === 0}
                isSelected={selectedSet.has(item.id)}
                onToggle={toggleIntervention}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Already healthy ───────────────────────────────────────────────── */}
      {achieved.length > 0 && (
        <div className="mt-8">
          <h4 className="text-[14px] font-bold text-slate-700 mb-3">
            Already at a healthy level — keep it up
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {achieved.map(item => (
              <AchievedCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <div className="mt-10 p-4 bg-amber-50 rounded-xl border border-amber-200/60 flex gap-3 text-sm text-amber-900 shadow-sm">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800 mb-0.5">Medical disclaimer</p>
          <p className="text-[12px] leading-relaxed opacity-80">
            This tool uses population study data to estimate how lifestyle changes may affect your risk.
            Results are estimates, not guarantees. Always speak to a healthcare professional before
            making significant lifestyle changes.
          </p>
        </div>
      </div>

      <div className="mt-8 text-center pb-4">
        <button
          onClick={onReset}
          className="text-slate-400 hover:text-slate-700 underline text-sm font-medium transition-colors"
        >
          Start over with new data
        </button>
      </div>
    </div>
  );
};
