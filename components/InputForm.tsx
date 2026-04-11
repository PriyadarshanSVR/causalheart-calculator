import React, { useState, useEffect } from 'react';
import { UserProfile, AlcoholFrequency } from '../types';
import { defaultProfile } from '../services/causalEngine';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface InputFormProps {
  onCalculate: (profile: UserProfile) => void;
  onProfileChange?: (profile: UserProfile) => void; // live recalc after completion
  isCompleted?: boolean;                             // enables clickable step dots
}

// ── Shared sub-component types ────────────────────────────────────────────────

interface StepProps {
  profile: UserProfile;
  handleChange: (field: keyof UserProfile, value: any) => void;
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

const ProgressBar = ({
  currentStep,
  totalSteps,
  allCompleted = false,
  onStepClick,
}: {
  currentStep: number;
  totalSteps: number;
  allCompleted?: boolean;
  onStepClick?: (step: number) => void;
}) => {
  const pct = allCompleted ? 100 : Math.round(((currentStep - 1) / totalSteps) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {allCompleted ? 'Edit answers below' : `Question ${currentStep} of ${totalSteps}`}
        </span>
        <span className="text-xs font-bold text-blue-600">{pct}% complete</span>
      </div>

      {/* Gradient progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-teal-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Step dots — clickable when allCompleted */}
      <div className="flex justify-between gap-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isPast    = allCompleted ? step !== currentStep : step < currentStep;
          const isCurrent = step === currentStep;

          const baseBar = `flex-1 h-1.5 rounded-full transition-all duration-300 ${
            isPast
              ? 'bg-teal-500'
              : isCurrent
              ? 'bg-blue-600 scale-y-125'
              : 'bg-slate-200'
          }`;

          if (allCompleted && onStepClick) {
            return (
              <button
                key={step}
                type="button"
                title={`Go to question ${step}`}
                onClick={() => onStepClick(step)}
                className={`${baseBar} cursor-pointer hover:opacity-75 active:scale-y-150`}
              />
            );
          }
          return <div key={step} className={baseBar} />;
        })}
      </div>

      {/* Hint text once all completed */}
      {allCompleted && (
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Tap any bar above to jump to that question
        </p>
      )}
    </div>
  );
};

// ── OptionCard ────────────────────────────────────────────────────────────────

const OptionCard = ({
  icon,
  label,
  sublabel,
  selected,
  onClick,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
      selected
        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 shadow-md'
        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
    }`}
  >
    <span className="text-2xl flex-shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <p className={`font-semibold text-sm leading-tight ${selected ? 'text-blue-800' : 'text-slate-800'}`}>
        {label}
      </p>
      {sublabel && (
        <p className={`text-xs mt-0.5 ${selected ? 'text-blue-600' : 'text-slate-400'}`}>{sublabel}</p>
      )}
    </div>
    {/* Radio dot */}
    <div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        selected ? 'border-blue-600' : 'border-slate-300'
      }`}
    >
      {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
    </div>
  </button>
);

// ── CheckCard — Yes/No toggle for diet questions ─────────────────────────────

