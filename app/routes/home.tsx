import { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";

import type { Route } from "./+types/home";
import {
  audienceProfileList,
  demoSites,
  localeOptions,
  type AudienceProfileId,
} from "../../shared/human-mode";
import { initializeSession, runAnalysis } from "../lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Human Mode — Turn confusing websites into calm, spoken guides" },
    {
      name: "description",
      content:
        "Paste any government, healthcare, or immigration page. Get a calm, plain-language guide with a spoken brief — in the language your family understands.",
    },
  ];
}

export function loader() {
  return { demoSites, localeOptions, profiles: audienceProfileList };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawUrl = String(formData.get("url") || "").trim();
  const profileId = String(formData.get("profileId") || "older_parent");
  const locale = String(formData.get("locale") || "en");

  if (!rawUrl) {
    return { error: "Paste a public URL to get started." };
  }

  try {
    const normalizedUrl = new URL(rawUrl).toString();
    const init = {
      locale,
      profileId: profileId as AudienceProfileId,
      url: normalizedUrl,
    };
    const { sessionId, status } = await initializeSession(
      context.cloudflare.env,
      init
    );

    // Only run background analysis if DO didn't handle it (local dev without env.AI)
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
          : "Human Mode could not analyze that page.",
    };
  }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [url, setUrl] = useState("");
  const [profileId, setProfileId] = useState<AudienceProfileId>("older_parent");
  const [locale, setLocale] = useState("en");
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
      {/* ---- Hero ---- */}
      <section className="mx-auto mb-14 max-w-2xl text-center">
        <h1 className="font-display text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.92] tracking-tight text-ink">
          Government websites weren't designed for&nbsp;humans.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg/relaxed text-ink-soft">
          Paste any confusing page. Get a calm, spoken guide — in the language
          your family&nbsp;understands.
        </p>
      </section>

      {/* ---- Before / After ---- */}
      <section className="mb-14 grid grid-cols-1 items-stretch gap-5 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-2xl border border-dashed border-ink/15 bg-ink/[0.04] p-6 animate-[rise_500ms_ease_both]">
          <span className="mb-3 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
            What the website says
          </span>
          <p className="text-sm/relaxed italic text-ink-soft">
            Submit Form I-864, Affidavit of Support Under Section 213A of the
            INA, to establish that an intending immigrant has adequate means of
            financial support and is not likely to become a public charge
            pursuant to &sect;602(d)(2) of the Immigration Act of 1990.
          </p>
        </div>

        <div className="flex items-center justify-center text-3xl font-light text-teal max-md:rotate-90">
          &rarr;
        </div>

        <div className="rounded-2xl border border-teal/30 bg-gradient-to-br from-teal-soft to-paper-bright p-6 animate-[rise_500ms_ease_both]">
          <span className="mb-3 block text-[0.7rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
            What Human Mode says
          </span>
          <p className="text-[1.05rem]/relaxed font-medium text-ink">
            Step 1: Show that you earn enough to support your family member. You
            will need your most recent tax return and a letter from your
            employer. Here is how to fill it out, one field at a time.
          </p>
        </div>
      </section>

      {/* ---- Form ---- */}
      <section className="mx-auto mb-14 max-w-2xl" id="try">
        <Form
          method="post"
          className="flex flex-col gap-5 rounded-3xl border border-line bg-paper-bright/80 p-6 shadow-xl shadow-ink/8 backdrop-blur-lg animate-[rise_500ms_ease_both]"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-ink">Paste a confusing URL</span>
            <input
              className="w-full rounded-2xl border border-ink/15 bg-white/90 px-4 py-3.5 text-ink placeholder:text-ink-soft/50 transition-all focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent-soft focus:-translate-y-px"
              type="url"
              name="url"
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.canada.ca/en/immigration..."
              required
              value={url}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-ink">Who is this for?</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {loaderData.profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:-translate-y-px ${
                    p.id === profileId
                      ? "border-accent/40 bg-gradient-to-b from-accent-soft to-white/90 shadow-sm"
                      : "border-line bg-white/60 hover:border-ink/20"
                  }`}
                >
                  <span className="text-sm font-bold text-ink">{p.label}</span>
                  <span className="text-xs/snug text-ink-soft">{p.caption}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="profileId" value={profileId} />
          </div>

          {actionData?.error && (
            <p className="text-sm font-medium text-red-700">{actionData.error}</p>
          )}

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">Language</span>
              <select
                className="rounded-full border border-ink/15 bg-white/90 px-4 py-2.5 text-sm text-ink transition-all focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent-soft"
                name="locale"
                onChange={(e) => setLocale(e.target.value)}
                value={locale}
              >
                {loaderData.localeOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
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

      {/* ---- What you get ---- */}
      <section className="mb-14">
        <h2 className="mb-5 text-xl font-bold text-ink">What you will get back</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "\u270E", title: "Plain-language overview", desc: "What this page is actually asking for, in one calm paragraph." },
            { icon: "\u2713", title: "Before-you-start checklist", desc: "Documents, IDs, and info to gather before you touch the form." },
            { icon: "\u26A0", title: "Confusing parts flagged", desc: "The fields and jargon most people get wrong, explained simply." },
            { icon: "\u25B6", title: "Spoken voice brief", desc: "A 2-minute audio walkthrough you can send to anyone. Just press play." },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-line bg-paper-bright/70 p-5"
            >
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-base">
                {item.icon}
              </span>
              <h3 className="mb-1 font-bold text-ink">{item.title}</h3>
              <p className="text-sm/relaxed text-ink-soft">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Demo sites ---- */}
      <section className="mb-14">
        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink-soft">
          Try a real page
        </p>
        <h2 className="mb-5 text-xl font-bold text-ink">
          Pages that make people call their kids for help.
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loaderData.demoSites.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => {
                setUrl(site.url);
                setProfileId(site.recommendedProfileId);
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

      {/* ---- Footer ---- */}
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
