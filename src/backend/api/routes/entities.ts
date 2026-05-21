import { Hono } from "hono";

import type { Bindings, Variables } from "../index";

const entitiesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

entitiesRouter.get("/:entity_id", async (c) => {
  const { entity_id } = c.req.param();

  try {
    const response = await fetch(`${c.env.HOMEASSISTANT_URL}/api/states/${entity_id}`, {
      headers: { Authorization: `Bearer ${c.env.HA_TOKEN}` },
    });

    if (!response.ok) {
      return c.json({ error: "Failed to fetch entity" }, response.status);
    }
    const data = await response.json();

    return c.json(data);
  } catch (_error) {
    return c.json({ error: "Failed to fetch entity" }, 500);
  }
});

export { entitiesRouter };
