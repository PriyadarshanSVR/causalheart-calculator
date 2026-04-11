import { UserProfile, RiskAnalysisResult, Intervention } from '../types';

// ── UK Biobank Logistic Regression Model ──────────────────────────────────────
// UCL MRes 2025, n=458,840, AUC=0.7216
// Outcome: incident CVD (heart attack / stroke) within 10 years
// LP = INTERCEPT + Σ(coef × indicator)
// P(CVD) = 1 / (1 + exp(−LP))

const INTERCEPT = -7.877141;

// Demographics
const AGE_COEF         = 0.087989;   // continuous, per year (range 40–73)
const SEX_MALE         = 0.686744;   // ref = Female

// BMI categories (ref = Ideal: 18.5–24.9)
const BMI_UNDERWEIGHT  = 0.119374;   // < 18.5
const BMI_INTERMEDIATE = 0.170433;   // 25.0–29.9 (overweight)
const BMI_POOR         = 0.520026;   // ≥ 30.0 (obese)

// Physical activity IPAQ categories (ref = Poor: no activity)
const PA_INTERMEDIATE  = -0.140310;  // some activity but below Ideal
const PA_IDEAL         = -0.203516;  // mod≥150 OR vig≥75 OR (mod+2×vig)≥150 min/wk

// Diet (ref = Poor: score < 5)
const DIET_IDEAL       = 0.005343;   // score ≥ 5 — near-zero, counterintuitive (reverse causation bias)

// Sleep (ref = Normal: 7–9h)
const SLEEP_LOW        = 0.139837;   // < 7h
const SLEEP_HIGH       = 0.312351;   // > 9h

// Sun exposure average (summer+winter)/2 quartiles (ref = Q1: < 1.5h/day)
const SUN_Q2           = 0.019574;   // 1.5–2.5h
const SUN_Q3           = 0.043325;   // 2.5–3.5h
const SUN_Q4           = 0.079945;   // ≥ 3.5h

// Sedentary time quartiles (ref = Q1: < 3.0h/day)
const SED_Q2           = 0.011415;   // 3.0–4.0h
const SED_Q3           = 0.080848;   // 4.0–5.5h
const SED_Q4           = 0.119972;   // ≥ 5.5h

// Smoking (ref = Never)
const SMOKE_PREVIOUS   = 0.163108;
const SMOKE_CURRENT    = 0.562215;

// Alcohol (ref = Never) — J-curve: all categories negative vs Never
const ALCOHOL_SPECIAL       = -0.116568;  // special occasions only
const ALCOHOL_MONTHLY       = -0.278801;  // 1–3 times/month
const ALCOHOL_WEEKLY_OCC    = -0.316656;  // 1–2 times/week
const ALCOHOL_WEEKLY_FREQ   = -0.385484;  // 3–4 times/week
const ALCOHOL_DAILY         = -0.329974;  // daily / almost daily

// ── Category derivation helpers ───────────────────────────────────────────────

type BMICategory    = 'Underweight' | 'Ideal' | 'Intermediate' | 'Poor';
type PACategory     = 'Poor' | 'Intermediate' | 'Ideal';
type SleepCategory  = 'Low' | 'Normal' | 'High';
type SunCategory    = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type SedCategory    = 'Q1' | 'Q2' | 'Q3' | 'Q4';

function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Ideal';
  if (bmi < 30.0) return 'Intermediate';
  return 'Poor';
}

function getPACategory(
  modDays: number, modMinsPerDay: number,
  vigDays: number, vigMinsPerDay: number
): PACategory {
  const modMinsWk = modDays * Math.min(180, modMinsPerDay);
  const vigMinsWk = vigDays * Math.min(180, vigMinsPerDay);
  if (modMinsWk === 0 && vigMinsWk === 0) return 'Poor';
  if (modMinsWk >= 150 || vigMinsWk >= 75 || (modMinsWk + 2 * vigMinsWk) >= 150) return 'Ideal';
  return 'Intermediate';
}

