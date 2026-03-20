import React, { useState, useEffect } from 'react';
import { UserProfile, AlcoholFrequency, FoodFrequency, MilkType, SpreadType, SaltUsage } from '../types';
import { defaultProfile } from '../services/causalEngine';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface InputFormProps {
  onCalculate: (profile: UserProfile) => void;
}

// ── Shared sub-component types ────────────────────────────────────────────────

interface StepProps {
  profile: UserProfile;
  handleChange: (field: keyof UserProfile, value: any) => void;
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const pct = Math.round(((currentStep - 1) / totalSteps) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Question {currentStep} of {totalSteps}
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

      {/* Step dots */}
      <div className="flex justify-between gap-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div
              key={step}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                isCompleted
                  ? 'bg-teal-500'
                  : isCurrent
                  ? 'bg-blue-600 scale-y-125'
                  : 'bg-slate-200'
              }`}
            />
          );
        })}
      </div>
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

// ── FrequencyDropdown ─────────────────────────────────────────────────────────

const FREQ_OPTIONS: { value: FoodFrequency; label: string }[] = [
  { value: 'never',     label: 'Never' },
  { value: 'rarely',    label: 'Rarely (<1×/wk)' },
  { value: 'sometimes', label: 'Sometimes (1–2×/wk)' },
  { value: 'often',     label: 'Often (3–4×/wk)' },
  { value: 'daily',     label: 'Daily' },
];

const FrequencyDropdown = ({
  label,
  value,
  onChange,
  sublabel,
}: {
  label: string;
  value: FoodFrequency;
  onChange: (val: FoodFrequency) => void;
  sublabel?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    {sublabel && <p className="text-xs text-slate-400 -mt-0.5">{sublabel}</p>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FoodFrequency)}
      className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white text-slate-800 text-sm focus:border-blue-500 focus:outline-none transition-colors"
    >
      {FREQ_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);


// ── Step 1: Sex + Age ─────────────────────────────────────────────────────────

const Step1 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">About you</h2>
      <p className="text-slate-500 text-sm">Tell us your biological sex to calibrate the risk model.</p>
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

// ── Step 4: Nicotine ──────────────────────────────────────────────────────────

const Step4 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Nicotine use</h2>
      <p className="text-slate-500 text-sm">
        Includes cigarettes, e-cigarettes, cigars, vapes, or nicotine pouches.
      </p>
    </div>

    <div className="space-y-3">
      <OptionCard
        icon="🚬"
        label="Current user"
        sublabel="I currently use a nicotine product"
        selected={profile.smokingStatus === 'current'}
        onClick={() => handleChange('smokingStatus', 'current')}
      />
      <OptionCard
        icon="🕐"
        label="Former user"
        sublabel="I used to use nicotine but have quit"
        selected={profile.smokingStatus === 'former'}
        onClick={() => handleChange('smokingStatus', 'former')}
      />
      <OptionCard
        icon="✅"
        label="Never used"
        sublabel="I have never regularly used nicotine"
        selected={profile.smokingStatus === 'never'}
        onClick={() => handleChange('smokingStatus', 'never')}
      />
    </div>

    {/* Conditional: years quit */}
    {profile.smokingStatus === 'former' && (
      <div className="mt-2 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-center transition-all duration-300">
        <NumericStepper
          label="Years since quitting"
          hint="How long ago did you quit?"
          value={profile.smokingYearsQuit}
          onChange={(v) => handleChange('smokingYearsQuit', v)}
          min={0} max={50}
          unit="yrs"
        />
      </div>
    )}
  </div>
);

// ── Step 5: Alcohol ───────────────────────────────────────────────────────────

const ALCOHOL_OPTIONS: { value: AlcoholFrequency; icon: string; label: string; sublabel: string }[] = [
  { value: 'daily',             icon: '🍺', label: 'Daily or almost daily',       sublabel: '~14 drinks/week' },
  { value: 'weekly_frequent',   icon: '🍷', label: 'Three or four times a week',  sublabel: '~4 drinks/week' },
  { value: 'weekly_occasional', icon: '🥂', label: 'Once or twice a week',        sublabel: '~1–2 drinks/week' },
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
  const totalMins = profile.moderateActivityMins + profile.vigorousActivityMins * 2;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Physical Activity</h2>
        <p className="text-slate-500 text-sm">How much do you exercise per week on average?</p>
      </div>

      {/* Moderate */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚶</span>
          <div>
            <p className="font-bold text-slate-800">Moderate activity</p>
            <p className="text-xs text-slate-400">Brisk walking, casual cycling, light swimming</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0} max={2000} step={10}
            value={profile.moderateActivityMins}
            onChange={(e) => handleChange('moderateActivityMins', Math.min(2000, Math.max(0, Number(e.target.value))))}
            className="w-28 text-center text-2xl font-black border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none text-slate-900"
          />
          <span className="text-slate-500 font-medium">minutes / week</span>
        </div>
      </div>

      {/* Vigorous */}
      <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏃</span>
          <div>
            <p className="font-bold text-slate-800">Vigorous activity</p>
            <p className="text-xs text-slate-400">Running, competitive sport, laps swimming</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0} max={2000} step={10}
            value={profile.vigorousActivityMins}
            onChange={(e) => handleChange('vigorousActivityMins', Math.min(2000, Math.max(0, Number(e.target.value))))}
            className="w-28 text-center text-2xl font-black border-2 border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none text-slate-900"
          />
          <span className="text-slate-500 font-medium">minutes / week</span>
        </div>
        <p className="text-xs text-blue-600 font-semibold">⚡ Vigorous minutes count double toward your total</p>
      </div>

      {/* Live total */}
      <div className="flex items-center p-4 rounded-2xl border-2 bg-slate-50 border-slate-200">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total equivalent</p>
          <p className="text-3xl font-black text-slate-800">{totalMins} <span className="text-base font-semibold">min/wk</span></p>
        </div>
      </div>
    </div>
  );
};

// ── Step 7: Sun Exposure ──────────────────────────────────────────────────────

const Step7 = ({ profile, handleChange }: StepProps) => {
  const avg = (profile.sunExposureSummer + profile.sunExposureWinter) / 2;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Sun Exposure</h2>
        <p className="text-slate-500 text-sm">
          Outdoor sunlight supports vitamin D synthesis, linked to cardiovascular health.
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
      <div className="flex items-center p-4 rounded-2xl border-2 bg-slate-50 border-slate-200">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Annual average</p>
          <p className="text-3xl font-black text-slate-800">
            {avg.toFixed(1)} <span className="text-base font-semibold">hr/day</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Step 8: Fruits & Vegetables ───────────────────────────────────────────────

const Step8 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Fruits & Vegetables</h2>
      <p className="text-slate-500 text-sm">How much fruit and veg do you typically eat each day?</p>
    </div>

    {/* Vegetables panel */}
    <div className="bg-green-50/60 border border-green-100 rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">🥦</span>
        <p className="text-xs font-black text-green-700 uppercase tracking-widest">Vegetables</p>
      </div>
      <p className="text-xs text-slate-400 -mt-3">A tablespoon is roughly a serving spoon's worth</p>
      <div className="grid grid-cols-2 gap-6">
        <NumericStepper
          label="Cooked vegetables"
          hint="Tablespoons per day"
          value={profile.cookedVegTablespoons}
          onChange={(v) => handleChange('cookedVegTablespoons', v)}
          min={0} max={20}
          unit="tbsp"
        />
        <NumericStepper
          label="Raw veg / salad"
          hint="Tablespoons per day"
          value={profile.rawVegTablespoons}
          onChange={(v) => handleChange('rawVegTablespoons', v)}
          min={0} max={20}
          unit="tbsp"
        />
      </div>
    </div>

    {/* Fruit panel */}
    <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-xl">🍎</span>
        <p className="text-xs font-black text-orange-700 uppercase tracking-widest">Fruit</p>
      </div>
      <p className="text-xs text-slate-400 -mt-3">e.g. 1 apple, 1 banana, or a handful of berries = 1 piece</p>
      <div className="grid grid-cols-2 gap-6">
        <NumericStepper
          label="Fresh fruit"
          hint="Pieces per day"
          value={profile.freshFruitPieces}
          onChange={(v) => handleChange('freshFruitPieces', v)}
          min={0} max={20}
          unit="pc"
        />
        <NumericStepper
          label="Dried fruit"
          hint="Portions per day"
          value={profile.driedFruitPieces}
          onChange={(v) => handleChange('driedFruitPieces', v)}
          min={0} max={10}
          unit="ptn"
        />
      </div>
    </div>
  </div>
);

// ── Step 9: Fish & Meat ────────────────────────────────────────────────────────

const Step9 = ({ profile, handleChange }: StepProps) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Fish & Meat</h2>
      <p className="text-slate-500 text-sm">How often do you eat fish, meat and processed meat products?</p>
    </div>

    {/* Fish panel */}
    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🐟</span>
        <p className="text-xs font-black text-blue-700 uppercase tracking-widest">Fish & Seafood</p>
      </div>
      <FrequencyDropdown
        label="Oily fish (salmon, mackerel, sardines, herring)"
        sublabel="Rich in omega-3 — aim for 2+ times per week"
        value={profile.oilyFishFreq}
        onChange={(v) => handleChange('oilyFishFreq', v)}
      />
      <FrequencyDropdown
        label="Other fish & seafood (white fish, prawns, tuna)"
        value={profile.otherFishFreq}
        onChange={(v) => handleChange('otherFishFreq', v)}
      />
    </div>

    {/* Poultry panel */}
    <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🍗</span>
        <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Poultry</p>
      </div>
      <FrequencyDropdown
        label="Chicken or turkey"
        sublabel="A healthier alternative to red meat"
        value={profile.poultryFreq}
        onChange={(v) => handleChange('poultryFreq', v)}
      />
    </div>

    {/* Red & processed meat panel */}
    <div className="bg-red-50/60 border border-red-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">🥩</span>
        <p className="text-xs font-black text-red-700 uppercase tracking-widest">Red & Processed Meat</p>
      </div>
      <FrequencyDropdown
        label="Processed meat (bacon, sausages, deli meats, hot dogs)"
        sublabel="⚠️ Linked to higher heart risk — limit where possible"
        value={profile.processedMeatFreq}
        onChange={(v) => handleChange('processedMeatFreq', v)}
      />
      <FrequencyDropdown
        label="Beef"
        value={profile.beefFreq}
        onChange={(v) => handleChange('beefFreq', v)}
      />
      <FrequencyDropdown
        label="Lamb"
        value={profile.lambFreq}
        onChange={(v) => handleChange('lambFreq', v)}
      />
      <FrequencyDropdown
        label="Pork"
        value={profile.porkFreq}
        onChange={(v) => handleChange('porkFreq', v)}
      />
    </div>
  </div>
);

// ── Step 10: Dairy, Cereals & Hydration ───────────────────────────────────────

const Step10 = ({ profile, handleChange }: StepProps) => {
  const MILK_OPTIONS: { value: MilkType; icon: string; label: string }[] = [
    { value: 'whole',   icon: '🥛', label: 'Whole milk' },
    { value: 'semi',    icon: '🥛', label: 'Semi-skimmed' },
    { value: 'skimmed', icon: '🥛', label: 'Skimmed milk' },
    { value: 'plant',   icon: '🌿', label: 'Plant-based' },
    { value: 'none',    icon: '🚫', label: 'I don\'t use milk' },
  ];

  const SPREAD_OPTIONS: { value: SpreadType; icon: string; label: string }[] = [
    { value: 'butter',    icon: '🧈', label: 'Butter' },
    { value: 'margarine', icon: '🟡', label: 'Margarine / low-fat spread' },
    { value: 'olive',     icon: '🫒', label: 'Olive oil spread' },
    { value: 'none',      icon: '🚫', label: 'I don\'t use spreads' },
  ];

  const SALT_OPTIONS: { value: SaltUsage; icon: string; label: string }[] = [
    { value: 'always',    icon: '🧂', label: 'Always add salt' },
    { value: 'usually',   icon: '🧂', label: 'Usually add salt' },
    { value: 'sometimes', icon: '🧂', label: 'Sometimes add salt' },
    { value: 'rarely',    icon: '✅', label: 'Rarely / never add salt' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Dairy, Cereals & Hydration</h2>
        <p className="text-slate-500 text-sm">Tell us about your dairy choices, cereal habits, salt use and water intake.</p>
      </div>

      {/* Milk panel */}
      <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🥛</span>
          <p className="text-xs font-black text-sky-700 uppercase tracking-widest">Milk</p>
        </div>
        <div className="space-y-2">
          {MILK_OPTIONS.map(opt => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={profile.milkType === opt.value}
              onClick={() => handleChange('milkType', opt.value as MilkType)}
            />
          ))}
        </div>
      </div>

      {/* Spreads panel */}
      <div className="bg-yellow-50/60 border border-yellow-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🧈</span>
          <p className="text-xs font-black text-yellow-700 uppercase tracking-widest">Spreads & Fats</p>
        </div>
        <div className="space-y-2">
          {SPREAD_OPTIONS.map(opt => (
            <OptionCard
              key={opt.value}
              icon={opt.icon}
              label={opt.label}
              selected={profile.spreadType === opt.value}
              onClick={() => handleChange('spreadType', opt.value as SpreadType)}
            />
          ))}
        </div>
      </div>

      {/* Cereals panel */}
      <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🥣</span>
          <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Cereals & Porridge</p>
        </div>
        <p className="text-xs text-slate-400 -mt-1">e.g. oats, muesli, wholegrain cereal</p>
        <div className="flex justify-center pt-2">
          <NumericStepper
            label="Bowls per week"
            value={profile.cerealBowlsPerWeek}
            onChange={(v) => handleChange('cerealBowlsPerWeek', v)}
            min={0} max={21}
            unit="bowls"
          />
        </div>
      </div>

      {/* Salt & Water panel */}
      <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">💧</span>
          <p className="text-xs font-black text-teal-700 uppercase tracking-widest">Salt & Water</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">How often do you add salt to your food?</p>
          <div className="space-y-2">
            {SALT_OPTIONS.map(opt => (
              <OptionCard
                key={opt.value}
                icon={opt.icon}
                label={opt.label}
                selected={profile.saltUsage === opt.value}
                onClick={() => handleChange('saltUsage', opt.value as SaltUsage)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <NumericStepper
            label="Water glasses per day"
            hint="250 ml per glass"
            value={profile.waterGlassesPerDay}
            onChange={(v) => handleChange('waterGlassesPerDay', v)}
            min={0} max={20}
            unit="glasses"
          />
        </div>
      </div>
    </div>
  );
};

// ── Main InputForm (wizard shell) ─────────────────────────────────────────────

export const InputForm: React.FC<InputFormProps> = ({ onCalculate }) => {
  const TOTAL_STEPS = 10;

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  // Imperial height/weight local state
  const [heightFeet, setHeightFeet] = useState(5);
  const [heightInches, setHeightInches] = useState(9);
  const [weightLbs, setWeightLbs] = useState(176);

  // Convert imperial → metric on change
  useEffect(() => {
    const totalInches = heightFeet * 12 + heightInches;
    const cm  = totalInches * 2.54;
    const kg  = weightLbs * 0.453592;
    const bmi = cm > 0 ? kg / Math.pow(cm / 100, 2) : 0;
    setProfile(prev => ({
      ...prev,
      heightCm: parseFloat(cm.toFixed(1)),
      weightKg: parseFloat(kg.toFixed(1)),
      bmi: parseFloat(bmi.toFixed(1)),
    }));
  }, [heightFeet, heightInches, weightLbs]);

  const handleChange = (field: keyof UserProfile, value: any) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const goNext = () => {
    setDirection('forward');
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(s => s + 1);
    } else {
      onCalculate(profile);
    }
  };

  const goBack = () => {
    setDirection('backward');
    setCurrentStep(s => Math.max(1, s - 1));
  };

  const renderStep = () => {
    const props: StepProps = { profile, handleChange };
    switch (currentStep) {
      case 1: return <Step1 {...props} />;
      case 2: return (
        <Step2
          {...props}
          heightFeet={heightFeet} setHeightFeet={setHeightFeet}
          heightInches={heightInches} setHeightInches={setHeightInches}
          weightLbs={weightLbs} setWeightLbs={setWeightLbs}
        />
      );
      case 3: return <Step3 {...props} />;
      case 4: return <Step4 {...props} />;
      case 5: return <Step5 {...props} />;
      case 6: return <Step6 {...props} />;
      case 7:  return <Step7  {...props} />;
      case 8:  return <Step8  {...props} />;
      case 9:  return <Step9  {...props} />;
      case 10: return <Step10 {...props} />;
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto pb-28">

      {/* Progress */}
      <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

      {/* Animated step content */}
      <div
        key={currentStep}
        className={direction === 'forward' ? 'step-enter-forward' : 'step-enter-backward'}
      >
        {renderStep()}
      </div>

      {/* Fixed navigation footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">

          {/* Back button */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1.5 px-5 py-3 rounded-full border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Next / Calculate */}
          <button
            type="button"
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-95 hover:shadow-xl text-sm"
          >
            {currentStep < TOTAL_STEPS ? (
              <>Next <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Calculate My Risk <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
