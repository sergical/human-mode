declare namespace Cloudflare {
  interface Env {
    ELEVENLABS_API_KEY?: string;
    ELEVENLABS_MODEL_ID?: string;
    ELEVENLABS_VOICE_ID?: string;
    HUMAN_MODE_MODEL?: string;
  }
}

interface Env extends Cloudflare.Env {}
