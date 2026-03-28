# Human Mode Design

## Goal

Build an AI-powered web app that helps someone get through a confusing public webpage or form without needing a family member on the phone. The product should feel useful first, then impressive.

## User Story

Someone pastes a difficult website, chooses the person they are helping, and gets a calmer version of that page:

- what this page is trying to do
- what to prepare before starting
- which words or choices are easy to misunderstand
- what the safest next step is
- an optional spoken brief

## Approaches Considered

### 1. Chrome extension

Best for authenticated portals and true in-page overlays, but too much install friction for a hackathon MVP and harder to demo in 60 seconds.

### 2. Chatbot-first app

Fast to scaffold, but it drifts into "another agent" and weakens the story. The UX becomes prompt-first instead of guidance-first.

### 3. Hosted Worker app with session memory

Best trade-off for the hackathon. A public web app is easy to demo, easy to deploy, and keeps the product centered on comprehension instead of generic chat. This is the chosen approach.

## Chosen Architecture

- Cloudflare Worker serves the React Router app
- One Durable Object per session stores the page summary, guide, and follow-up questions
- Workers AI generates the structured guide when available
- ElevenLabs generates an on-demand spoken brief from the guide
- Browser Rendering is declared in Wrangler and intentionally left as the next enhancement for dynamic pages and screenshots

## Data Flow

1. User submits a URL, audience profile, and language.
2. The app creates a Durable Object session.
3. The session loads the page, extracts usable context, and asks Workers AI for a grounded guide.
4. The session stores the result and returns a session page.
5. The session page supports follow-up questions and optional TTS playback.

## MVP Scope

- Public pages only
- Three hero audience presets: older parent, ESL support, healthcare helper
- Demo sites preloaded for passport, benefits, USCIS, and healthcare
- Spoken brief via ElevenLabs TTS
- Follow-up Q&A grounded in the stored guide

## Risks

- Plain HTML fetch will miss highly dynamic pages until Browser Rendering is added
- Workers AI response format may vary, so the scaffold needs a fallback guide path
- TTS requires an ElevenLabs API key and a usable voice configuration

## Immediate Next Steps

1. Swap `workers/browser.ts` to Browser Rendering plus screenshot capture.
2. Add explicit translated guide output rather than locale-only prompting.
3. Add a "send this to someone else" share flow with dubbed audio or translated text.