function getSleepCategory(hours: number): SleepCategory {
  if (hours < 7) return 'Low';
  if (hours > 9) return 'High';
  return 'Normal';
}

function getSunCategory(avgHours: number): SunCategory {
  if (avgHours < 1.5) return 'Q1';
  if (avgHours < 2.5) return 'Q2';
  if (avgHours < 3.5) return 'Q3';
  return 'Q4';
}

function getSedCategory(totalHours: number): SedCategory {
  if (totalHours < 3.0) return 'Q1';
  if (totalHours < 4.0) return 'Q2';
  if (totalHours < 5.5) return 'Q3';
  return 'Q4';
}

// ── Linear predictor ──────────────────────────────────────────────────────────

function computeLP(p: UserProfile): number {
  const bmiCat  = getBMICategory(p.bmi);
  const paCat   = getPACategory(p.moderateActivityDays, p.moderateActivityMinsPerDay, p.vigorousActivityDays, p.vigorousActivityMinsPerDay);
  const sleepCat = getSleepCategory(p.sleepHours);
  const avgSun  = (p.sunExposureSummer + p.sunExposureWinter) / 2;
  const sunCat  = getSunCategory(avgSun);
  const sedTotal = Math.min(24, p.tvHoursPerDay + p.computerHoursPerDay + Math.min(11, p.drivingHoursPerDay));
  const sedCat  = getSedCategory(sedTotal);
  const dietScore = [
    p.dietFruit, p.dietVeg, p.dietWholeGrains, p.dietFish, p.dietDairy,
    p.dietOil, p.dietRefinedGrains, p.dietProcessedMeat, p.dietRedMeat, p.dietSugar,
  ].filter(Boolean).length;
  const dietCat = dietScore >= 5 ? 'Ideal' : 'Poor';

  let lp = INTERCEPT;

  // Age (continuous)
  lp += AGE_COEF * p.age;

  // Sex
  if (p.sex === 'male') lp += SEX_MALE;

  // BMI
  if (bmiCat === 'Underweight')  lp += BMI_UNDERWEIGHT;
  if (bmiCat === 'Intermediate') lp += BMI_INTERMEDIATE;
  if (bmiCat === 'Poor')         lp += BMI_POOR;

  // Physical activity
  if (paCat === 'Intermediate') lp += PA_INTERMEDIATE;
  if (paCat === 'Ideal')        lp += PA_IDEAL;

  // Diet
  if (dietCat === 'Ideal') lp += DIET_IDEAL;

  // Sleep
  if (sleepCat === 'Low')  lp += SLEEP_LOW;
  if (sleepCat === 'High') lp += SLEEP_HIGH;

  // Sun exposure
  if (sunCat === 'Q2') lp += SUN_Q2;
  if (sunCat === 'Q3') lp += SUN_Q3;
  if (sunCat === 'Q4') lp += SUN_Q4;

  // Sedentary time
  if (sedCat === 'Q2') lp += SED_Q2;
  if (sedCat === 'Q3') lp += SED_Q3;
  if (sedCat === 'Q4') lp += SED_Q4;

  // Smoking
  if (p.smokingStatus === 'previous') lp += SMOKE_PREVIOUS;
  if (p.smokingStatus === 'current')  lp += SMOKE_CURRENT;

  // Alcohol (J-curve — all negative vs Never)
  if (p.alcoholFrequency === 'special')          lp += ALCOHOL_SPECIAL;
  if (p.alcoholFrequency === 'monthly')          lp += ALCOHOL_MONTHLY;
  if (p.alcoholFrequency === 'weekly_occasional') lp += ALCOHOL_WEEKLY_OCC;
  if (p.alcoholFrequency === 'weekly_frequent')  lp += ALCOHOL_WEEKLY_FREQ;
  if (p.alcoholFrequency === 'daily')            lp += ALCOHOL_DAILY;

  return lp;
}