const CheckCard = ({
  label,
  sublabel,
  checked,
  onToggle,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    onClick={onToggle}
    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
      checked
        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-md'
        : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
    }`}
  >
    <div
      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
        checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
      }`}
    >
      {checked && (
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`font-semibold text-sm leading-tight ${checked ? 'text-emerald-800' : 'text-slate-800'}`}>
        {label}
      </p>
      {sublabel && (
        <p className={`text-xs mt-0.5 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>{sublabel}</p>
      )}
    </div>
    <span className={`text-xs font-bold flex-shrink-0 ${checked ? 'text-emerald-600' : 'text-slate-400'}`}>
      {checked ? 'Yes' : 'No'}
    </span>
  </button>
);

// ── NumericStepper ────────────────────────────────────────────────────────────

const NumericStepper = ({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  subtext,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  subtext?: string;
}) => {
  const decrement = () => onChange(Math.max(min, parseFloat((value - step).toFixed(2))));
  const increment = () => onChange(Math.min(max, parseFloat((value + step).toFixed(2))));

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-semibold text-slate-700 text-center">{label}</p>
      {hint && <p className="text-xs text-slate-400 text-center">{hint}</p>}
      <div className="flex items-center gap-4 mt-1">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xl transition-all active:scale-90 flex items-center justify-center"
        >
          −
        </button>
        <div className="text-center min-w-[80px]">
          <span className="text-4xl font-black text-slate-900 tabular-nums leading-none">
            {step < 1 ? value.toFixed(1) : value}
          </span>
          {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold text-xl transition-all active:scale-90 flex items-center justify-center"
        >
          +
        </button>
      </div>
      {subtext && <p className="text-xs text-slate-400 mt-1 text-center">{subtext}</p>}
    </div>
  );
};

// ── Step 1: Sex + Age ─────────────────────────────────────────────────────────

const Step1 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">About you</h2>
      <p className="text-slate-500 text-sm">Tell us your sex and age to calibrate the risk model.</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <OptionCard
        icon="♂️"
        label="Male"
        selected={profile.sex === 'male'}
        onClick={() => handleChange('sex', 'male')}
      />
      <OptionCard
        icon="♀️"
        label="Female"
        selected={profile.sex === 'female'}
        onClick={() => handleChange('sex', 'female')}
      />
    </div>

    <div className="flex justify-center pt-2">
      <NumericStepper
        label="Age"
        hint="This model was built on adults aged 40–73"
        value={profile.age}
        onChange={(v) => handleChange('age', v)}
        min={18} max={90}
        unit="yrs"
      />
    </div>

    {profile.age < 40 && (
      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        The underlying model was trained on adults 40–73. Results outside this range are extrapolated.
      </p>
    )}
  </div>
);

// ── Step 2: BMI (imperial) ────────────────────────────────────────────────────

const Step2 = ({
  profile,
  handleChange,
  heightFeet, setHeightFeet,
  heightInches, setHeightInches,
  weightLbs, setWeightLbs,
}: StepProps & {
  heightFeet: number; setHeightFeet: (v: number) => void;
  heightInches: number; setHeightInches: (v: number) => void;
  weightLbs: number; setWeightLbs: (v: number) => void;
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Height & Weight</h2>
        <p className="text-slate-500 text-sm">Used to calculate your BMI, a key cardiovascular risk factor.</p>
      </div>

      {/* Height */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-4">Height</p>
        <div className="grid grid-cols-2 gap-6">
          <NumericStepper
            label="Feet"
            value={heightFeet}
            onChange={setHeightFeet}
            min={4} max={7}
            unit="ft"
            subtext={`${(heightFeet * 30.48).toFixed(0)} cm`}
          />
          <NumericStepper
            label="Inches"
            value={heightInches}
            onChange={setHeightInches}
            min={0} max={11}
            unit="in"
            subtext={`+ ${(heightInches * 2.54).toFixed(0)} cm`}
          />
        </div>
      </div>

      {/* Weight */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-4">Weight</p>
        <div className="flex justify-center">
          <NumericStepper
            label="Pounds"
            value={weightLbs}
            onChange={setWeightLbs}
            min={80} max={500}
            unit="lbs"
            subtext={`${profile.weightKg.toFixed(1)} kg`}
          />
        </div>
      </div>

      {/* Live BMI badge */}
      {profile.bmi > 0 && (
        <div className="flex items-center p-4 rounded-2xl border-2 bg-slate-50 border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your BMI</p>
            <p className="text-3xl font-black text-slate-800">{profile.bmi.toFixed(1)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Step 3: Sleep ─────────────────────────────────────────────────────────────

const Step3 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-8">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Sleep</h2>
      <p className="text-slate-500 text-sm">How many hours do you usually sleep per night?</p>
    </div>

    <div className="flex justify-center py-4">
      <NumericStepper
        label="Hours per night"
        hint="Recommended: 7–9 hours for adults"
        value={profile.sleepHours}
        onChange={(v) => handleChange('sleepHours', v)}
        min={3} max={14}
        step={0.5}
        unit="hrs"
      />
    </div>
  </div>
);

// ── Step 4: Smoking ───────────────────────────────────────────────────────────

const Step4 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Smoking</h2>
      <p className="text-slate-500 text-sm">
        Includes cigarettes, e-cigarettes, cigars, vapes, or nicotine pouches.
      </p>
    </div>

    <div className="space-y-3">
      <OptionCard
        icon="🚬"
        label="Current smoker"
        sublabel="I currently smoke or use nicotine products"
        selected={profile.smokingStatus === 'current'}
        onClick={() => handleChange('smokingStatus', 'current')}
      />
      <OptionCard
        icon="🕐"
        label="Previous smoker"
        sublabel="I used to smoke but have quit"
        selected={profile.smokingStatus === 'previous'}
        onClick={() => handleChange('smokingStatus', 'previous')}
      />
      <OptionCard
        icon="✅"
        label="Never smoked"
        sublabel="I have never regularly smoked"
        selected={profile.smokingStatus === 'never'}
        onClick={() => handleChange('smokingStatus', 'never')}
      />
    </div>
  </div>
);

// ── Step 5: Alcohol ───────────────────────────────────────────────────────────

const ALCOHOL_OPTIONS: { value: AlcoholFrequency; icon: string; label: string; sublabel: string }[] = [
  { value: 'daily',             icon: '🍺', label: 'Daily or almost daily',       sublabel: 'Most days of the week' },
  { value: 'weekly_frequent',   icon: '🍷', label: 'Three or four times a week',  sublabel: 'Several times a week' },
  { value: 'weekly_occasional', icon: '🥂', label: 'Once or twice a week',        sublabel: 'A few times a week' },
  { value: 'monthly',           icon: '🍹', label: 'One to three times a month',  sublabel: 'Occasional' },
  { value: 'special',           icon: '🎉', label: 'Special occasions only',      sublabel: 'Very rarely' },
  { value: 'never',             icon: '🚫', label: 'Never',                       sublabel: 'I don\'t drink' },
];

const Step5 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Alcohol</h2>
      <p className="text-slate-500 text-sm">How often do you drink alcohol?</p>
    </div>
    <div className="space-y-2.5">
      {ALCOHOL_OPTIONS.map(opt => (
        <OptionCard
          key={opt.value}
          icon={opt.icon}
          label={opt.label}
          sublabel={opt.sublabel}
          selected={profile.alcoholFrequency === opt.value}
          onClick={() => handleChange('alcoholFrequency', opt.value)}
        />
      ))}
    </div>
  </div>
);

// ── Step 6: Physical Activity ─────────────────────────────────────────────────

const Step6 = ({ profile, handleChange }: StepProps) => {
  const modMinsWk = profile.moderateActivityDays * Math.min(180, profile.moderateActivityMinsPerDay);
  const vigMinsWk = profile.vigorousActivityDays * Math.min(180, profile.vigorousActivityMinsPerDay);
  const totalEquiv = modMinsWk + vigMinsWk * 2;

  const paCategory =
    modMinsWk === 0 && vigMinsWk === 0 ? 'Poor' :
    (modMinsWk >= 150 || vigMinsWk >= 75 || (modMinsWk + 2 * vigMinsWk) >= 150) ? 'Ideal' :
    'Intermediate';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Physical Activity</h2>
        <p className="text-slate-500 text-sm">How much do you exercise on a typical week?</p>
      </div>

      {/* Moderate activity */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚶</span>
          <div>
            <p className="font-bold text-slate-800">Moderate activity</p>
            <p className="text-xs text-slate-400">Brisk walking, casual cycling, light swimming</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <NumericStepper
            label="Days per week"
            value={profile.moderateActivityDays}
            onChange={(v) => handleChange('moderateActivityDays', v)}
            min={0} max={7}
            unit="days"
          />
          <NumericStepper
            label="Minutes on those days"
            hint="Max 180 min counted"
            value={profile.moderateActivityMinsPerDay}
            onChange={(v) => handleChange('moderateActivityMinsPerDay', Math.min(180, v))}
            min={0} max={180}
            step={10}
            unit="min"
          />
        </div>
        <p className="text-xs text-slate-400 text-center">
          = {modMinsWk} min/week moderate
        </p>
      </div>

      {/* Vigorous activity */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏃</span>
          <div>
            <p className="font-bold text-slate-800">Vigorous activity</p>
            <p className="text-xs text-slate-400">Running, competitive sport, laps swimming</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <NumericStepper
            label="Days per week"
            value={profile.vigorousActivityDays}
            onChange={(v) => handleChange('vigorousActivityDays', v)}
            min={0} max={7}
            unit="days"
          />
          <NumericStepper
            label="Minutes on those days"
            hint="Max 180 min counted"
            value={profile.vigorousActivityMinsPerDay}
            onChange={(v) => handleChange('vigorousActivityMinsPerDay', Math.min(180, v))}
            min={0} max={180}
            step={10}
            unit="min"
          />
        </div>
        <p className="text-xs text-blue-600 font-semibold text-center">
          ⚡ Vigorous counts double — = {vigMinsWk * 2} min moderate-equivalent
        </p>
      </div>

      {/* Live summary */}
      <div className="flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-50 border-slate-200">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total equivalent</p>
          <p className="text-3xl font-black text-slate-800">
            {totalEquiv} <span className="text-base font-semibold">min/wk</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Activity level</p>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            paCategory === 'Ideal' ? 'bg-teal-100 text-teal-700' :
            paCategory === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {paCategory}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Step 7: Sedentary Time ────────────────────────────────────────────────────

const Step7 = ({ profile, handleChange }: StepProps) => {
  const totalSed = Math.min(24, profile.tvHoursPerDay + profile.computerHoursPerDay + Math.min(11, profile.drivingHoursPerDay));

  const sedCategory =
    totalSed < 3.0 ? 'Low (< 3h)' :
    totalSed < 4.0 ? 'Moderate (3–4h)' :
    totalSed < 5.5 ? 'High (4–5.5h)' :
    'Very High (≥ 5.5h)';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Sedentary Time</h2>
        <p className="text-slate-500 text-sm">
          How many hours per day do you spend sitting (outside of sleep)?
        </p>
      </div>

      {/* TV */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📺</span>
          <div>
            <p className="font-bold text-slate-800">Television / streaming</p>
            <p className="text-xs text-slate-400">Hours watching TV or videos per day</p>
          </div>
        </div>
        <div className="flex justify-center">
          <NumericStepper
            label="Hours per day"
            value={profile.tvHoursPerDay}
            onChange={(v) => handleChange('tvHoursPerDay', v)}
            min={0} max={16}
            step={0.5}
            unit="hr"
          />
        </div>
      </div>

      {/* Computer */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💻</span>
          <div>
            <p className="font-bold text-slate-800">Computer / tablet (leisure)</p>
            <p className="text-xs text-slate-400">Hours on screens (not work) per day</p>
          </div>
        </div>
        <div className="flex justify-center">
          <NumericStepper
            label="Hours per day"
            value={profile.computerHoursPerDay}
            onChange={(v) => handleChange('computerHoursPerDay', v)}
            min={0} max={16}
            step={0.5}
            unit="hr"
          />
        </div>
      </div>

      {/* Driving */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🚗</span>
          <div>
            <p className="font-bold text-slate-800">Driving</p>
            <p className="text-xs text-slate-400">Hours driving per day (max 11h counted)</p>
          </div>
        </div>
        <div className="flex justify-center">
          <NumericStepper
            label="Hours per day"
            value={profile.drivingHoursPerDay}
            onChange={(v) => handleChange('drivingHoursPerDay', v)}
            min={0} max={11}
            step={0.5}
            unit="hr"
          />
        </div>
      </div>

      {/* Live summary */}
      <div className="flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-50 border-slate-200">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total sitting time</p>
          <p className="text-3xl font-black text-slate-800">
            {totalSed.toFixed(1)} <span className="text-base font-semibold">hr/day</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Category</p>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            totalSed < 3.0 ? 'bg-teal-100 text-teal-700' :
            totalSed < 4.0 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {sedCategory}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Step 8: Sun Exposure ──────────────────────────────────────────────────────

const Step8 = ({ profile, handleChange }: StepProps) => {
  const avg = (profile.sunExposureSummer + profile.sunExposureWinter) / 2;
  const sunQuartile =
    avg < 1.5 ? 'Q1 (< 1.5h)' :
    avg < 2.5 ? 'Q2 (1.5–2.5h)' :
    avg < 3.5 ? 'Q3 (2.5–3.5h)' :
    'Q4 (≥ 3.5h)';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Sun Exposure</h2>
        <p className="text-slate-500 text-sm">
          How many hours per day do you spend outdoors on average?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col items-center gap-3 p-5 bg-amber-50/60 rounded-2xl border border-amber-100">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">☀️ Summer</p>
          <p className="text-xs text-slate-400">June – August</p>
          <NumericStepper
            label="Hours/day outdoors"
            value={profile.sunExposureSummer}
            onChange={(v) => handleChange('sunExposureSummer', v)}
            min={0} max={16}
            step={0.5}
            unit="hr"
          />
        </div>

        <div className="flex flex-col items-center gap-3 p-5 bg-blue-50/60 rounded-2xl border border-blue-100">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">❄️ Winter</p>
          <p className="text-xs text-slate-400">December – February</p>
          <NumericStepper
            label="Hours/day outdoors"
            value={profile.sunExposureWinter}
            onChange={(v) => handleChange('sunExposureWinter', v)}
            min={0} max={16}
            step={0.5}
            unit="hr"
          />
        </div>
      </div>

      {/* Live average */}
      <div className="flex items-center justify-between p-4 rounded-2xl border-2 bg-slate-50 border-slate-200">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Annual average</p>
          <p className="text-3xl font-black text-slate-800">
            {avg.toFixed(1)} <span className="text-base font-semibold">hr/day</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Quartile</p>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {sunQuartile}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Step 9: Diet Part 1 (5 items) ────────────────────────────────────────────

const Step9 = ({ profile, handleChange }: StepProps) => {
  const score1 = [profile.dietFruit, profile.dietVeg, profile.dietWholeGrains, profile.dietFish, profile.dietDairy].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Diet — Part 1</h2>
        <p className="text-slate-500 text-sm">
          Tick each item you typically meet. There are no right answers — just be honest.
        </p>
      </div>

      <div className="space-y-2.5">
        <CheckCard
          label="3+ servings of fruit per day"
          sublabel="e.g. an apple, banana, or handful of berries = 1 serving"
          checked={profile.dietFruit}
          onToggle={() => handleChange('dietFruit', !profile.dietFruit)}
        />
        <CheckCard
          label="3+ servings of vegetables per day"
          sublabel="e.g. a side salad, or 3 tablespoons cooked veg = 1 serving"
          checked={profile.dietVeg}
          onToggle={() => handleChange('dietVeg', !profile.dietVeg)}
        />
        <CheckCard
          label="3+ servings of whole grains per day"
          sublabel="e.g. wholemeal bread, oats, brown rice, or wholegrain pasta"
          checked={profile.dietWholeGrains}
          onToggle={() => handleChange('dietWholeGrains', !profile.dietWholeGrains)}
        />
        <CheckCard
          label="Fish at least twice a week"
          sublabel="Oily fish (salmon, mackerel, sardines) or white fish"
          checked={profile.dietFish}
          onToggle={() => handleChange('dietFish', !profile.dietFish)}
        />
        <CheckCard
          label="2+ servings of dairy per day"
          sublabel="e.g. milk, yoghurt, or cheese"
          checked={profile.dietDairy}
          onToggle={() => handleChange('dietDairy', !profile.dietDairy)}
        />
      </div>

      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Score so far</p>
        <p className="text-2xl font-black text-slate-800">{score1} <span className="text-sm font-semibold text-slate-500">/ 5</span></p>
      </div>
    </div>
  );
};

// ── Step 10: Diet Part 2 (5 items) ───────────────────────────────────────────

const Step10 = ({ profile, handleChange }: StepProps) => {
  const totalScore = [
    profile.dietFruit, profile.dietVeg, profile.dietWholeGrains, profile.dietFish, profile.dietDairy,
    profile.dietOil, profile.dietRefinedGrains, profile.dietProcessedMeat, profile.dietRedMeat, profile.dietSugar,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Diet — Part 2</h2>
        <p className="text-slate-500 text-sm">
          Tick each statement that describes your usual eating habits.
        </p>
      </div>

      <div className="space-y-2.5">
        <CheckCard
          label="Use plant-based oil at least twice a day"
          sublabel="e.g. olive oil, rapeseed oil — for cooking or dressing"
          checked={profile.dietOil}
          onToggle={() => handleChange('dietOil', !profile.dietOil)}
        />
        <CheckCard
          label="Limit refined grains to 2 or fewer servings a day"
          sublabel="White bread, white rice, white pasta, pastries"
          checked={profile.dietRefinedGrains}
          onToggle={() => handleChange('dietRefinedGrains', !profile.dietRefinedGrains)}
        />
        <CheckCard
          label="Eat processed meat once a week or less"
          sublabel="Bacon, sausages, ham, salami, hot dogs"
          checked={profile.dietProcessedMeat}
          onToggle={() => handleChange('dietProcessedMeat', !profile.dietProcessedMeat)}
        />
        <CheckCard
          label="Eat red meat twice a week or less"
          sublabel="Beef, lamb, pork, veal"
          checked={profile.dietRedMeat}
          onToggle={() => handleChange('dietRedMeat', !profile.dietRedMeat)}
        />
        <CheckCard
          label="Avoid sugar-sweetened drinks"
          sublabel="Sodas, energy drinks, sweetened juices — not diet versions"
          checked={profile.dietSugar}
          onToggle={() => handleChange('dietSugar', !profile.dietSugar)}
        />
      </div>

      {/* Total score */}
      <div className="mt-2 p-4 rounded-xl border-2 bg-slate-50 border-slate-200 text-center">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total diet score</p>
        <p className="text-4xl font-black text-slate-800">
          {totalScore} <span className="text-lg font-semibold text-slate-500">/ 10</span>
        </p>
        <p className={`text-xs font-semibold mt-1 ${totalScore >= 5 ? 'text-teal-600' : 'text-slate-400'}`}>
          {totalScore >= 7 ? 'Excellent dietary habits' : totalScore >= 5 ? 'Good dietary habits' : 'Room for dietary improvement'}
        </p>
      </div>
    </div>
  );
};

// ── Main InputForm ────────────────────────────────────────────────────────────

const TOTAL_STEPS = 10;

const DIET_FIELDS: (keyof UserProfile)[] = [
  'dietFruit', 'dietVeg', 'dietWholeGrains', 'dietFish', 'dietDairy',
  'dietOil', 'dietRefinedGrains', 'dietProcessedMeat', 'dietRedMeat', 'dietSugar',
];

function computeDietScore(p: UserProfile): number {
  return DIET_FIELDS.filter(f => p[f]).length;
}

export const InputForm: React.FC<InputFormProps> = ({
  onCalculate,
  onProfileChange,
  isCompleted = false,
}) => {
  const [step, setStep]       = useState(1);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  // Imperial inputs — local only, synced to metric profile
  const [heightFeet,   setHeightFeetRaw]   = useState(5);
  const [heightInches, setHeightInchesRaw] = useState(9);
  const [weightLbs,    setWeightLbsRaw]    = useState(176);

  // Sync imperial → metric → BMI
  const syncMetric = (ft: number, inches: number, lbs: number) => {
    const totalInches = ft * 12 + inches;
    const cm  = totalInches * 2.54;
    const kg  = lbs * 0.453592;
    const bmi = parseFloat((kg / ((cm / 100) ** 2)).toFixed(1));
    setProfile(p => {
      const updated = { ...p, heightCm: parseFloat(cm.toFixed(1)), weightKg: parseFloat(kg.toFixed(1)), bmi };
      if (isCompleted) onProfileChange?.({ ...updated, dietQuality: computeDietScore(updated) });
      return updated;
    });
  };

  const setHeightFeet   = (v: number) => { setHeightFeetRaw(v);   syncMetric(v, heightInches, weightLbs); };
  const setHeightInches = (v: number) => { setHeightInchesRaw(v); syncMetric(heightFeet, v, weightLbs); };
  const setWeightLbs    = (v: number) => { setWeightLbsRaw(v);    syncMetric(heightFeet, heightInches, v); };

  // Init metric from defaults on mount
  useEffect(() => { syncMetric(heightFeet, heightInches, weightLbs); }, []); // eslint-disable-line

  // Central field updater — triggers live recalc after completion
  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile(p => {
      const updated = { ...p, [field]: value };
      if (isCompleted) onProfileChange?.({ ...updated, dietQuality: computeDietScore(updated) });
      return updated;
    });
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      onCalculate({ ...profile, dietQuality: computeDietScore(profile) });
    }
  };

  const handleBack = () => { if (step > 1) setStep(s => s - 1); };

  const renderStep = () => {
    switch (step) {
      case 1:  return <Step1 profile={profile} handleChange={handleChange} />;
      case 2:  return (
        <Step2
          profile={profile} handleChange={handleChange}
          heightFeet={heightFeet} setHeightFeet={setHeightFeet}
          heightInches={heightInches} setHeightInches={setHeightInches}
          weightLbs={weightLbs} setWeightLbs={setWeightLbs}
        />
      );
      case 3:  return <Step3 profile={profile} handleChange={handleChange} />;
      case 4:  return <Step4 profile={profile} handleChange={handleChange} />;
      case 5:  return <Step5 profile={profile} handleChange={handleChange} />;
      case 6:  return <Step6 profile={profile} handleChange={handleChange} />;
      case 7:  return <Step7 profile={profile} handleChange={handleChange} />;
      case 8:  return <Step8 profile={profile} handleChange={handleChange} />;
      case 9:  return <Step9 profile={profile} handleChange={handleChange} />;
      case 10: return <Step10 profile={profile} handleChange={handleChange} />;
      default: return null;
    }
  };

  return (
    <div className="w-full">
      <ProgressBar
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        allCompleted={isCompleted}
        onStepClick={isCompleted ? setStep : undefined}
      />

      {/* Step content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7 mb-6 min-h-[380px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-600 font-semibold hover:border-slate-300 hover:shadow-sm transition-all duration-200"
          >
            <ChevronLeft size={18} /> Back
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold text-base px-6 py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 transition-all duration-200 active:scale-95"
        >
          {isCompleted ? (
            <>Next <ChevronRight size={18} /></>
          ) : step < TOTAL_STEPS ? (
            <>Next <ChevronRight size={18} /></>
          ) : (
            <>Calculate My Risk <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
};
