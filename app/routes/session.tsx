import { useCallback, useEffect, useRef, useState } from "react";
import { Form, Link, useNavigation, useRevalidator } from "react-router";

import type { Route } from "./+types/session";
import { audienceProfiles } from "../../shared/human-mode";
import { addFollowUp, fetchSession } from "../lib/session.server";
import {
  AudioPlayerProvider,
  AudioPlayerButton,
  AudioPlayerProgress,
  AudioPlayerTime,
  AudioPlayerDuration,
} from "~/components/ui/audio-player";

export function meta({ data }: Route.MetaArgs) {
  const session = data?.session;
  return [
    {
      title: session
        ? `${session.page?.title ?? "Guide"} · Human Mode`
        : "Human Mode",
    },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const sessionId = params.sessionId;
  if (!sessionId) throw new Response("Missing session ID.", { status: 400 });

  const env = context.cloudflare.env;
  const session = await fetchSession(env, sessionId);
  if (!session) throw new Response("Session not found.", { status: 404 });

  return { session, voiceReady: Boolean(env.ELEVENLABS_API_KEY) };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const sessionId = params.sessionId;
  if (!sessionId) throw new Response("Missing session ID.", { status: 400 });

  const formData = await request.formData();
  const intent = String(formData.get("_intent") || "follow-up");

  if (intent === "follow-up") {
    const question = String(formData.get("question") || "").trim();
    if (!question) return { error: "Ask a question to keep going." };
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
      <main className="mx-auto w-full max-w-2xl px-5 py-12">
        <header>
          <Link
            to="/"
            className="mb-4 inline-block text-sm font-semibold text-ink-soft no-underline hover:text-ink"
          >
            &larr; New guide
          </Link>
          <h1 className="font-display text-4xl leading-none tracking-tight text-ink">
            Reading the page...
          </h1>
          <p className="mt-3 text-base/relaxed text-ink-soft">
            Give it a moment. The guide will appear here automatically.
          </p>
        </header>
        <div className="mt-8 h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full w-2/5 rounded-full bg-teal animate-[slide_1.5s_ease-in-out_infinite]" />
        </div>
        <AutoRefresh />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12">
      <article>
        {/* Header */}
        <header className="mb-10">
          <Link
            to="/"
            className="mb-4 inline-block text-sm font-semibold text-ink-soft no-underline hover:text-ink"
          >
            &larr; New guide
          </Link>
          <h1 className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-[1] tracking-tight text-ink">
            {session.page.title}
          </h1>
          <p className="mt-3 text-sm text-ink-soft">
            From {new URL(session.page.url).hostname} &middot;{" "}
            {profile.label} mode
          </p>
        </header>

        {/* Voice Brief */}
        {loaderData.voiceReady && (
          <section className="mb-10 rounded-2xl border border-teal/25 bg-gradient-to-br from-teal-soft to-paper-bright p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-soft">
              Voice brief
            </p>
            <AudioPlayerProvider>
              <div className="flex items-center gap-3">
                <AudioPlayerButton
                  item={{
                    id: session.id,
                    src: `/audio/${session.id}`,
                  }}
                />
                <AudioPlayerProgress className="flex-1" />
                <AudioPlayerTime className="text-xs text-ink-soft tabular-nums" />
                <span className="text-xs text-ink-soft/50">/</span>
                <AudioPlayerDuration className="text-xs text-ink-soft tabular-nums" />
              </div>
            </AudioPlayerProvider>
          </section>
        )}

        {/* Overview */}
        <p className="mb-8 text-lg/relaxed text-ink">
          {guide.overview}
        </p>

        {/* Before You Start */}
        <section className="mb-8">
          <h2 className="mb-3 text-base font-bold text-ink">Before you start</h2>
          <ul className="list-disc space-y-1 pl-5 text-ink-soft leading-relaxed">
            {guide.beforeYouStart.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Watch out for */}
        {guide.whatMightBeConfusing.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-base font-bold text-ink">Watch out for</h2>
            <div className="space-y-3">
              {guide.whatMightBeConfusing.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border-l-[3px] border-l-accent bg-accent/[0.05] p-4 text-sm/relaxed text-ink-soft"
                >
                  <strong className="text-ink">{item.label}</strong>
                  <span> &mdash; {item.explanation}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Next Steps */}
        <section className="mb-8">
          <h2 className="mb-3 text-base font-bold text-ink">Your next steps</h2>
          <ol className="list-decimal space-y-1 pl-6 text-ink-soft leading-relaxed">
            {guide.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <hr className="my-10 border-t border-line" />

        {/* Follow-up Q&A */}
        <section className="mb-8">
          <h2 className="mb-4 text-base font-bold text-ink">
            Have a question about this page?
          </h2>

          {guide.suggestedQuestions.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {guide.suggestedQuestions.map((question) => (
                <Form key={question} method="post">
                  <input name="_intent" type="hidden" value="follow-up" />
                  <input name="question" type="hidden" value={question} />
                  <button
                    type="submit"
                    className="cursor-pointer rounded-full border border-line bg-white/80 px-4 py-2 text-sm text-ink transition-all hover:-translate-y-px hover:border-accent/40 hover:shadow-sm"
                  >
                    {question}
                  </button>
                </Form>
              ))}
            </div>
          )}

          <QuestionForm
            isSubmitting={isSubmitting}
            voiceReady={loaderData.voiceReady}
          />
        </section>

        {/* Follow-up History */}
        {session.followUps.length > 0 && (
          <section className="space-y-4">
            {session.followUps.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-line bg-white/60 p-4"
              >
                <p className="mb-1 text-sm font-bold text-ink">{item.question}</p>
                <p className="text-sm/relaxed text-ink-soft">{item.answer}</p>
              </div>
            ))}
          </section>
        )}
      </article>
    </main>
  );
}

