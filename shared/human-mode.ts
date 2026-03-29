export interface LocaleOption {
  value: string;
  label: string;
}

export interface DemoSite {
  id: string;
  title: string;
  category: string;
  url: string;
  reason: string;
  locale: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  summary: string;
  excerpt: string;
  headings: string[];
  sourceType: "http-fetch" | "browser-rendering";
  warning: string | null;
}

export interface ConfusingPoint {
  label: string;
  explanation: string;
}

export interface HumanModeGuide {
  overview: string;
  beforeYouStart: string[];
  whatMightBeConfusing: ConfusingPoint[];
  nextSteps: string[];
  suggestedQuestions: string[];
  voiceScript: string;
}

export interface FollowUpItem {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface HumanModeSessionInit {
  locale: string;
  url: string;
}

export interface HumanModeSessionState {
  id: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  locale: string;
  status: "idle" | "analyzing" | "ready" | "error";
  page: PageSnapshot | null;
  guide: HumanModeGuide | null;
  guideSource?: "ai" | "fallback";
  followUps: FollowUpItem[];
  error: string | null;
}

export interface AnalysisResult {
  page: PageSnapshot;
  guide: HumanModeGuide;
  guideSource: "ai" | "fallback";
  aiError?: string;
}

export const localeOptions: LocaleOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "uk", label: "Ukrainian" },
  { value: "hi", label: "Hindi" },
  { value: "fr", label: "French" },
];

export const demoSites: DemoSite[] = [
  {
    id: "passport-renewal",
    title: "Passport Renewal",
    category: "Travel paperwork",
    url: "https://travel.state.gov/content/travel/en/passports/have-passport/renew-online.html",
    reason: "Real requirements, warnings, and step ordering that trips up most people.",
    locale: "en",
  },
  {
    id: "benefit-finder",
    title: "Benefit Finder",
    category: "Government benefits",
    url: "https://www.usa.gov/benefit-finder",
    reason: "Branching eligibility language that hides real options behind jargon.",
    locale: "es",
  },
  {
    id: "uscis-fee-calculator",
    title: "USCIS Fee Calculator",
    category: "Immigration forms",
    url: "https://www.uscis.gov/feecalculator",
    reason: "Slows down fees, filing choices, and official terminology.",
    locale: "en",
  },
  {
    id: "healthcare-estimator",
    title: "Health Coverage Estimator",
    category: "Healthcare",
    url: "https://www.healthcare.gov/see-plans/",
    reason: "Cost anxiety, plan jargon, and document preparation in one confusing page.",
    locale: "en",
  },
  {
    id: "cra-benefits",
    title: "CRA Benefits",
    category: "Canadian taxes",
    url: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html",
    reason: "Canada Child Benefit eligibility with shared custody rules and payment calculations.",
    locale: "en",
  },
  {
    id: "ircc-immigration",
    title: "Express Entry",
    category: "Canadian immigration",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    reason: "Multi-step immigration process with points system, eligibility streams, and deadlines.",
    locale: "uk",
  },
  {
    id: "medication-metformin",
    title: "Metformin Drug Info",
    category: "Medication info",
    url: "https://medlineplus.gov/druginfo/meds/a696005.html",
    reason: "Side effects, interactions, dosage, and medical jargon in dense clinical language.",
    locale: "en",
  },
];
