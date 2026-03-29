import type {
  AnalysisResult,
  FollowUpItem,
  HumanModeSessionInit,
  HumanModeSessionState,
} from "../shared/human-mode";
import { analyzePageForHumanMode } from "./analyze";

const STORAGE_KEY = "session";

export class HumanModeSession {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/state") {
      return this.handleGetState();
    }

    if (request.method === "POST" && url.pathname === "/initialize") {
      return this.handleInitialize(request);
    }

    if (request.method === "POST" && url.pathname === "/store-analysis") {
      return this.handleStoreAnalysis(request);
    }

    if (request.method === "POST" && url.pathname === "/follow-ups") {
      return this.handleFollowUp(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleGetState(): Promise<Response> {
    const session = await this.readSession();

    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    return Response.json(session);
  }

  private async handleInitialize(request: Request): Promise<Response> {
    const init = (await request.json()) as HumanModeSessionInit;
    const sessionId = this.state.id.toString();
    const now = new Date().toISOString();

    const draft: HumanModeSessionState = {
      id: sessionId,
      createdAt: now,
      updatedAt: now,
      url: init.url,
      locale: init.locale,
      status: "analyzing",
      page: null,
      guide: null,
      followUps: [],
      error: null,
    };

    await this.writeSession(draft);

    // Run analysis in the background — return immediately so the user gets redirected fast
    if (this.env.AI) {
      this.state.waitUntil(
        analyzePageForHumanMode(init, this.env)
          .then(async (analysis) => {
            const ready: HumanModeSessionState = {
              ...draft,
              updatedAt: new Date().toISOString(),
              status: "ready",
              page: analysis.page,
              guide: analysis.guide,
              guideSource: analysis.guideSource,
              error: analysis.aiError ?? null,
            };
            await this.writeSession(ready);
          })
          .catch(async (error) => {
            const failed: HumanModeSessionState = {
              ...draft,
              updatedAt: new Date().toISOString(),
              status: "error",
              error: error instanceof Error ? error.message : "Analysis failed.",
            };
            await this.writeSession(failed);
          })
      );
    }

    // Return draft immediately — session page auto-refreshes until ready
    return Response.json(draft);
  }

  private async handleStoreAnalysis(request: Request): Promise<Response> {
    const session = await this.readSession();
    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    const body = (await request.json()) as
      | { ok: true; analysis: AnalysisResult }
      | { ok: false; error: string };

    if (body.ok) {
      const ready: HumanModeSessionState = {
        ...session,
        updatedAt: new Date().toISOString(),
        status: "ready",
        page: body.analysis.page,
        guide: body.analysis.guide,
        guideSource: body.analysis.guideSource,
      };
      await this.writeSession(ready);
      return Response.json(ready);
    }

    const failed: HumanModeSessionState = {
      ...session,
      updatedAt: new Date().toISOString(),
      status: "error",
      error: body.error,
    };
    await this.writeSession(failed);
    return Response.json(failed, { status: 500 });
  }

  private async handleFollowUp(request: Request): Promise<Response> {
    const body = (await request.json()) as { question?: string; answer?: string };
    const question = body.question?.trim();
    const answer = body.answer?.trim();

    if (!question || !answer) {
      return Response.json({ error: "Question and answer are required." }, { status: 400 });
    }

    const session = await this.readSession();
    if (!session) {
      return Response.json({ error: "Session not found." }, { status: 404 });
    }

    const followUp: FollowUpItem = {
      id: crypto.randomUUID(),
      question,
      answer,
      createdAt: new Date().toISOString(),
    };

    const nextState: HumanModeSessionState = {
      ...session,
      updatedAt: new Date().toISOString(),
      followUps: [...session.followUps, followUp],
    };

    await this.writeSession(nextState);
    return Response.json(nextState);
  }

  private async readSession(): Promise<HumanModeSessionState | null> {
    return (
      (await this.state.storage.get<HumanModeSessionState>(STORAGE_KEY)) ?? null
    );
  }

  private async writeSession(session: HumanModeSessionState): Promise<void> {
    await this.state.storage.put(STORAGE_KEY, session);
  }
}
