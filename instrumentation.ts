import type { Instrumentation } from "next";
import { logServerEvent } from "@/lib/observability/logger";

export function register() {
  logServerEvent("info", "server_started", { runtime: process.env.NEXT_RUNTIME ?? "unknown" });
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logServerEvent("error", "unhandled_request_error", {
    method: request.method,
    path: request.path.split("?", 1)[0],
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  }, error);
};
