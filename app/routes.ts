import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sessions/:sessionId", "routes/session.tsx"),
  route("audio/:sessionId", "routes/audio.ts"),
] satisfies RouteConfig;
