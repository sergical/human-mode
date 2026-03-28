import { Form, Link, useNavigation } from "react-router";

import type { Route } from "./+types/session";
import { audienceProfiles } from "../../shared/human-mode";
import { addFollowUp, fetchSession } from "../lib/session.server";

export function meta({ data }: Route.MetaArgs) {
  const session = data?.session;
  return [
    {
      title: session ? `${session.page?.title ?? "Human Mode"} · Human Mode` : "Human Mode Session",
    },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    throw new Response("Missing session ID.", { status: 400 });
  }

  const session = await fetchSession(context.cloudflare.env, sessionId);
  if (!session) {
    throw new Response("Session not found.", { status: 404 });
  }

  return {
    session,
    voiceReady: Boolean(context.cloudflare.env.ELEVENLABS_API_KEY),
  };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    throw new Response("Missing session ID.", { status: 400 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("_intent") || "follow-up");

  if (intent === "follow-up") {
    const question = String(formData.get("question") || "").trim();
    if (!question) {
      return { error: "Ask a question to keep the guide moving." };
    }

    await addFollowUp(context.cloudflare.env, sessionId, question);
    return { ok: true };
  }

  return { error: "Unsupported action." };
}

export default function Session({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const session = loaderData.session;
  const guide = session.guide;
  const profile = audienceProfiles[session.profileId];
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("_intent") === "follow-up";

  if (!guide || !session.page) {
    return (
      <main className="page-shell">
        <section className="card card-padded">
          <p className="eyebrow">Human Mode</p>
          <h1 className="display-title">This guide is still warming up.</h1>
          <p className="supporting-copy">
            The session exists, but the page summary has not been written yet.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="session-hero">
        <div className="session-heading">
          <p className="eyebrow">Guide Ready</p>
          <h1 className="display-title session-title">{session.page.title}</h1>
          <p className="supporting-copy">
            Human Mode rewrote this page for <strong>{profile.label}</strong> and
            stored the reasoning in a durable session.
          </p>
        </div>

        <div className="session-meta-card card">
          <div className="meta-row">
            <span className="meta-label">Source</span>
            <span className="meta-value">{new URL(session.page.url).hostname}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Locale</span>
            <span className="meta-value">{session.locale.toUpperCase()}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Capture mode</span>
            <span className="meta-value">{session.page.sourceType}</span>
          </div>
        </div>
      </section>

      <section className="session-grid">
        <article className="card card-padded session-primary">
          <p className="eyebrow">What This Page Is Doing</p>
          <p className="overview-copy">{guide.overview}</p>

          <div className="subsection-grid">
            <section className="sub-card">
              <h2 className="sub-card-title">Before You Start</h2>
              <ul className="bullet-list">
                {guide.beforeYouStart.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="sub-card">
              <h2 className="sub-card-title">What Might Be Confusing</h2>
              <div className="insight-list">
                {guide.whatMightBeConfusing.map((item) => (
                  <article key={item.label} className="insight-item">
                    <h3>{item.label}</h3>
                    <p>{item.explanation}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="sub-card next-steps-card">
            <h2 className="sub-card-title">Safest Next Steps</h2>
            <ol className="step-list">
              {guide.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        </article>

        <aside className="sidebar-stack">
          <section className="card card-padded">
            <p className="eyebrow">Voice Brief</p>
            {loaderData.voiceReady ? (
              <>
                <p className="supporting-copy">
                  Generate a short spoken version of the current guide on demand.
                </p>
                <audio className="audio-player" controls preload="none" src={`/audio/${session.id}`} />
              </>
            ) : (
              <>
                <p className="supporting-copy">
                  Add `ELEVENLABS_API_KEY` and optionally `ELEVENLABS_VOICE_ID`
                  to enable the spoken brief.
                </p>
                <code className="inline-config">wrangler secret put ELEVENLABS_API_KEY</code>
              </>
            )}
          </section>

          <section className="card card-padded">
            <p className="eyebrow">Suggested Questions</p>
            <div className="suggestion-list">
              {guide.suggestedQuestions.map((question) => (
                <Form key={question} method="post">
                  <input name="_intent" type="hidden" value="follow-up" />
                  <input name="question" type="hidden" value={question} />
                  <button className="suggestion-chip" type="submit">
                    {question}
                  </button>
                </Form>
              ))}
            </div>
          </section>

          <section className="card card-padded">
            <p className="eyebrow">Capture Notes</p>
            <p className="supporting-copy">
              {session.page.warning ??
                "The page capture looks stable for this public URL."}
            </p>
          </section>
        </aside>
      </section>

      <section className="question-grid">
        <section className="card card-padded">
          <p className="eyebrow">Ask About This Page</p>
          <Form className="question-form" method="post">
            <input name="_intent" type="hidden" value="follow-up" />
            <textarea
              className="question-input"
              defaultValue=""
              name="question"
              placeholder="What should I prepare before starting this form?"
              rows={4}
            />
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Thinking..." : "Ask Human Mode"}
            </button>
          </Form>
        </section>

        <section className="card card-padded">
          <div className="history-header">
            <p className="eyebrow">Follow-Up History</p>
            <Link className="secondary-link" to="/">
              Start another guide
            </Link>
          </div>
          {session.followUps.length === 0 ? (
            <p className="supporting-copy">
              No follow-ups yet. Use one of the suggestions or ask your own.
            </p>
          ) : (
            <div className="qa-list">
              {session.followUps.map((item) => (
                <article key={item.id} className="qa-card">
                  <p className="qa-question">{item.question}</p>
                  <p className="qa-answer">{item.answer}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
