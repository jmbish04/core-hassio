/**
 * @fileoverview Main Hono API router
 */

import type { D1Database, Ai } from "@cloudflare/workers-types";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { agentRouter } from "./routes/agent";
import { aiRouter } from "./routes/ai";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { documentsRouter } from "./routes/documents";
import { entitiesRouter } from "./routes/entities";
import { healthRouter } from "./routes/health";
import { historyRouter } from "./routes/history";
import { notificationsRouter } from "./routes/notifications";
import { openapiRouter } from "./routes/openapi";
import { serviceRouter } from "./routes/service";
import { threadsRouter } from "./routes/threads";

export type Bindings = {
  DB: D1Database;
  AI: Ai;
  AI_GATEWAY_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  HOMEASSISTANT_URL?: string;
  HA_TOKEN?: string;
  HA_RELAY: any; // Durable Object namespace
  ANTHROPIC_API_KEY?: string;
};

export type Variables = {
  userId?: number;
  user?: {
    id: number;
    email: string;
    name: string;
  };
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/api/ping", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Mount existing routers
app.route("/api/auth", authRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/threads", threadsRouter);
app.route("/api/health", healthRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/ai", aiRouter);
app.route("/api/documents", documentsRouter);
app.route("/", openapiRouter);

// Mount new Smart Home routers
app.route("/api/service", serviceRouter);
app.route("/api/entities", entitiesRouter);
app.route("/api/history", historyRouter);
app.route("/api/chat", agentRouter);

// WebSocket upgrade for HA Relay
app.get("/ws", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket", 400);
  }

  const id = c.env.HA_RELAY.idFromName("default");
  const stub = c.env.HA_RELAY.get(id);

  return stub.fetch(c.req.raw);
});

export { app };
