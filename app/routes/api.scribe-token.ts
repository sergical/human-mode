import type { Route } from "./+types/api.scribe-token";

export async function loader({ context }: Route.LoaderArgs) {
  const apiKey = context.cloudflare.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "ElevenLabs not configured" }, { status: 503 });
  }

  const response = await fetch(
    "https://api.elevenlabs.io/v1/speech-to-text/get-realtime-token",
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "scribe_v2_realtime",
        ttl_secs: 300,
      }),
    }
  );

  if (!response.ok) {
    return Response.json(
      { error: "Could not get Scribe token" },
      { status: response.status }
    );
  }

  const data = (await response.json()) as { token: string };
  return Response.json({ token: data.token });
}
