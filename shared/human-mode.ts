export type AudienceProfileId =
  | "older_parent"
  | "esl_support"
  | "healthcare_helper"
  | "medication_helper";

export interface AudienceProfile {
  id: AudienceProfileId;
  label: string;
  caption: string;
  readingLevel: string;
  tone: string;
}

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
  recommendedProfileId: AudienceProfileId;
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
  profileId: AudienceProfileId;
  url: string;
}

export interface HumanModeSessionState {
  id: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  locale: string;
  profileId: AudienceProfileId;
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

export const audienceProfiles: Record<AudienceProfileId, AudienceProfile> = {
  older_parent: {
    id: "older_parent",
    label: "Older parent",
    caption: "Calm, slowed-down guidance with fewer assumptions.",
    readingLevel: "simple",
    tone: "patient and reassuring",
  },
  esl_support: {
    id: "esl_support",
    label: "ESL support",
    caption: "Plain words first, official terms explained only when needed.",
    readingLevel: "plain",
    tone: "clear and literal",
  },
  healthcare_helper: {
    id: "healthcare_helper",
    label: "Healthcare shopper",
    caption: "Highlight costs, eligibility, documents, and risky choices.",
    readingLevel: "plain but specific",
    tone: "practical and detail-aware",
  },
  medication_helper: {
    id: "medication_helper",
    label: "Medication guide",
    caption: "Break down side effects, interactions, dosage, and medical jargon.",
    readingLevel: "plain and specific",
    tone: "careful and reassuring",
  },
};

export const audienceProfileList = Object.values(audienceProfiles);

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
    recommendedProfileId: "older_parent",
    locale: "en",
  },
  {
    id: "benefit-finder",
    title: "Benefit Finder",
    category: "Government benefits",
    url: "https://www.usa.gov/benefit-finder",
    reason: "Branching eligibility language that hides real options behind jargon.",
    recommendedProfileId: "esl_support",
    locale: "es",
  },
  {
    id: "uscis-fee-calculator",
    title: "USCIS Fee Calculator",
    category: "Immigration forms",
    url: "https://www.uscis.gov/feecalculator",
    reason: "Slows down fees, filing choices, and official terminology.",
    recommendedProfileId: "esl_support",
    locale: "en",
  },
  {
    id: "healthcare-estimator",
    title: "Health Coverage Estimator",
    category: "Healthcare",
    url: "https://www.healthcare.gov/see-plans/",
    reason: "Cost anxiety, plan jargon, and document preparation in one confusing page.",
    recommendedProfileId: "healthcare_helper",
    locale: "en",
  },
  {
    id: "cra-benefits",
    title: "CRA Benefits",
    category: "Canadian taxes",
    url: "https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit-overview.html",
    reason: "Canada Child Benefit eligibility with shared custody rules and payment calculations.",
    recommendedProfileId: "older_parent",
    locale: "en",
  },
  {
    id: "ircc-immigration",
    title: "Express Entry",
    category: "Canadian immigration",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html",
    reason: "Multi-step immigration process with points system, eligibility streams, and deadlines.",
    recommendedProfileId: "esl_support",
    locale: "uk",
  },
  {
    id: "medication-metformin",
    title: "Metformin Drug Info",
    category: "Medication info",
    url: "https://medlineplus.gov/druginfo/meds/a696005.html",
    reason: "Side effects, interactions, dosage, and medical jargon in dense clinical language.",
    recommendedProfileId: "medication_helper",
    locale: "en",
  },
];

export function getAudienceProfile(profileId: AudienceProfileId): AudienceProfile {
  return audienceProfiles[profileId];
}
