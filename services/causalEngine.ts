import { UserProfile, RiskAnalysisResult, Intervention, AlcoholFrequency, FoodFrequency } from '../types';

// Constants for simulation
const BASE_RISK_INTERCEPT = -1.2; // Recalibrated after removing age term
const SEX_MALE_BETA = 0.4;
const BMI_BETA = 0.08;
const SMOKING_BETA = 0.7;
const INACTIVE_BETA = 0.3;

// ── Helper functions ──────────────────────────────────────────────────────────

const freqToWeekly = (freq: FoodFrequency): number => {
  switch (freq) {
    case 'daily':     return 7;
    case 'often':     return 4;
    case 'sometimes': return 2;
    case 'rarely':    return 0.5;
    case 'never':     return 0;
  }
};

const alcoholFreqToDrinksPerWeek = (freq: AlcoholFrequency): number => {
  switch (freq) {
    case 'daily':             return 14;
    case 'weekly_frequent':   return 4;
    case 'weekly_occasional': return 1.5;
    case 'monthly':           return 0.5;
    case 'special':           return 0.1;
    case 'never':             return 0;
  }
};

/**
 * Calculates a 0-100 diet quality score based on a 0–9 point UK-style diet criteria.
 * Each criterion scores 1 point; total is normalised to 0–100.
 */
export const calculateDietScore = (p: UserProfile): number => {
  let score = 0;

  // 1. Vegetables: ≥4 tablespoons per day combined
  if ((p.cookedVegTablespoons + p.rawVegTablespoons) >= 4) score++;

  // 2. Fresh fruit: ≥2 pieces per day
  if (p.freshFruitPieces >= 2) score++;

  // 3. Dried/extra fruit: ≥1 dried portion OR ≥3 total fruit
  if (p.driedFruitPieces >= 1 || (p.freshFruitPieces + p.driedFruitPieces) >= 3) score++;

  // 4. Oily fish: ≥2 times per week
  if (freqToWeekly(p.oilyFishFreq) >= 2) score++;

  // 5. Processed meat: avoidance (never or rarely)
  if (p.processedMeatFreq === 'never' || p.processedMeatFreq === 'rarely') score++;

  // 6. Poultry preference over red meat
  if (
    freqToWeekly(p.poultryFreq) >= 2 &&
    freqToWeekly(p.beefFreq) <= 0.5 &&
    freqToWeekly(p.lambFreq) <= 0.5 &&
    freqToWeekly(p.porkFreq) <= 0.5
  ) score++;

  // 7. Healthier milk: skimmed or plant-based
  if (p.milkType === 'skimmed' || p.milkType === 'plant') score++;

  // 8. Healthier spread: olive oil or none
  if (p.spreadType === 'olive' || p.spreadType === 'none') score++;

  // 9. Salt restraint + adequate hydration
  if ((p.saltUsage === 'rarely' || p.saltUsage === 'sometimes') && p.waterGlassesPerDay >= 6) score++;

  return Math.round((score / 9) * 100);
};

/**
 * Simulates a Causal Forest prediction by calculating baseline risk
 * and then estimating heterogeneous treatment effects (CATE) for each domain.
 */
