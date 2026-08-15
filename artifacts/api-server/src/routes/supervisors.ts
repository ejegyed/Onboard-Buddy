import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, supervisorsTable } from "@workspace/db";
import {
  GetSupervisorParams,
  UpdateSupervisorParams,
  DeleteSupervisorParams,
  CreateSupervisorBody,
  UpdateSupervisorBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/supervisors", async (req, res): Promise<void> => {
  const supervisors = await db
    .select()
    .from(supervisorsTable)
    .orderBy(supervisorsTable.name);
  res.json(supervisors);
});

router.post("/supervisors", async (req, res): Promise<void> => {
  const parsed = CreateSupervisorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [supervisor] = await db.insert(supervisorsTable).values(parsed.data).returning();
  res.status(201).json(supervisor);
});

router.get("/supervisors/:id", async (req, res): Promise<void> => {
  const params = GetSupervisorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [supervisor] = await db
    .select()
    .from(supervisorsTable)
    .where(eq(supervisorsTable.id, params.data.id));
  if (!supervisor) {
    res.status(404).json({ error: "Supervisor not found" });
    return;
  }
  res.json(supervisor);
});

router.patch("/supervisors/:id", async (req, res): Promise<void> => {
  const params = UpdateSupervisorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSupervisorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [supervisor] = await db
    .update(supervisorsTable)
    .set(parsed.data)
    .where(eq(supervisorsTable.id, params.data.id))
    .returning();
  if (!supervisor) {
    res.status(404).json({ error: "Supervisor not found" });
    return;
  }
  res.json(supervisor);
});

router.delete("/supervisors/:id", async (req, res): Promise<void> => {
  const params = DeleteSupervisorParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [supervisor] = await db
    .delete(supervisorsTable)
    .where(eq(supervisorsTable.id, params.data.id))
    .returning();
  if (!supervisor) {
    res.status(404).json({ error: "Supervisor not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
