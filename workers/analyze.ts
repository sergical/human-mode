import {
  audienceProfiles,
  type AnalysisResult,
  type AudienceProfileId,
  type ConfusingPoint,
  type HumanModeGuide,
  type HumanModeSessionInit,
  type HumanModeSessionState,
  type PageSnapshot,
} from "../shared/human-mode";
import { capturePageContext } from "./browser";

const DEFAULT_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";

export async function analyzePageForHumanMode(
  init: HumanModeSessionInit,
  env: Env
): Promise<AnalysisResult> {
  const page = await capturePageContext(init.url, env);
  const aiGuide = await generateGuideWithWorkersAi(page, init, env);

  return {
    page,
    guide: aiGuide ?? buildFallbackGuide(page, init.profileId),
  };
}

export async function answerQuestionForHumanMode(
  session: HumanModeSessionState,
  question: string,
  env: Env
): Promise<string> {
  const aiAnswer = await generateFollowUpWithWorkersAi(session, question, env);
  if (aiAnswer) {
    return aiAnswer;
  }

  return buildFallbackAnswer(session, question);
}

async function generateGuideWithWorkersAi(
  page: PageSnapshot,
  init: HumanModeSessionInit,
  env: Env
): Promise<HumanModeGuide | null> {
  if (!env.AI) {
    return null;
  }

  const profile = audienceProfiles[init.profileId];
  const model = (env.HUMAN_MODE_MODEL ?? DEFAULT_AI_MODEL) as keyof AiModels;
  const prompt = [
    "You are Human Mode, a plain-language guide for hard webpages.",
    `Audience: ${profile.label}.`,
    `Tone: ${profile.tone}.`,
    `Reading level: ${profile.readingLevel}.`,
    `Preferred output language locale: ${init.locale}.`,
    "Return valid JSON only with this exact shape:",
    '{"overview":"string","beforeYouStart":["string"],"whatMightBeConfusing":[{"label":"string","explanation":"string"}],"nextSteps":["string"],"suggestedQuestions":["string"],"voiceScript":"string"}',
    "Keep the response grounded in the page details below. Do not invent forms, prices, or steps that are not hinted at by the page.",
    `Page title: ${page.title}`,
    `Page summary: ${page.summary}`,
    `Headings: ${page.headings.join(" | ") || "None detected"}`,
    `Excerpt: ${page.excerpt || "No excerpt captured."}`,
  ].join("\n");

  try {
    const answer = (await env.AI.run(model, {
      prompt,
    })) as unknown;
    const raw =
      typeof answer === "string"
        ? answer
        : typeof answer === "object" && answer !== null && "response" in answer
          ? String((answer as { response?: unknown }).response ?? "")
          : JSON.stringify(answer);

    return parseGuideFromModel(raw);
  } catch (error) {
    console.warn("Workers AI guide generation failed, using fallback.", error);
    return null;
  }
}

