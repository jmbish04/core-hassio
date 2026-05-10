import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import type { Bindings, Variables } from "../index";

import { actions } from "../../db/schema";

const serviceRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

serviceRouter.post("/:domain/:service", async (c) => {
  const { domain, service } = c.req.param();
  const body = await c.req.json();
  const { entity_id, ...serviceData } = body;

  try {
    const response = await fetch(`${c.env.HOMEASSISTANT_URL}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.env.HA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_id,
        ...serviceData,
      }),
    });

    const db = drizzle(c.env.DB);
    await db.insert(actions).values({
      type: "service_call",
      domain,
      service,
      entityId: entity_id,
      serviceData: serviceData,
      userAgent: c.req.header("user-agent"),
      timestamp: new Date(),
    });

    return c.json(await response.json());
  } catch (_error) {
    return c.json({ error: "Failed to call service" }, 500);
  }
});

export { serviceRouter };