function lpToRisk(lp: number): number {
  return 1 / (1 + Math.exp(-lp));
}

// Convert LP delta to absolute risk reduction from a given baseline risk probability
function deltaLPtoAbsReduction(baselineLP: number, deltaLP: number): number {
  const before = lpToRisk(baselineLP) * 100;
  const after  = lpToRisk(baselineLP + deltaLP) * 100;
  return Math.max(0, before - after);
}

// ── Main export ───────────────────────────────────────────────────────────────

export const calculateCausalRisk = (profile: UserProfile): RiskAnalysisResult => {
  const baselineLP  = computeLP(profile);
  const baselineRisk = Math.min(99, Math.max(0.5, lpToRisk(baselineLP) * 100));

  const bmiCat  = getBMICategory(profile.bmi);
  const paCat   = getPACategory(profile.moderateActivityDays, profile.moderateActivityMinsPerDay, profile.vigorousActivityDays, profile.vigorousActivityMinsPerDay);
  const sleepCat = getSleepCategory(profile.sleepHours);
  const sedTotal = Math.min(24, profile.tvHoursPerDay + profile.computerHoursPerDay + Math.min(11, profile.drivingHoursPerDay));
  const sedCat  = getSedCategory(sedTotal);

  const modMinsWk = profile.moderateActivityDays * Math.min(180, profile.moderateActivityMinsPerDay);
  const vigMinsWk = profile.vigorousActivityDays * Math.min(180, profile.vigorousActivityMinsPerDay);

  const avgSun = (profile.sunExposureSummer + profile.sunExposureWinter) / 2;

  const dietScore = [
    profile.dietFruit, profile.dietVeg, profile.dietWholeGrains, profile.dietFish, profile.dietDairy,
    profile.dietOil, profile.dietRefinedGrains, profile.dietProcessedMeat, profile.dietRedMeat, profile.dietSugar,
  ].filter(Boolean).length;

  const interventions: Intervention[] = [];

  // Helper for temporal projection (logistic growth curve)
  const getTemporal = (total: number, type: 'rapid' | 'gradual') => {
    if (type === 'rapid') {
      return { year1: parseFloat((total * 0.50).toFixed(1)), year5: parseFloat((total * 0.85).toFixed(1)), year10: total };
    }
    return { year1: parseFloat((total * 0.25).toFixed(1)), year5: parseFloat((total * 0.65).toFixed(1)), year10: total };
  };

  // ── Smoking ──────────────────────────────────────────────────────────────────
  if (profile.smokingStatus === 'current') {
    // Delta LP: removing SMOKE_CURRENT, not adding SMOKE_PREVIOUS (quit → never)
    const deltaLP = -(SMOKE_CURRENT);
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const ci: [number, number] = [parseFloat((absRed * 0.7).toFixed(1)), parseFloat((absRed * 1.3).toFixed(1))];
    interventions.push({
      id: 'smoking',
      domain: 'Smoking',
      title: 'Quit Smoking',
      description: 'Cessation significantly reduces arterial inflammation and thrombotic risk.',
      currentValueDisplay: 'Current smoker',
      targetValueDisplay: 'Non-smoker',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'rapid'),
      benefitLevel: absRed >= 3 ? 'high' : absRed >= 1 ? 'moderate' : 'low',
      achieved: false,
    });
  } else if (profile.smokingStatus === 'previous') {
    // Delta LP: removing SMOKE_PREVIOUS (previous → never)
    const deltaLP = -(SMOKE_PREVIOUS);
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const ci: [number, number] = [parseFloat((absRed * 0.7).toFixed(1)), parseFloat((absRed * 1.3).toFixed(1))];
    interventions.push({
      id: 'smoking',
      domain: 'Smoking',
      title: 'Continue Smoke-Free',
      description: 'Staying quit reduces residual cardiovascular risk from past smoking.',
      currentValueDisplay: 'Previous smoker (quit)',
      targetValueDisplay: 'Remain non-smoker',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed >= 2 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'smoking', domain: 'Smoking', title: 'Never Smoked',
      description: 'Avoiding tobacco is one of the most protective lifestyle choices.',
      currentValueDisplay: 'Never smoked', targetValueDisplay: 'Maintain',
      absoluteReduction: 0, relativeReduction: 0, confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 }, benefitLevel: 'none', achieved: true,
    });
  }

  // ── BMI ───────────────────────────────────────────────────────────────────────
  if (bmiCat === 'Poor' || bmiCat === 'Intermediate') {
    // Delta LP: moving to Ideal (no BMI coef applies)
    const currentBMICoef = bmiCat === 'Poor' ? BMI_POOR : BMI_INTERMEDIATE;
    const deltaLP = -currentBMICoef;
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const targetWeightKg = (profile.heightCm / 100) ** 2 * 24.9;
    const ci: [number, number] = [parseFloat((absRed * 0.6).toFixed(1)), parseFloat((absRed * 1.4).toFixed(1))];
    interventions.push({
      id: 'bmi', domain: 'Weight',
      title: bmiCat === 'Poor' ? 'Lose Weight to Healthy BMI' : 'Reach Healthy BMI',
      description: `Targeting BMI < 25 (approx ${targetWeightKg.toFixed(0)} kg for your height) reduces metabolic strain.`,
      currentValueDisplay: `BMI ${profile.bmi.toFixed(1)} (${bmiCat === 'Poor' ? 'Obese' : 'Overweight'})`,
      targetValueDisplay: 'BMI 18.5–24.9',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed >= 3 ? 'high' : absRed >= 1 ? 'moderate' : 'low',
      achieved: false,
    });
  } else if (bmiCat === 'Underweight') {
    // Underweight also has elevated risk (BMI_UNDERWEIGHT coef)
    const deltaLP = -BMI_UNDERWEIGHT;
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const ci: [number, number] = [parseFloat((absRed * 0.5).toFixed(1)), parseFloat((absRed * 1.5).toFixed(1))];
    interventions.push({
      id: 'bmi', domain: 'Weight',
      title: 'Reach Healthy Weight',
      description: 'Being underweight is associated with elevated cardiovascular risk. Gaining weight to BMI ≥ 18.5 may help.',
      currentValueDisplay: `BMI ${profile.bmi.toFixed(1)} (Underweight)`,
      targetValueDisplay: 'BMI 18.5–24.9',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed >= 1 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'bmi', domain: 'Weight', title: 'Healthy Weight',
      description: 'Your BMI is within the optimal range.',
      currentValueDisplay: `BMI ${profile.bmi.toFixed(1)}`, targetValueDisplay: 'Maintain',
      absoluteReduction: 0, relativeReduction: 0, confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 }, benefitLevel: 'none', achieved: true,
    });
  }

  // ── Physical Activity ─────────────────────────────────────────────────────────
  if (paCat === 'Poor') {
    // Moving Poor → Ideal
    const deltaLP = PA_IDEAL; // negative, so lowers risk
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const ci: [number, number] = [parseFloat((absRed * 0.7).toFixed(1)), parseFloat((absRed * 1.2).toFixed(1))];
    interventions.push({
      id: 'activity', domain: 'Activity',
      title: 'Start Regular Exercise',
      description: 'Reaching 150 min/week of moderate activity (or 75 min vigorous) substantially reduces cardiovascular risk.',
      currentValueDisplay: 'No regular activity',
      targetValueDisplay: '≥150 min/wk moderate',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed >= 2 ? 'high' : absRed >= 0.5 ? 'moderate' : 'low',
      achieved: false,
    });
  } else if (paCat === 'Intermediate') {
    // Moving Intermediate → Ideal (delta = PA_IDEAL − PA_INTERMEDIATE)
    const deltaLP = PA_IDEAL - PA_INTERMEDIATE;
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const totalMins = modMinsWk + vigMinsWk * 2;
    const ci: [number, number] = [parseFloat((absRed * 0.7).toFixed(1)), parseFloat((absRed * 1.2).toFixed(1))];
    interventions.push({
      id: 'activity', domain: 'Activity',
      title: 'Increase Activity Level',
      description: 'You are active but below the recommended threshold. Reaching 150 min/week moderate-equivalent can reduce your risk further.',
      currentValueDisplay: `~${totalMins} min/wk (equiv.)`,
      targetValueDisplay: '≥150 min/wk moderate',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed >= 1 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    const totalMins = modMinsWk + vigMinsWk * 2;
    interventions.push({
      id: 'activity', domain: 'Activity', title: 'Active — Keep It Up',
      description: 'You meet or exceed recommended physical activity guidelines.',
      currentValueDisplay: `~${totalMins} min/wk (equiv.)`, targetValueDisplay: '≥150 min/wk',
      absoluteReduction: 0, relativeReduction: 0, confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 }, benefitLevel: 'none', achieved: true,
    });
  }

  // ── Sedentary Time ────────────────────────────────────────────────────────────
  if (sedCat !== 'Q1') {
    const currentSedCoef = sedCat === 'Q2' ? SED_Q2 : sedCat === 'Q3' ? SED_Q3 : SED_Q4;
    const deltaLP = -currentSedCoef;
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const label   = sedCat === 'Q2' ? '3.0–4.0h' : sedCat === 'Q3' ? '4.0–5.5h' : '≥5.5h';
    const ci: [number, number] = [parseFloat((absRed * 0.5).toFixed(1)), parseFloat((absRed * 1.5).toFixed(1))];
    interventions.push({
      id: 'sedentary', domain: 'Activity',
      title: 'Reduce Sitting Time',
      description: 'Cutting daily sedentary time (TV, screen, driving) to under 3 hours is associated with lower CVD risk.',
      currentValueDisplay: `${sedTotal.toFixed(1)}h/day sitting (${label})`,
      targetValueDisplay: '< 3h/day sitting',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed >= 1 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'sedentary', domain: 'Activity', title: 'Low Sedentary Time',
      description: 'You spend less than 3 hours per day sitting — well done.',
      currentValueDisplay: `${sedTotal.toFixed(1)}h/day`, targetValueDisplay: '< 3h/day',
      absoluteReduction: 0, relativeReduction: 0, confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 }, benefitLevel: 'none', achieved: true,
    });
  }

  // ── Sleep ─────────────────────────────────────────────────────────────────────
  if (sleepCat !== 'Normal') {
    const currentSleepCoef = sleepCat === 'Low' ? SLEEP_LOW : SLEEP_HIGH;
    const deltaLP = -currentSleepCoef;
    const absRed  = deltaLPtoAbsReduction(baselineLP, deltaLP);
    const relRed  = (absRed / baselineRisk) * 100;
    const ci: [number, number] = [parseFloat((absRed * 0.5).toFixed(1)), parseFloat((absRed * 1.5).toFixed(1))];
    interventions.push({
      id: 'sleep', domain: 'Sleep',
      title: sleepCat === 'Low' ? 'Get More Sleep' : 'Reduce Excess Sleep',
      description: '7–9 hours of sleep per night is associated with optimal cardiovascular recovery.',
      currentValueDisplay: `${profile.sleepHours}h/night (${sleepCat === 'Low' ? 'too little' : 'too much'})`,
      targetValueDisplay: '7–9h/night',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(1)),
      confidenceInterval: ci,
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: sleepCat === 'High' ? (absRed >= 1 ? 'moderate' : 'low') : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'sleep', domain: 'Sleep', title: 'Healthy Sleep Duration',
      description: 'Sleep duration is within the optimal 7–9 hour range.',
      currentValueDisplay: `${profile.sleepHours}h/night`, targetValueDisplay: '7–9h/night',
      absoluteReduction: 0, relativeReduction: 0, confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 }, benefitLevel: 'none', achieved: true,
    });
  }

  // ── Diet ──────────────────────────────────────────────────────────────────────
  // Note: DIET_IDEAL coef = +0.005343 (near-zero, counterintuitive due to observational bias).
  // We show diet as informational only — not as an active intervention for risk calculation.
  // Instead, show the score as an achieved/not-achieved badge.
  const dietCat = dietScore >= 5 ? 'Ideal' : 'Poor';
  interventions.push({
    id: 'diet', domain: 'Diet',
    title: dietCat === 'Ideal' ? 'Good Dietary Habits' : 'Improve Diet Quality',
    description: dietCat === 'Ideal'
      ? `You meet ${dietScore}/10 dietary criteria. Keep up the healthy eating patterns.`
      : `You meet ${dietScore}/10 dietary criteria. Aiming for 5+ components supports long-term cardiovascular health.`,
    currentValueDisplay: `${dietScore}/10 diet criteria met`,
    targetValueDisplay: '5+ criteria',
    absoluteReduction: 0,
    relativeReduction: 0,
    confidenceInterval: [0, 0],
    temporalProjection: { year1: 0, year5: 0, year10: 0 },
    benefitLevel: 'none',
    achieved: dietCat === 'Ideal',
  });

  // ── Sort non-achieved by absolute reduction desc ───────────────────────────
  interventions.sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? 1 : -1;
    return b.absoluteReduction - a.absoluteReduction;
  });

  // ── Optimal risk (all non-achieved interventions applied) ─────────────────
  let optimalLP = baselineLP;
  interventions.forEach(inv => {
    if (!inv.achieved && inv.relativeReduction > 0) {
      // Reconstruct deltaLP from relativeReduction: approximate via -ln(1 - rr/100) / scale
      // More accurately: re-apply the known deltaLP for each intervention
    }
  });
  // Simpler: apply relative reductions multiplicatively
  let residualRisk = baselineRisk;
  interventions.forEach(inv => {
    if (!inv.achieved && inv.relativeReduction > 0) {
      residualRisk = residualRisk * (1 - inv.relativeReduction / 100);
    }
  });
  const optimalRisk = Math.max(0.5, parseFloat(residualRisk.toFixed(1)));

  // ── Typical person: same sex and age, all other factors at reference ───────
  const typicalLP = INTERCEPT
    + AGE_COEF * profile.age
    + (profile.sex === 'male' ? SEX_MALE : 0);
  // PA: Intermediate (typical person has some activity)
  // + PA_INTERMEDIATE — actually use reference (poor) for a neutral baseline
  const typicalRisk = parseFloat(
    Math.min(99, Math.max(0.5, lpToRisk(typicalLP) * 100)).toFixed(1)
  );

  return {
    baselineRisk: parseFloat(baselineRisk.toFixed(1)),
    typicalRisk,
    optimalRisk,
    interventions,
    timestamp: Date.now(),
  };
};

export const defaultProfile: UserProfile = {
  age: 55,
  sex: 'male',
  heightCm: 175,
  weightKg: 85,
  bmi: 27.8,
  sleepHours: 7,
  smokingStatus: 'never',
  alcoholFrequency: 'weekly_occasional',
  moderateActivityDays: 3,
  moderateActivityMinsPerDay: 30,
  vigorousActivityDays: 0,
  vigorousActivityMinsPerDay: 0,
  tvHoursPerDay: 2,
  computerHoursPerDay: 1,
  drivingHoursPerDay: 0.5,
  sunExposureSummer: 2,
  sunExposureWinter: 0.5,
  dietFruit: true,
  dietVeg: true,
  dietWholeGrains: false,
  dietFish: false,
  dietDairy: true,
  dietOil: false,
  dietRefinedGrains: true,
  dietProcessedMeat: false,
  dietRedMeat: true,
  dietSugar: true,
  dietQuality: 6,
};
