import { createRequestHandler } from "react-router";
import { HumanModeSession } from "./session-do";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      ctx: ExecutionContext;
      env: Env;
    };
  }
}

export { HumanModeSession };

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
