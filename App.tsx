import React, { useState } from 'react';
import { UserProfile, RiskAnalysisResult } from './types';
import { calculateCausalRisk } from './services/causalEngine';
import { InputForm } from './components/InputForm';
import { ScenarioExplorer } from './components/ScenarioExplorer';
import { Activity, HeartPulse, Check, ChevronRight, Heart, Lock } from 'lucide-react';

const LOADING_STEPS = [
  { icon: '🧬', label: 'Building your health profile',       detail: 'Sex, BMI, lifestyle habits' },
  { icon: '🔬', label: 'Estimating your lifestyle benefits', detail: 'Comparing against similar health profiles' },
  { icon: '📊', label: 'Preparing your action plan',         detail: 'Personalising your opportunities to improve' },
];

// What topics the questionnaire covers — shown on the landing page
const QUESTION_TOPICS = [
  { icon: '⚖️', label: 'Body measurements',  detail: 'Height, weight & BMI' },
  { icon: '😴', label: 'Sleep',               detail: 'Nightly hours of rest' },
  { icon: '🚬', label: 'Smoking',             detail: 'Tobacco & nicotine history' },
  { icon: '🍷', label: 'Alcohol',             detail: 'Drinking frequency' },
  { icon: '🏃', label: 'Physical activity',   detail: 'Exercise days & minutes' },
  { icon: '🛋️', label: 'Sedentary time',      detail: 'TV, screen & driving hours' },
  { icon: '☀️', label: 'Sun exposure',        detail: 'Seasonal outdoor time' },
  { icon: '🥗', label: 'Diet',                detail: '10-item food checklist' },
];

// ── Right-pane: empty placeholder ────────────────────────────────────────────

const EmptyResultsPane = () => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px] px-10 text-center select-none">
    {/* Icon stack */}
    <div className="relative mb-8">
      <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-blue-50 border-2 border-slate-200 rounded-3xl flex items-center justify-center shadow-sm">
        <Heart className="w-12 h-12 text-slate-300" strokeWidth={1.5} />
      </div>
      <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
        <Lock className="w-4 h-4 text-slate-400" strokeWidth={2} />
      </div>
    </div>

    <h2 className="text-xl font-extrabold text-slate-700 mb-3">
      Your results will appear here
    </h2>
    <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
      Complete all 10 questions on the left to reveal your personalised
      10-year cardiovascular risk score and action plan.
    </p>

    {/* Decorative step preview */}
    <div className="mt-10 flex items-center gap-1.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center"
        >
          <span className="text-[9px] font-bold text-slate-300">{i + 1}</span>
        </div>
      ))}
    </div>
    <p className="text-[11px] text-slate-300 mt-2 font-medium">10 questions · ~3 minutes</p>
  </div>
);

// ── Right-pane: first-reveal loading animation ────────────────────────────────

