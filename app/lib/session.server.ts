import type {
  HumanModeSessionInit,
  HumanModeSessionState,
} from "../../shared/human-mode";

export async function initializeSession(
  env: Env,
  init: HumanModeSessionInit
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const stub = getSessionStub(env, sessionId);

  const response = await stub.fetch("https://human-mode.internal/initialize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(init),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to initialize the Human Mode session.");
  }

  return sessionId;
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
  const stub = getSessionStub(env, sessionId);
  const response = await stub.fetch("https://human-mode.internal/follow-ups", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ question }),
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
