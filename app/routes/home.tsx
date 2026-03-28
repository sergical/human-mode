import { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router";

import type { Route } from "./+types/home";
import {
  audienceProfileList,
  demoSites,
  localeOptions,
  type AudienceProfileId,
} from "../../shared/human-mode";
import { initializeSession } from "../lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Human Mode" },
    {
      name: "description",
      content:
        "Turn hard public websites into calmer, plain-language step-by-step guides with Cloudflare and ElevenLabs.",
    },
  ];
}

export function loader() {
  return {
    demoSites,
    localeOptions,
    profiles: audienceProfileList,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const rawUrl = String(formData.get("url") || "").trim();
  const profileId = String(formData.get("profileId") || "older_parent");
  const locale = String(formData.get("locale") || "en");

  if (!rawUrl) {
    return { error: "Paste a public URL to build the first Human Mode guide." };
  }

  try {
    const normalizedUrl = new URL(rawUrl).toString();
    const sessionId = await initializeSession(context.cloudflare.env, {
      locale,
      profileId: profileId as AudienceProfileId,
      url: normalizedUrl,
    });

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

export default function Home({
  loaderData,
}: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [url, setUrl] = useState(loaderData.demoSites[0]?.url ?? "");
  const [profileId, setProfileId] = useState<AudienceProfileId>(
    loaderData.demoSites[0]?.recommendedProfileId ?? "older_parent"
  );
  const [locale, setLocale] = useState(loaderData.demoSites[0]?.locale ?? "en");

  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="hero-column">
          <p className="eyebrow">Hackathon Concept</p>
          <h1 className="display-title">
            Give someone you love a calmer way through hard websites.
          </h1>
          <p className="supporting-copy hero-copy">
            Human Mode takes a public page, explains what it is actually asking
            for, highlights the easy-to-miss parts, and turns the result into a
            spoken brief when ElevenLabs is configured.
          </p>
          <div className="badge-row">
            <span className="badge-pill">Cloudflare Worker</span>
            <span className="badge-pill">Durable session memory</span>
            <span className="badge-pill">Optional ElevenLabs brief</span>
          </div>
        </div>

        <Form method="post" className="card launch-card">
          <div className="card-header">
            <p className="eyebrow">Start A Guide</p>
            <p className="card-lead">
              Pick a real public page and the person you are helping.
            </p>
          </div>

          <label className="field-group">
            <span className="field-label">Website URL</span>
            <input
              className="text-field"
              type="url"
              name="url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://travel.state.gov/..."
              required
              value={url}
            />
          </label>

          <div className="field-group">
            <span className="field-label">Who is this for?</span>
            <div className="choice-grid">
              {loaderData.profiles.map((profile) => (
                <button
                  key={profile.id}
                  className={
                    profile.id === profileId
                      ? "choice-card choice-card-active"
                      : "choice-card"
                  }
                  onClick={() => setProfileId(profile.id)}
                  type="button"
                >
                  <span className="choice-title">{profile.label}</span>
                  <span className="choice-caption">{profile.caption}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="profileId" value={profileId} />
          </div>

          <label className="field-group">
            <span className="field-label">Guide language</span>
            <select
              className="select-field"
              name="locale"
              onChange={(event) => setLocale(event.target.value)}
              value={locale}
            >
              {loaderData.localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {actionData?.error ? (
            <p className="form-error">{actionData.error}</p>
          ) : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Building your guide..." : "Launch Human Mode"}
          </button>
        </Form>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Suggested Demo Pages</p>
          <h2 className="section-title">Use public sites that already feel high-friction.</h2>
        </div>

        <div className="demo-grid">
          {loaderData.demoSites.map((site) => (
            <button
              key={site.id}
              className="card demo-card"
              onClick={() => {
                setUrl(site.url);
                setProfileId(site.recommendedProfileId);
                setLocale(site.locale);
              }}
              type="button"
            >
              <div className="demo-meta">
                <span className="demo-category">{site.category}</span>
                <span className="demo-cta">Use this site</span>
              </div>
              <h3 className="demo-title">{site.title}</h3>
              <p className="demo-url">{site.url}</p>
              <p className="demo-reason">{site.reason}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block story-grid">
        <div className="card card-padded story-card">
          <p className="eyebrow">Why It Feels New</p>
          <h3 className="story-title">It is not another agent.</h3>
          <p className="supporting-copy">
            The interface is built around comprehension, not prompting. The app
            answers, "What is this page asking for and how do I safely continue?"
          </p>
        </div>

        <div className="card card-padded story-card">
          <p className="eyebrow">Why It Feels Useful</p>
          <h3 className="story-title">Real pages. Real pressure.</h3>
          <p className="supporting-copy">
            Passport renewals, benefits, healthcare, and immigration pages all
            create stakes before a user ever logs in or pays.
          </p>
        </div>

        <div className="card card-padded story-card">
          <p className="eyebrow">Why It Feels Social</p>
          <h3 className="story-title">A product you can film in 10 seconds.</h3>
          <p className="supporting-copy">
            Show the impossible page first. Then show Human Mode translate it
            into one clear action and a spoken brief for the person you are
            helping.
          </p>
        </div>
      </section>
    </main>
  );
}
