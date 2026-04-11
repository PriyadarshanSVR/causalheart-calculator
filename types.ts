export type AlcoholFrequency =
  | 'daily'
  | 'weekly_frequent'
  | 'weekly_occasional'
  | 'monthly'
  | 'special'
  | 'never';

export interface UserProfile {
  // Demographics
  age: number;               // 40–73 (UK Biobank range)
  sex: 'male' | 'female';

  // Body composition — stored in metric; form uses imperial locally
  heightCm: number;
  weightKg: number;
  bmi: number; // computed

  // Sleep
  sleepHours: number;

  // Nicotine ('previous' matches model label)
  smokingStatus: 'never' | 'previous' | 'current';

  // Alcohol
  alcoholFrequency: AlcoholFrequency;

  // Physical Activity (IPAQ-style: days × mins/day)
  moderateActivityDays: number;        // 0–7
  moderateActivityMinsPerDay: number;  // capped at 180
  vigorousActivityDays: number;        // 0–7
  vigorousActivityMinsPerDay: number;  // capped at 180

  // Sedentary time
  tvHoursPerDay: number;
  computerHoursPerDay: number;
  drivingHoursPerDay: number;  // capped at 11

  // Sun exposure (seasonal hours/day)
  sunExposureSummer: number;
  sunExposureWinter: number;

  // Diet — 10 binary components (true = meets criterion)
  dietFruit: boolean;           // ≥3 servings fruit/day
  dietVeg: boolean;             // ≥3 servings veg/day
  dietWholeGrains: boolean;     // ≥3 servings whole grains/day
  dietFish: boolean;            // fish ≥2/week
  dietDairy: boolean;           // ≥2 servings dairy/day
  dietOil: boolean;             // plant oil ≥2 times/day
  dietRefinedGrains: boolean;   // refined grains ≤2/day
  dietProcessedMeat: boolean;   // processed meat ≤1/week
  dietRedMeat: boolean;         // red meat ≤2/week
  dietSugar: boolean;           // avoids sugar-sweetened drinks

  // Computed — sum of above (0–10)
  dietQuality: number;
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
  | 'sunExposure'
  | 'sedentary';
