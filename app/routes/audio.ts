import type { Route } from "./+types/audio";
import { fetchSession } from "../lib/session.server";
import { synthesizeSessionBrief } from "../../workers/voice";

export async function loader({ params, context }: Route.LoaderArgs) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    throw new Response("Missing session ID.", { status: 400 });
  }

  const session = await fetchSession(context.cloudflare.env, sessionId);
  if (!session) {
    throw new Response("Session not found.", { status: 404 });
  }

  return synthesizeSessionBrief(session, context.cloudflare.env);
}
