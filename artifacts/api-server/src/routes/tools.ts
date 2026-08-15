import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, toolsTable } from "@workspace/db";
import { CreateToolBody, UpdateToolParams, UpdateToolBody, DeleteToolParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tools", async (_req, res): Promise<void> => {
  const tools = await db.select().from(toolsTable).orderBy(toolsTable.name);
  res.json(tools);
});

router.post("/tools", async (req, res): Promise<void> => {
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tool] = await db.insert(toolsTable).values(parsed.data).returning();
  res.status(201).json(tool);
});

router.patch("/tools/:id", async (req, res): Promise<void> => {
  const params = UpdateToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tool] = await db
    .update(toolsTable)
    .set(parsed.data)
    .where(eq(toolsTable.id, params.data.id))
    .returning();
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  res.json(tool);
});

router.delete("/tools/:id", async (req, res): Promise<void> => {
  const params = DeleteToolParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [tool] = await db
    .delete(toolsTable)
    .where(eq(toolsTable.id, params.data.id))
    .returning();
  if (!tool) {
    res.status(404).json({ error: "Tool not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
