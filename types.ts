export type AlcoholFrequency =
  | 'daily'
  | 'weekly_frequent'
  | 'weekly_occasional'
  | 'monthly'
  | 'special'
  | 'never';

export type FoodFrequency = 'never' | 'rarely' | 'sometimes' | 'often' | 'daily';
export type MilkType     = 'whole' | 'semi' | 'skimmed' | 'plant' | 'none';
export type SpreadType   = 'butter' | 'margarine' | 'olive' | 'none';
export type SaltUsage    = 'always' | 'usually' | 'sometimes' | 'rarely';

export interface UserProfile {
  // Demographics (Q1)
  sex: 'male' | 'female';

  // Body composition (Q2) — stored in metric; form uses imperial locally
  heightCm: number;
  weightKg: number;
  bmi: number; // computed

  // Sleep (Q3)
  sleepHours: number;

  // Nicotine (Q4)
  smokingStatus: 'never' | 'former' | 'current';
  smokingYearsQuit: number; // 0 for current/never

  // Alcohol (Q5)
  alcoholFrequency: AlcoholFrequency;

  // Physical Activity (Q6)
  moderateActivityMins: number; // mins/week
  vigorousActivityMins: number; // mins/week

  // Sun Exposure (Q7)
  sunExposureSummer: number; // hours/day
  sunExposureWinter: number; // hours/day

  // Diet — Veg & Fruit (Q8)
  cookedVegTablespoons: number;
  rawVegTablespoons: number;
  freshFruitPieces: number;
  driedFruitPieces: number;

  // Diet — Fish (Q8)
  oilyFishFreq: FoodFrequency;
  otherFishFreq: FoodFrequency;

  // Diet — Meat (Q8)
  processedMeatFreq: FoodFrequency;
  poultryFreq: FoodFrequency;
  beefFreq: FoodFrequency;
  lambFreq: FoodFrequency;
  porkFreq: FoodFrequency;

  // Diet — Dairy & Fats (Q8)
  milkType: MilkType;
  spreadType: SpreadType;

  // Diet — Cereal, Salt, Water (Q8)
  cerealBowlsPerWeek: number;
  saltUsage: SaltUsage;
  waterGlassesPerDay: number;

  // Computed internally
  dietQuality: number; // 0–100, derived from 0–9 score × (100/9)
}

export interface Intervention {
  id: string;
  domain: string;
  title: string;
  description: string;
  currentValueDisplay: string;
  targetValueDisplay: string;
  absoluteReduction: number;
  relativeReduction: number;
  confidenceInterval: [number, number];
  temporalProjection: { year1: number; year5: number; year10: number };
  benefitLevel: 'high' | 'moderate' | 'low' | 'none';
  achieved: boolean;
}

export interface RiskAnalysisResult {
  baselineRisk: number;
  typicalRisk: number;
  optimalRisk: number;
  interventions: Intervention[];
  timestamp: number;
}

export type LifestyleDomain =
  | 'diet'
  | 'activity'
  | 'smoking'
  | 'sleep'
  | 'alcohol'
  | 'bmi'
  | 'sunExposure';