function QuestionForm({
  isSubmitting,
  voiceReady,
}: {
  isSubmitting: boolean;
  voiceReady: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const scribeRef = useRef<{ stop: () => void } | null>(null);

  const startListening = useCallback(async () => {
    try {
      const res = await fetch("/api/scribe-token");
      const { token } = (await res.json()) as { token: string };

      const { Scribe } = await import("@elevenlabs/client");
      const scribe = new Scribe();
      scribeRef.current = scribe;

      setListening(true);
      setTranscript("");

      await scribe.start({
        token,
        onPartialTranscript: (data: { text: string }) => {
          setTranscript(data.text);
        },
        onCommittedTranscript: (data: { text: string }) => {
          setQuestion((prev) => (prev + " " + data.text).trim());
          setTranscript("");
        },
      });
    } catch (error) {
      console.warn("Speech input failed:", error);
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    scribeRef.current?.stop();
    scribeRef.current = null;
    setListening(false);
    if (transcript) {
      setQuestion((prev) => (prev + " " + transcript).trim());
      setTranscript("");
    }
  }, [transcript]);

  return (
    <Form className="flex flex-col gap-3" method="post" ref={formRef}>
      <input name="_intent" type="hidden" value="follow-up" />
      <textarea
        className="resize-none rounded-xl border border-ink/15 bg-white/90 p-3 text-sm text-ink placeholder:text-ink-soft/50 transition-colors focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent-soft"
        name="question"
        placeholder={listening ? "Listening..." : "Type or speak your question..."}
        rows={2}
        value={listening ? question + (transcript ? " " + transcript : "") : question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className="flex items-center gap-2">
        {voiceReady && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={`flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 transition-all ${
              listening
                ? "border-accent bg-accent/10 text-accent animate-pulse"
                : "border-line bg-white/80 text-ink-soft hover:-translate-y-px hover:border-accent/40"
            }`}
            title={listening ? "Stop recording" : "Speak your question"}
          >
            {listening ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect width="14" height="14" rx="2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
            <span className="hidden text-xs sm:inline">
              {listening ? "Stop" : "Speak"}
            </span>
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || (!question && !transcript)}
          className="cursor-pointer whitespace-nowrap rounded-full bg-gradient-to-br from-ink to-ink-soft px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-ink/10 transition-all hover:-translate-y-px disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting ? "..." : "Ask"}
        </button>
      </div>
    </Form>
  );
}

function AutoRefresh() {
  const revalidator = useRevalidator();

  useEffect(() => {
    const interval = setInterval(() => {
      if (revalidator.state === "idle") {
        revalidator.revalidate();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [revalidator]);

  return null;
}
