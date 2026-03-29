import { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";

import type { Route } from "./+types/home";
import { demoSites, localeOptions } from "../../shared/human-mode";
import { initializeSession, runAnalysis } from "../lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Human Mode — Turn confusing websites into calm, spoken guides" },
    {
      name: "description",
      content:
        "Paste any confusing page. Get a calm, spoken guide in the language you understand.",
    },
  ];
}

export function loader() {
  return { demoSites, localeOptions };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawUrl = String(formData.get("url") || "").trim();
  const locale = String(formData.get("locale") || "en");

  if (!rawUrl) {
    return { error: "Paste a URL to get started." };
  }

  try {
    const normalizedUrl = new URL(rawUrl).toString();
    const init = { locale, url: normalizedUrl };
    const { sessionId, status } = await initializeSession(
      context.cloudflare.env,
      init
    );

    if (status === "analyzing") {
      context.cloudflare.ctx.waitUntil(
        runAnalysis(context.cloudflare.env, sessionId, init)
      );
    }

    return redirect(`/sessions/${sessionId}`);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not analyze that page.",
    };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [url, setUrl] = useState("");
  const [locale, setLocale] = useState(() => {
    if (typeof navigator !== "undefined") {
      const lang = navigator.language?.split("-")[0];
      const supported = loaderData.localeOptions.map((o) => o.value);
      if (lang && supported.includes(lang)) return lang;
    }
    return "en";
  });
  const [showLang, setShowLang] = useState(false);
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      {/* Hero */}
      <section className="mx-auto mb-12 max-w-2xl text-center">
        <h1 className="font-display text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.92] tracking-tight text-ink">
          Confused by a website? Paste it here.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg/relaxed text-ink-soft">
          Get a calm, spoken guide that explains what the page actually
          wants — in the language you&nbsp;understand.
        </p>
      </section>

      {/* Form */}
      <section className="mx-auto mb-14 max-w-xl" id="try">
        <Form
          method="post"
          className="flex flex-col gap-4 rounded-3xl border border-line bg-paper-bright/80 p-6 shadow-xl shadow-ink/8 backdrop-blur-lg animate-[rise_500ms_ease_both]"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-ink">
              Paste the confusing URL
            </span>
            <input
              className="w-full rounded-2xl border border-ink/15 bg-white/90 px-4 py-3.5 text-ink placeholder:text-ink-soft/50 transition-all focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent-soft focus:-translate-y-px"
              type="url"
              name="url"
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              required
              value={url}
              autoFocus
            />
          </label>

          {actionData?.error && (
            <p className="text-sm font-medium text-red-700">
              {actionData.error}
            </p>
          )}

          <div className="flex items-center gap-3">
            {showLang ? (
              <select
                className="rounded-full border border-ink/15 bg-white/90 px-4 py-2.5 text-sm text-ink transition-all focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent-soft"
                name="locale"
                onChange={(e) => setLocale(e.target.value)}
                value={locale}
              >
                {loaderData.localeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="button"
                  onClick={() => setShowLang(true)}
                  className="rounded-full border border-line bg-white/70 px-3 py-2 text-xs text-ink-soft transition-colors hover:border-ink/20 hover:text-ink cursor-pointer"
                >
                  {loaderData.localeOptions.find((o) => o.value === locale)
                    ?.label ?? "English"}{" "}
                  &middot; Change
                </button>
              </>
            )}
            <button
              className="flex-1 cursor-pointer rounded-full bg-gradient-to-br from-ink to-ink-soft px-6 py-3 text-base font-bold text-white shadow-lg shadow-ink/15 transition-all hover:-translate-y-px hover:shadow-xl disabled:cursor-wait disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Reading the page..." : "Make it human"}
            </button>
          </div>

          <p className="text-center text-xs text-ink-soft">
            No signup. No tracking. Works on any public page.
          </p>
        </Form>
      </section>

      {/* Before / After */}
      <section className="mx-auto mb-14 max-w-3xl grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-dashed border-ink/15 bg-ink/[0.04] p-5 animate-[rise_500ms_ease_both]">
          <span className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
            The website
          </span>
          <p className="text-[0.92rem]/relaxed italic text-ink-soft">
            &ldquo;Submit Form I-864, Affidavit of Support Under Section 213A
            of the INA, pursuant to &sect;602(d)(2)...&rdquo;
          </p>
        </div>
        <div className="flex items-center justify-center text-2xl text-teal max-md:rotate-90">
          &rarr;
        </div>
        <div className="rounded-2xl border border-teal/30 bg-gradient-to-br from-teal-soft to-paper-bright p-5 animate-[rise_500ms_ease_both]">
          <span className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
            Human Mode
          </span>
          <p className="text-base/relaxed font-medium text-ink">
            Show that you earn enough to support your family member. You need
            your tax return and an employer letter.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section className="mb-14">
        <h2 className="mb-5 text-xl font-bold text-ink">What you get back</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { n: "1", title: "Plain-language overview", desc: "What the page actually asks for, in one calm paragraph." },
            { n: "2", title: "Before-you-start checklist", desc: "Documents and info to gather before touching the form." },
            { n: "3", title: "Confusing parts flagged", desc: "Jargon most people get wrong, explained simply." },
            { n: "4", title: "Spoken voice brief", desc: "A short audio walkthrough. Send it to anyone — just press play." },
          ].map((item) => (
            <div key={item.n} className="rounded-2xl border border-line bg-paper-bright/70 p-4">
              <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 text-sm font-bold text-teal">
                {item.n}
              </span>
              <h3 className="mb-1 text-sm font-bold text-ink">{item.title}</h3>
              <p className="text-xs/relaxed text-ink-soft">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo sites */}
      <section className="mb-14">
        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink-soft">
          Try a real page
        </p>
        <h2 className="mb-5 text-xl font-bold text-ink">
          Pages people find confusing.
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {loaderData.demoSites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => {
                setUrl(site.url);
                setLocale(site.locale);
                document.getElementById("try")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-line bg-paper-bright/80 p-5 text-left shadow-md shadow-ink/5 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-lg hover:border-ink/20 animate-[rise_500ms_ease_both]"
            >
              <span className="w-fit rounded-full border border-line bg-white/80 px-3 py-1 text-xs font-medium text-ink-soft transition-colors group-hover:border-accent/30 group-hover:text-ink">
                {site.category}
              </span>
              <h3 className="text-lg font-bold leading-tight text-ink">{site.title}</h3>
              <p className="text-sm/relaxed text-ink-soft">{site.reason}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-line pt-10 text-center">
        <p className="font-display text-2xl text-ink">
          Built for the people who help the&nbsp;people.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Powered by Cloudflare Workers AI and ElevenLabs. Free and open source.
        </p>
      </footer>
    </main>
  );
}