export const calculateCausalRisk = (profile: UserProfile): RiskAnalysisResult => {
  // 0. Update derived metrics
  const calculatedDietQuality = calculateDietScore(profile);
  const activeProfile = { ...profile, dietQuality: calculatedDietQuality };

  // ── 1. Derived values ──────────────────────────────────────────────────────
  // Vigorous activity counts double (equivalent to 2× moderate)
  const totalActivityMins = activeProfile.moderateActivityMins + (activeProfile.vigorousActivityMins * 2);
  const avgSunExposure = (activeProfile.sunExposureSummer + activeProfile.sunExposureWinter) / 2;
  const estimatedDrinksPerWeek = alcoholFreqToDrinksPerWeek(activeProfile.alcoholFrequency);

  // ── 2. Baseline Risk (logistic regression approximation) ───────────────────
  let logOdds = BASE_RISK_INTERCEPT;

  if (activeProfile.sex === 'male') logOdds += SEX_MALE_BETA;
  logOdds += (activeProfile.bmi - 22) * BMI_BETA;

  // Smoking — former penalty decays linearly with years quit
  if (activeProfile.smokingStatus === 'current') {
    logOdds += SMOKING_BETA;
  }
  if (activeProfile.smokingStatus === 'former') {
    const decayFactor = Math.max(0.05, 0.3 - activeProfile.smokingYearsQuit * 0.025);
    logOdds += SMOKING_BETA * decayFactor;
  }

  // Physical activity (inverse relationship — inactivity increases risk)
  if (totalActivityMins < 150) {
    logOdds += INACTIVE_BETA * ((150 - totalActivityMins) / 150);
  }

  // Diet (inverse — better diet reduces risk)
  logOdds -= (activeProfile.dietQuality - 50) * 0.01;

  // Sun exposure
  if (avgSunExposure >= 1) {
    logOdds -= 0.05;
  } else if (avgSunExposure < 0.5) {
    logOdds += 0.03;
  }

  // Heavy alcohol
  if (estimatedDrinksPerWeek > 14) {
    logOdds += (estimatedDrinksPerWeek - 14) * 0.02;
  }

  const riskProbability = 1 / (1 + Math.exp(-logOdds));
  const baselineRiskPercent = Math.min(99, Math.max(0.5, riskProbability * 100));

  // ── 3. Calculate Individual Treatment Effects (CATE) ──────────────────────
  const interventions: Intervention[] = [];

  // Helper for temporal projection
  const getTemporal = (total: number, type: 'rapid' | 'gradual') => {
    const t = total;
    if (type === 'rapid') {
      // Smoking cessation: ~50% in year 1, ~85% in year 5
      return {
        year1: parseFloat((t * 0.5).toFixed(1)),
        year5: parseFloat((t * 0.85).toFixed(1)),
        year10: t,
      };
    } else {
      // Lifestyle changes: ~25% in year 1, ~65% in year 5
      return {
        year1: parseFloat((t * 0.25).toFixed(1)),
        year5: parseFloat((t * 0.65).toFixed(1)),
        year10: t,
      };
    }
  };

  // ── Smoking ────────────────────────────────────────────────────────────────
  if (activeProfile.smokingStatus === 'current') {
    const absRed = baselineRiskPercent * 0.45;
    const safeRed = Math.min(absRed, baselineRiskPercent * 0.9);
    interventions.push({
      id: 'smoking',
      domain: 'Smoking',
      title: 'Quit Smoking',
      description: 'Cessation significantly reduces arterial inflammation and thrombotic risk.',
      currentValueDisplay: 'Current nicotine user',
      targetValueDisplay: 'Non-smoker',
      absoluteReduction: parseFloat(safeRed.toFixed(1)),
      relativeReduction: 45,
      confidenceInterval: [parseFloat((safeRed * 0.8).toFixed(1)), parseFloat((safeRed * 1.1).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(safeRed.toFixed(1)), 'rapid'),
      benefitLevel: safeRed > 2 ? 'high' : 'moderate',
      achieved: false,
    });
  } else {
    const currentDisplay =
      activeProfile.smokingStatus === 'former'
        ? `Former user (${activeProfile.smokingYearsQuit} yr${activeProfile.smokingYearsQuit !== 1 ? 's' : ''} quit)`
        : 'Never used nicotine';
    interventions.push({
      id: 'smoking',
      domain: 'Smoking',
      title: 'Remain Smoke Free',
      description: 'Continuing to avoid tobacco is crucial for heart health.',
      currentValueDisplay: currentDisplay,
      targetValueDisplay: 'Maintain Status',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── Physical Activity ──────────────────────────────────────────────────────
  if (totalActivityMins < 150) {
    const gap = 150 - totalActivityMins;
    const relRed = 15 + (gap / 150) * 15; // 15–30% reduction
    const absRed = baselineRiskPercent * (relRed / 100);
    interventions.push({
      id: 'activity',
      domain: 'Activity',
      title: 'Increase Activity',
      description: 'Reaching 150 mins/week of moderate-equivalent exercise improves endothelial function.',
      currentValueDisplay: `${totalActivityMins} min/week (equiv.)`,
      targetValueDisplay: '150 min/week',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(0)),
      confidenceInterval: [parseFloat((absRed * 0.7).toFixed(1)), parseFloat((absRed * 1.2).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed > 1.5 ? 'high' : absRed > 0.5 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'activity',
      domain: 'Activity',
      title: 'Maintain Activity',
      description: 'Great job meeting recommended activity guidelines.',
      currentValueDisplay: `${totalActivityMins} min/week (equiv.)`,
      targetValueDisplay: '150+ min/week',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── Sun Exposure ───────────────────────────────────────────────────────────
  if (avgSunExposure < 0.5) {
    const absRed = baselineRiskPercent * 0.04;
    interventions.push({
      id: 'sunExposure',
      domain: 'Sun Exposure',
      title: 'Increase Sun Exposure',
      description: 'Daily outdoor time supports vitamin D synthesis, linked to reduced CVD risk.',
      currentValueDisplay: `${avgSunExposure.toFixed(1)} hr/day avg`,
      targetValueDisplay: '1+ hr/day outdoors',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: 4,
      confidenceInterval: [parseFloat((absRed * 0.5).toFixed(1)), parseFloat((absRed * 1.5).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'sunExposure',
      domain: 'Sun Exposure',
      title: 'Good Sun Exposure',
      description: 'Regular outdoor time supports vitamin D synthesis.',
      currentValueDisplay: `${avgSunExposure.toFixed(1)} hr/day avg`,
      targetValueDisplay: '1+ hr/day',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── BMI ────────────────────────────────────────────────────────────────────
  if (activeProfile.bmi > 25) {
    const targetBMI = 25;
    const bmiGap = activeProfile.bmi - targetBMI;
    const relRed = Math.min(30, bmiGap * 4);
    const absRed = baselineRiskPercent * (relRed / 100);
    interventions.push({
      id: 'bmi',
      domain: 'Weight',
      title: 'Optimize Weight',
      description: `Targeting a BMI of 25 (approx ${(activeProfile.heightCm / 100 * activeProfile.heightCm / 100 * 25).toFixed(0)} kg) reduces metabolic strain.`,
      currentValueDisplay: `BMI ${activeProfile.bmi.toFixed(1)}`,
      targetValueDisplay: 'BMI 25.0',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(0)),
      confidenceInterval: [parseFloat((absRed * 0.6).toFixed(1)), parseFloat((absRed * 1.3).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed > 1.5 ? 'high' : absRed > 0.5 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'bmi',
      domain: 'Weight',
      title: 'Maintain Healthy Weight',
      description: 'Your BMI is within the healthy range.',
      currentValueDisplay: `BMI ${activeProfile.bmi.toFixed(1)}`,
      targetValueDisplay: 'Maintain',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── Diet ───────────────────────────────────────────────────────────────────
  if (activeProfile.dietQuality < 80) {
    const gap = 80 - activeProfile.dietQuality;
    const relRed = (gap / 80) * 25; // Up to 25% reduction for poor diet
    const absRed = baselineRiskPercent * (relRed / 100);
    interventions.push({
      id: 'diet',
      domain: 'Diet',
      title: 'Improve Diet Quality',
      description: 'Adopting a balanced whole-food diet reduces systemic inflammation and metabolic risk.',
      currentValueDisplay: `Score ${Math.round(activeProfile.dietQuality / 100 * 9)}/9`,
      targetValueDisplay: 'Score 7–9/9',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(0)),
      confidenceInterval: [parseFloat((absRed * 0.5).toFixed(1)), parseFloat((absRed * 1.5).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed > 1.0 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'diet',
      domain: 'Diet',
      title: 'Maintain Good Diet',
      description: 'Your dietary habits are heart-healthy.',
      currentValueDisplay: `Score ${Math.round(activeProfile.dietQuality / 100 * 9)}/9`,
      targetValueDisplay: 'Maintain',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── Sleep ──────────────────────────────────────────────────────────────────
  if (activeProfile.sleepHours < 6 || activeProfile.sleepHours > 9) {
    const absRed = baselineRiskPercent * 0.08;
    interventions.push({
      id: 'sleep',
      domain: 'Sleep',
      title: 'Optimize Sleep',
      description: '7–8 hours of sleep is optimal for cardiovascular recovery.',
      currentValueDisplay: `${activeProfile.sleepHours} hrs/night`,
      targetValueDisplay: '7–8 hrs',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: 8,
      confidenceInterval: [parseFloat((absRed * 0.5).toFixed(1)), parseFloat((absRed * 1.5).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'sleep',
      domain: 'Sleep',
      title: 'Maintain Sleep',
      description: 'Sleep duration is optimal.',
      currentValueDisplay: `${activeProfile.sleepHours} hrs/night`,
      targetValueDisplay: '7–8 hrs',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── Alcohol ────────────────────────────────────────────────────────────────
  if (estimatedDrinksPerWeek > 14) {
    const excess = estimatedDrinksPerWeek - 14;
    const relRed = Math.min(20, excess * 1.5);
    const absRed = baselineRiskPercent * (relRed / 100);
    interventions.push({
      id: 'alcohol',
      domain: 'Alcohol',
      title: 'Reduce Alcohol Intake',
      description: 'Heavy drinking raises blood pressure and increases arrhythmia risk.',
      currentValueDisplay: `~${estimatedDrinksPerWeek.toFixed(0)} drinks/week`,
      targetValueDisplay: '≤14 drinks/week',
      absoluteReduction: parseFloat(absRed.toFixed(1)),
      relativeReduction: parseFloat(relRed.toFixed(0)),
      confidenceInterval: [parseFloat((absRed * 0.6).toFixed(1)), parseFloat((absRed * 1.4).toFixed(1))],
      temporalProjection: getTemporal(parseFloat(absRed.toFixed(1)), 'gradual'),
      benefitLevel: absRed > 1.0 ? 'moderate' : 'low',
      achieved: false,
    });
  } else {
    interventions.push({
      id: 'alcohol',
      domain: 'Alcohol',
      title: 'Alcohol Intake OK',
      description: 'Your alcohol consumption is within recommended limits.',
      currentValueDisplay: estimatedDrinksPerWeek === 0 ? 'Non-drinker' : `~${estimatedDrinksPerWeek.toFixed(0)} drinks/week`,
      targetValueDisplay: '≤14 drinks/week',
      absoluteReduction: 0,
      relativeReduction: 0,
      confidenceInterval: [0, 0],
      temporalProjection: { year1: 0, year5: 0, year10: 0 },
      benefitLevel: 'none',
      achieved: true,
    });
  }

  // ── Sort by absolute reduction descending ──────────────────────────────────
  interventions.sort((a, b) => b.absoluteReduction - a.absoluteReduction);

  // ── Calculate "Optimal Risk" (all interventions applied) ───────────────────
  let residualRisk = baselineRiskPercent;
  interventions.forEach(inv => {
    if (!inv.achieved) {
      residualRisk = residualRisk * (1 - inv.relativeReduction / 100);
    }
  });

  const floor = 1.0;
  const optimalRisk = Math.max(floor, residualRisk);

  return {
    baselineRisk: parseFloat(baselineRiskPercent.toFixed(1)),
    optimalRisk: parseFloat(optimalRisk.toFixed(1)),
    interventions,
    timestamp: Date.now(),
  };
};

export const defaultProfile: UserProfile = {
  sex: 'male',
  heightCm: 175,
  weightKg: 80,
  bmi: 26.1,
  sleepHours: 7,
  smokingStatus: 'never',
  smokingYearsQuit: 0,
  alcoholFrequency: 'weekly_occasional',
  moderateActivityMins: 60,
  vigorousActivityMins: 0,
  sunExposureSummer: 1,
  sunExposureWinter: 0.5,
  cookedVegTablespoons: 3,
  rawVegTablespoons: 2,
  freshFruitPieces: 2,
  driedFruitPieces: 0,
  oilyFishFreq: 'rarely',
  otherFishFreq: 'sometimes',
  processedMeatFreq: 'sometimes',
  poultryFreq: 'sometimes',
  beefFreq: 'rarely',
  lambFreq: 'rarely',
  porkFreq: 'rarely',
  milkType: 'semi',
  spreadType: 'margarine',
  cerealBowlsPerWeek: 3,
  saltUsage: 'sometimes',
  waterGlassesPerDay: 5,
  dietQuality: 50,
};