async function generateFollowUpWithWorkersAi(
  session: HumanModeSessionState,
  question: string,
  env: Env
): Promise<string | null> {
  if (!env.AI || !session.page || !session.guide) {
    return null;
  }

  const model = (env.HUMAN_MODE_MODEL ?? DEFAULT_AI_MODEL) as keyof AiModels;
  const prompt = [
    "You are Human Mode answering a follow-up question about a webpage.",
    "Use only the session context below.",
    "Answer in 2-4 short sentences. Prefer clarity over completeness.",
    `Question: ${question}`,
    `Page title: ${session.page.title}`,
    `Overview: ${session.guide.overview}`,
    `Before you start: ${session.guide.beforeYouStart.join(" | ")}`,
    `Confusing points: ${session.guide.whatMightBeConfusing
      .map((item) => `${item.label}: ${item.explanation}`)
      .join(" | ")}`,
    `Next steps: ${session.guide.nextSteps.join(" | ")}`,
  ].join("\n");

  try {
    const answer = (await env.AI.run(model, {
      prompt,
    })) as unknown;

    const raw =
      typeof answer === "string"
        ? answer
        : typeof answer === "object" && answer !== null && "response" in answer
          ? String((answer as { response?: unknown }).response ?? "")
          : JSON.stringify(answer);

    const cleaned = raw.replace(/^["`\s]+|["`\s]+$/g, "").trim();
    return cleaned || null;
  } catch (error) {
    console.warn("Workers AI follow-up failed, using fallback.", error);
    return null;
  }
}

function parseGuideFromModel(raw: string): HumanModeGuide | null {
  const jsonLike = extractJsonObject(raw);
  if (!jsonLike) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonLike) as Partial<HumanModeGuide>;
    if (
      !parsed.overview ||
      !Array.isArray(parsed.beforeYouStart) ||
      !Array.isArray(parsed.whatMightBeConfusing) ||
      !Array.isArray(parsed.nextSteps) ||
      !Array.isArray(parsed.suggestedQuestions)
    ) {
      return null;
    }

    return {
      overview: parsed.overview,
      beforeYouStart: parsed.beforeYouStart.slice(0, 4),
      whatMightBeConfusing: parsed.whatMightBeConfusing
        .map((item) => ({
          label: item.label,
          explanation: item.explanation,
        }))
        .filter((item) => item.label && item.explanation)
        .slice(0, 4),
      nextSteps: parsed.nextSteps.slice(0, 4),
      suggestedQuestions: parsed.suggestedQuestions.slice(0, 4),
      voiceScript:
        parsed.voiceScript ||
        [parsed.overview, parsed.nextSteps[0]].filter(Boolean).join(" "),
    };
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): string | null {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return raw.slice(firstBrace, lastBrace + 1);
}

function buildFallbackGuide(
  page: PageSnapshot,
  profileId: AudienceProfileId
): HumanModeGuide {
  const profile = audienceProfiles[profileId];
  const scenario = identifyScenario(page);
  const headingSteps = page.headings.slice(0, 3).map((heading) => {
    return `Look for the section labeled "${heading}" and finish only that part before moving on.`;
  });

  const beforeYouStart = dedupe([
    ...scenario.documents,
    "Keep a second device or notebook nearby so you can pause and write down anything unclear.",
    "Stop if the site asks for payment, identity details, or deadlines you did not expect.",
  ]).slice(0, 4);

  const whatMightBeConfusing = scenario.confusingPoints.slice(0, 4);
  const nextSteps = dedupe([
    `Start by reading the page title and first section aloud: ${page.title}.`,
    ...headingSteps,
    "Use the next button only after you understand what the current section is asking for.",
  ]).slice(0, 4);

  const suggestedQuestions = dedupe([
    "What documents should I gather before starting?",
    "Which part of this page is easiest to misunderstand?",
    "What is the safest next step from here?",
    "Can you explain this in simpler words?",
  ]).slice(0, 4);

  const overview = [
    `This page looks like a ${scenario.name.toLowerCase()} task.`,
    `For ${profile.label.toLowerCase()} mode, I would slow it down, explain the official terms, and focus on one decision at a time.`,
    page.summary,
  ].join(" ");

  const voiceScript = [
    `Here is the quick version for ${profile.label.toLowerCase()} mode.`,
    overview,
    `Before you start, ${beforeYouStart[0] ?? "gather the key documents this page asks for"}.`,
    `Watch out for ${whatMightBeConfusing[0]?.label.toLowerCase() ?? "official wording that hides the real choice"}.`,
    `Your next step is: ${nextSteps[0] ?? "read the first section slowly before you click anything"}`,
  ].join(" ");

  return {
    overview,
    beforeYouStart,
    whatMightBeConfusing,
    nextSteps,
    suggestedQuestions,
    voiceScript,
  };
}

function buildFallbackAnswer(
  session: HumanModeSessionState,
  question: string
): string {
  const normalized = question.toLowerCase();
  const guide = session.guide;

  if (!guide) {
    return "The guide is still being prepared. Try asking again after the page summary finishes loading.";
  }

  if (normalized.includes("document") || normalized.includes("need")) {
    return `Start with this checklist: ${guide.beforeYouStart.join(" ")}`;
  }

  const matchingPoint = guide.whatMightBeConfusing.find((item) =>
    normalized.includes(item.label.toLowerCase())
  );
  if (matchingPoint) {
    return `${matchingPoint.label} is worth slowing down for. ${matchingPoint.explanation}`;
  }

  if (
    normalized.includes("next") ||
    normalized.includes("start") ||
    normalized.includes("first")
  ) {
    return `The safest next move is this: ${guide.nextSteps[0] ?? "read the first visible section carefully before clicking next."}`;
  }

  return `${guide.overview} If you need a single move right now, start with: ${guide.nextSteps[0] ?? "read the first section slowly."}`;
}

function identifyScenario(page: PageSnapshot): {
  name: string;
  documents: string[];
  confusingPoints: ConfusingPoint[];
} {
  const source = `${page.title} ${page.summary} ${page.excerpt}`.toLowerCase();

  if (source.includes("passport") || source.includes("travel.state.gov")) {
    return {
      name: "passport or travel document",
      documents: [
        "have your current passport, a payment card, and a compliant passport photo ready",
        "keep your travel dates nearby in case the form asks whether upcoming travel changes the process",
      ],
      confusingPoints: [
        {
          label: "Eligibility",
          explanation:
            "Passport pages often mix 'can renew online' with 'must renew another way'. Make sure the site is describing your exact situation before you continue.",
        },
        {
          label: "Photo requirements",
          explanation:
            "A photo can look acceptable but still fail on size, background, or framing rules. This is usually where people lose time.",
        },
      ],
    };
  }

  if (
    source.includes("benefit") ||
    source.includes("eligibility") ||
    source.includes("usa.gov")
  ) {
    return {
      name: "benefits eligibility",
      documents: [
        "have your household details, address history, and income information nearby",
        "write down the programs you already use so you do not answer overlapping questions inconsistently",
      ],
      confusingPoints: [
        {
          label: "Household",
          explanation:
            "Government sites often use 'household' in a stricter sense than everyday speech. It can affect which income or dependents count.",
        },
        {
          label: "Eligibility questions",
          explanation:
            "Some questions feel optional but narrow the list of programs you will see. It helps to answer slowly and avoid guessing.",
        },
      ],
    };
  }

  if (
    source.includes("healthcare") ||
    source.includes("medicare") ||
    source.includes("premium") ||
    source.includes("deductible")
  ) {
    return {
      name: "health coverage",
      documents: [
        "have your expected yearly income, household size, and ZIP code ready",
        "keep a short list of doctors, prescriptions, or care needs nearby so you can compare plans meaningfully",
      ],
      confusingPoints: [
        {
          label: "Deductible vs out-of-pocket maximum",
          explanation:
            "These sound similar but describe different cost thresholds. If you miss the difference, a plan can look cheaper than it really is.",
        },
        {
          label: "Eligibility window",
          explanation:
            "Healthcare sites often separate browsing from enrollment. Watch for whether the page is describing plan options or an actual signup period.",
        },
      ],
    };
  }

  if (source.includes("uscis") || source.includes("immigration")) {
    return {
      name: "immigration filing",
      documents: [
        "have the exact form or petition name ready before using any fee or eligibility tool",
        "keep your filing category, status, and any requested supporting IDs nearby",
      ],
      confusingPoints: [
        {
          label: "Form version",
          explanation:
            "Immigration pages often split the process by form edition, filing method, or category. The wrong branch can lead to the wrong fee.",
        },
        {
          label: "Fee exceptions",
          explanation:
            "Fee waivers, biometrics, or add-on payments can sit in small notes instead of the main price section.",
        },
      ],
    };
  }

  return {
    name: "high-friction online form",
    documents: [
      "have your ID, email, and any reference numbers mentioned on the page ready",
      "set aside enough time to read each section once before filling it in",
    ],
    confusingPoints: [
      {
        label: "Official wording",
        explanation:
          "Pages like this often hide the real decision inside formal wording. Slow down on any sentence that changes whether you qualify, pay, or upload documents.",
      },
      {
        label: "Required vs optional fields",
        explanation:
          "If the difference is unclear, look for visual cues and section notes before typing. Guessing here usually causes the next problem.",
      },
    ],
  };
}

function dedupe(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))];
}
