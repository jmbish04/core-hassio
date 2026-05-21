import { desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";

import type { Bindings, Variables } from "../index";

import { actions } from "../../db/schema";

const historyRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

historyRouter.get("/actions", async (c) => {
  const db = drizzle(c.env.DB);
  const limit = parseInt(c.req.query("limit") || "100");

  try {
    const result = await db.select().from(actions).orderBy(desc(actions.timestamp)).limit(limit);

    return c.json(result);
  } catch (_error) {
    return c.json({ error: "Failed to fetch action history" }, 500);
  }
});

export { historyRouter };
