import { Anthropic } from "@anthropic-ai/sdk";
import { desc, eq, and, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import type { Bindings, Variables } from "../index";

import { actions, metrics } from "../../db/schema";

const agentRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const tools = [
  {
    name: "turn_light",
    description: "Turn a light on or off",
    inputSchema: {
      type: "object",
      properties: {
        entity_id: { type: "string", description: "e.g. light.living_room" },
        state: { type: "string", enum: ["on", "off"] },
        brightness: { type: "number", description: "0-255" },
      },
      required: ["entity_id", "state"],
    },
  },
  {
    name: "set_climate",
    description: "Set temperature and mode",
    inputSchema: {
      type: "object",
      properties: {
        entity_id: { type: "string" },
        temperature: { type: "number" },
        hvac_mode: { type: "string", enum: ["heat", "cool", "off", "auto"] },
      },
      required: ["entity_id", "temperature", "hvac_mode"],
    },
  },
  {
    name: "get_action_history",
    description: "Get user action history for context",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number" },
        entity_filter: { type: "string", description: "Filter by entity (optional)" },
      },
    },
  },
  {
    name: "get_metrics",
    description: "Get historical metrics (energy, temperature, etc)",
    inputSchema: {
      type: "object",
      properties: {
        metric_type: { type: "string", enum: ["energy", "temperature", "humidity"] },
        hours: { type: "number" },
      },
      required: ["metric_type"],
    },
  },
] as const;

async function processToolCall(toolName: string, toolInput: Record<string, any>, env: Bindings) {
  switch (toolName) {
    case "turn_light": {
      const { entity_id, state, brightness } = toolInput;
      const response = await fetch(`${env.HOMEASSISTANT_URL}/api/services/light/turn_${state}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.HA_TOKEN}` },
        body: JSON.stringify({
          entity_id,
          ...(brightness && { brightness: Math.round((brightness / 100) * 255) }),
        }),
      });
      return JSON.stringify(await response.json());
    }
    case "get_action_history": {
      const db = drizzle(env.DB);
      const limit = toolInput.limit || 20;
      let query = db.select().from(actions).orderBy(desc(actions.timestamp)).limit(limit);

      if (toolInput.entity_filter) {
        query = db
          .select()
          .from(actions)
          .where(eq(actions.entityId, toolInput.entity_filter))
          .orderBy(desc(actions.timestamp))
          .limit(limit);
      }

      const result = await query;

      const actionCounts: Record<string, number> = {};
      result.forEach((action) => {
        const key = `${action.domain}:${action.service}`;
        actionCounts[key] = (actionCounts[key] || 0) + 1;
      });
      return JSON.stringify({
        actions: result.slice(0, 5),
        action_counts: actionCounts,
      });
    }
    case "get_metrics": {
      const db = drizzle(env.DB);
      const hours = toolInput.hours || 24;
      const date = new Date();
      date.setHours(date.getHours() - hours);

      const result = await db
        .select()
        .from(metrics)
        .where(and(eq(metrics.type, toolInput.metric_type), gte(metrics.timestamp, date)))
        .orderBy(desc(metrics.timestamp));

      if (result.length === 0) return JSON.stringify({ error: "No data" });

      const values = result.map((r) => r.value).filter((v): v is number => v !== null);
      if (values.length === 0) return JSON.stringify({ error: "No numeric data" });

      return JSON.stringify({
        current: values[0],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        trend: values[0] > values[values.length - 1] ? "up" : "down",
      });
    }
    default:
      return JSON.stringify({ error: "Unknown tool" });
  }
}

agentRouter.post("/", async (c) => {
  const { messages } = await c.req.json();
  const client = new Anthropic({
    apiKey: c.env.ANTHROPIC_API_KEY,
  });

  let conversationMessages = messages;

  while (true) {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 1024,
      tools: tools as any, // type assertion for simplified usage
      messages: conversationMessages,
      system: `You are a helpful home automation assistant. You help users control their smart home devices
               and provide insights about their energy usage and home automation patterns.

               When a user asks you to do something, use the available tools. Always be proactive about
               getting action history and metrics to provide better context and suggestions.`,
    });

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block) => block.type === "tool_use",
      ) as Array<Anthropic.ToolUseBlock>;

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await processToolCall(toolUse.name, toolUse.input, c.env);
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: result,
          };
        }),
      );

      conversationMessages = [
        ...conversationMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    } else {
      const textBlocks = response.content.filter(
        (block) => block.type === "text",
      ) as Array<Anthropic.TextBlock>;
      return c.json({
        message: textBlocks.map((b) => b.text).join("\n"),
        stop_reason: response.stop_reason,
      });
    }
  }
});

export { agentRouter };
