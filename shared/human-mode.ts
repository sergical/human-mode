export type AudienceProfileId =
  | "older_parent"
  | "esl_support"
  | "healthcare_helper";

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
  locale: string;
  profileId: AudienceProfileId;
  status: "idle" | "analyzing" | "ready" | "error";
  page: PageSnapshot | null;
  guide: HumanModeGuide | null;
  followUps: FollowUpItem[];
  error: string | null;
}

export interface AnalysisResult {
  page: PageSnapshot;
  guide: HumanModeGuide;
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
};

export const audienceProfileList = Object.values(audienceProfiles);

export const localeOptions: LocaleOption[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "hi", label: "Hindi" },
];

export const demoSites: DemoSite[] = [
  {
    id: "passport-renewal",
    title: "Passport Renewal",
    category: "Travel paperwork",
    url: "https://travel.state.gov/content/travel/en/passports/have-passport/renew-online.html",
    reason: "Strong public-page demo with real requirements, warnings, and step ordering.",
    recommendedProfileId: "older_parent",
    locale: "en",
  },
  {
    id: "benefit-finder",
    title: "Benefit Finder",
    category: "Government benefits",
    url: "https://www.usa.gov/benefit-finder",
    reason: "Good fit for translating branching eligibility language into ordinary speech.",
    recommendedProfileId: "esl_support",
    locale: "es",
  },
  {
    id: "uscis-fee-calculator",
    title: "USCIS Fee Calculator",
    category: "Immigration forms",
    url: "https://www.uscis.gov/feecalculator",
    reason: "Shows the value of slowing down fees, filing choices, and official terminology.",
    recommendedProfileId: "esl_support",
    locale: "en",
  },
  {
    id: "healthcare-estimator",
    title: "Health Coverage Estimator",
    category: "Healthcare",
    url: "https://www.healthcare.gov/see-plans/",
    reason: "Useful for cost anxiety, plan jargon, and document preparation.",
    recommendedProfileId: "healthcare_helper",
    locale: "en",
  },
];

export function getAudienceProfile(profileId: AudienceProfileId): AudienceProfile {
  return audienceProfiles[profileId];
}
