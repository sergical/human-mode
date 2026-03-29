import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sessions/:sessionId", "routes/session.tsx"),
  route("audio/:sessionId", "routes/audio.ts"),
  route("api/scribe-token", "routes/api.scribe-token.ts"),
] satisfies RouteConfig;
