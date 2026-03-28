import type { HumanModeSessionState } from "../shared/human-mode";

const DEFAULT_ELEVEN_MODEL = "eleven_multilingual_v2";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function synthesizeSessionBrief(
  session: HumanModeSessionState,
  env: Env
): Promise<Response> {
  if (!env.ELEVENLABS_API_KEY) {
    return Response.json(
      {
        error:
          "Add ELEVENLABS_API_KEY to enable audio brief generation for this route.",
      },
      { status: 503 }
    );
  }

  const script =
    session.guide?.voiceScript ||
    session.guide?.overview ||
    "Human Mode has not finished preparing this page summary yet.";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        accept: "audio/mpeg",
        "content-type": "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: script,
        model_id: env.ELEVENLABS_MODEL_ID ?? DEFAULT_ELEVEN_MODEL,
        output_format: "mp3_44100_128",
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    return Response.json(
      {
        error:
          message ||
          "ElevenLabs did not return audio. Check the API key and voice ID.",
      },
      { status: response.status }
    );
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") ?? "audio/mpeg",
      "cache-control": "private, max-age=0, no-store",
    },
  });
}
