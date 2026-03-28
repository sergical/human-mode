# Human Mode

Human Mode is a Cloudflare Worker app for the Cloudflare × ElevenLabs hackathon. It turns hard public webpages into calmer, plain-language guidance for people who need slower pacing, clearer wording, or support in another language.

## Current Scaffold

- React Router app served from a Cloudflare Worker
- Durable Object session memory for each analyzed page
- Workers AI hook for guide generation, with a heuristic fallback when AI is not available
- ElevenLabs text-to-speech route for an on-demand spoken brief
- Public-page analysis flow built around URLs like passport renewal, benefits, USCIS, and healthcare pages

## Local Development

```bash
pnpm install --offline
pnpm run dev
```

If your local store does not already have the dependencies, run a normal `pnpm install`.

## Required Cloudflare Setup

1. Create a Worker with the bindings already declared in [wrangler.jsonc](/Users/sergiydybskiy/src/human-mode/wrangler.jsonc).
2. Add an `ELEVENLABS_API_KEY` secret.
3. Optionally override `ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`, or `HUMAN_MODE_MODEL`.

Copy the sample env file if you want local defaults:

```bash
cp .dev.vars.sample .dev.vars
```

## Notes

- `workers/browser.ts` currently uses a direct HTML fetch for the first scaffold. The Browser Rendering binding is already declared so the next upgrade is swapping in a Puppeteer capture for dynamic pages and screenshots.
- `workers/analyze.ts` already tries Workers AI first and falls back to heuristics if the binding or model is unavailable.
- `app/routes/audio.ts` proxies ElevenLabs TTS directly so the UI can play a spoken brief without adding the ElevenLabs SDK on day one.
