import type {
  HumanModeSessionInit,
  HumanModeSessionState,
} from "../../shared/human-mode";
import {
  analyzePageForHumanMode,
  answerQuestionForHumanMode,
} from "../../workers/analyze";

export async function initializeSession(
  env: Env,
  init: HumanModeSessionInit
): Promise<{ sessionId: string; status: string }> {
  const sessionId = crypto.randomUUID();
  const stub = getSessionStub(env, sessionId);

  const initResponse = await stub.fetch(
    "https://human-mode.internal/initialize",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(init),
    }
  );

  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(
      errorText || "Failed to initialize the Human Mode session."
    );
  }

  const session = (await initResponse.json()) as HumanModeSessionState;
  return { sessionId, status: session.status };
}

export async function runAnalysis(
  env: Env,
  sessionId: string,
  init: HumanModeSessionInit
): Promise<void> {
  const stub = getSessionStub(env, sessionId);

  try {
    const analysis = await analyzePageForHumanMode(init, env);
    await stub.fetch("https://human-mode.internal/store-analysis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, analysis }),
    });
  } catch (error) {
    await stub.fetch("https://human-mode.internal/store-analysis", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Human Mode could not analyze this page.",
      }),
    });
  }
}

export async function fetchSession(
  env: Env,
  sessionId: string
): Promise<HumanModeSessionState | null> {
  const stub = getSessionStub(env, sessionId);
  const response = await stub.fetch("https://human-mode.internal/state");

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Could not load the Human Mode session.");
  }

  return (await response.json()) as HumanModeSessionState;
}

export async function addFollowUp(
  env: Env,
  sessionId: string,
  question: string
): Promise<void> {
  const session = await fetchSession(env, sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }

  // Run AI answer in the worker context (where env.AI exists)
  const answer = await answerQuestionForHumanMode(session, question, env);

  const stub = getSessionStub(env, sessionId);
  const response = await stub.fetch("https://human-mode.internal/follow-ups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, answer }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Could not save the follow-up question.");
  }
}

function getSessionStub(env: Env, sessionId: string): DurableObjectStub {
  const id = env.HUMAN_MODE_SESSIONS.idFromName(sessionId);
  return env.HUMAN_MODE_SESSIONS.get(id);
}