const RevealingPane = ({ loadingStep }: { loadingStep: number }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[500px] px-8 space-y-8">
    <div className="relative w-20 h-20">
      <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-50" />
      <div className="absolute inset-0 rounded-full bg-blue-50 border-4 border-blue-200 flex items-center justify-center">
        <HeartPulse className="text-blue-600 w-8 h-8 animate-pulse" />
      </div>
    </div>
    <div className="space-y-3 w-full max-w-sm">
      {LOADING_STEPS.map((s, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-500 ${
            i < loadingStep
              ? 'bg-emerald-50 border border-emerald-100 opacity-70'
              : i === loadingStep
              ? 'bg-white border border-blue-200 shadow-md'
              : 'bg-slate-50 border border-transparent opacity-40'
          }`}
        >
          <span className="text-xl w-8 text-center flex-shrink-0">{s.icon}</span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${i === loadingStep ? 'text-slate-800' : 'text-slate-500'}`}>
              {s.label}
            </p>
            <p className="text-xs text-slate-400">{s.detail}</p>
          </div>
          {i < loadingStep && <Check size={16} className="text-emerald-500 ml-auto mt-0.5 flex-shrink-0" />}
          {i === loadingStep && (
            <div className="ml-auto mt-1 flex-shrink-0">
              <div className="w-3 h-3 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [view, setView]               = useState<'landing' | 'editor'>('landing');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult]           = useState<RiskAnalysisResult | null>(null);
  const [resetKey, setResetKey]       = useState(0);

  // Landing → editor
  const handleBegin = () => {
    setView('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // First-time submission from step 10
  const handleCalculate = (profile: UserProfile) => {
    setIsRevealing(true);
    setLoadingStep(0);
    setTimeout(() => setLoadingStep(1), 450);
    setTimeout(() => setLoadingStep(2), 900);
    setTimeout(() => {
      const analysis = calculateCausalRisk(profile);
      setResult(analysis);
      setIsCompleted(true);
      setIsRevealing(false);
    }, 1500);
  };

  // Live recalculation on every answer change after first completion
  const handleProfileChange = (profile: UserProfile) => {
    const analysis = calculateCausalRisk(profile);
    setResult(analysis);
  };

  // Reset — remounts InputForm (step 1, fresh profile) and clears results
  const handleReset = () => {
    setIsCompleted(false);
    setIsRevealing(false);
    setResult(null);
    setResetKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-blue-50/20 to-slate-50 text-slate-900 font-sans selection:bg-blue-100">

      {/* ── Header — hidden on landing ──────────────────────────────────────── */}
      {view !== 'landing' && (
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 shadow-sm h-16 flex-shrink-0">
          <div className="max-w-full px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                <Activity size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-stone-900 leading-none">
                  Heart Health <span className="text-blue-600">Calculator</span>
                </h1>
                <p className="text-[9px] text-stone-400 font-medium tracking-widest uppercase">Cardiovascular Risk</p>
              </div>
            </div>

            {isCompleted && (
              <button
                onClick={handleReset}
                className="text-sm font-semibold text-slate-600 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
              >
                Reset Answers
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── LANDING PAGE ───────────────────────────────────────────────────── */}
      {view === 'landing' && (
        <div className="min-h-screen flex flex-col">

          {/* Hero section */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">

            {/* Logo mark */}
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
                <Heart className="text-white w-10 h-10" strokeWidth={2.5} />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-blue-400 animate-ping opacity-10" />
            </div>

            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">
              Cardiovascular Risk Tool
            </p>

            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-4 max-w-2xl">
              Understand your heart risk,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
                personally.
              </span>
            </h1>

            <p className="text-slate-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Most calculators just give you a number. This one tells you{' '}
              <strong className="text-slate-700">what you can do about it</strong> — estimating how
              much each lifestyle change could lower your 10-year heart risk.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-lg">
              {[
                { icon: '⏱️', text: '~3 minutes' },
                { icon: '🔒', text: 'No data stored' },
                { icon: '📋', text: '10 short questions' },
                { icon: '📊', text: 'Personalised results' },
              ].map(pill => (
                <span
                  key={pill.text}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm"
                >
                  <span>{pill.icon}</span> {pill.text}
                </span>
              ))}
            </div>

            <button
              onClick={handleBegin}
              className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold text-lg px-10 py-4 rounded-2xl shadow-xl shadow-blue-900/20 transition-all duration-200 active:scale-95 hover:shadow-2xl hover:shadow-blue-900/30"
            >
              <Heart size={22} strokeWidth={2.5} />
              Let's check your heart health
              <ChevronRight size={20} className="transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            <p className="text-xs text-slate-400 mt-4">
              For informational purposes only · Not a medical diagnosis
            </p>
          </div>

          {/* What we'll ask section */}
          <div className="bg-white/70 backdrop-blur-sm border-t border-slate-100 px-6 py-10">
            <div className="max-w-2xl mx-auto">
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                What we'll ask about
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUESTION_TOPICS.map(topic => (
                  <div
                    key={topic.label}
                    className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm"
                  >
                    <span className="text-2xl mb-1.5">{topic.icon}</span>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{topic.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{topic.detail}</p>
                  </div>
                ))}
                <div className="flex flex-col items-center text-center p-3 bg-gradient-to-br from-blue-50 to-teal-50 rounded-xl border border-blue-100 shadow-sm">
                  <span className="text-2xl mb-1.5">✨</span>
                  <p className="text-xs font-bold text-blue-700 leading-tight">Your results</p>
                  <p className="text-[10px] text-blue-500 mt-0.5 leading-tight">Personalised action plan</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── EDITOR: Split-pane layout ──────────────────────────────────────── */}
      {view === 'editor' && (
        <div className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)]">

          {/* ── Left pane: questionnaire ──────────────────────────────────── */}
          <div className="
            w-full md:w-[440px] md:flex-shrink-0
            md:border-r md:border-slate-200
            md:overflow-y-auto
            bg-gradient-to-b from-white to-slate-50/50
          ">
            <div className="p-6 pb-8">
              <InputForm
                key={resetKey}
                onCalculate={handleCalculate}
                onProfileChange={handleProfileChange}
                isCompleted={isCompleted}
              />
            </div>
          </div>

          {/* ── Right pane: results ───────────────────────────────────────── */}
          <div className="
            flex-1 min-w-0
            md:overflow-y-auto
            bg-gradient-to-br from-stone-50 via-blue-50/10 to-slate-50
            border-t md:border-t-0 border-slate-200
          ">
            {isRevealing ? (
              <RevealingPane loadingStep={loadingStep} />
            ) : result ? (
              <div className="p-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <ScenarioExplorer result={result} onReset={handleReset} />
              </div>
            ) : (
              <EmptyResultsPane />
            )}
          </div>

        </div>
      )}

    </div>
  );
}

export default App;
