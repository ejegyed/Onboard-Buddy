import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, cohortsTable } from "@workspace/db";
import {
  GetCohortParams,
  UpdateCohortParams,
  DeleteCohortParams,
  CreateCohortBody,
  UpdateCohortBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cohorts", async (req, res): Promise<void> => {
  const cohorts = await db
    .select()
    .from(cohortsTable)
    .orderBy(cohortsTable.startDate);
  res.json(cohorts);
});

router.post("/cohorts", async (req, res): Promise<void> => {
  const parsed = CreateCohortBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cohort] = await db.insert(cohortsTable).values(parsed.data).returning();
  res.status(201).json(cohort);
});

router.get("/cohorts/:id", async (req, res): Promise<void> => {
  const params = GetCohortParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cohort] = await db
    .select()
    .from(cohortsTable)
    .where(eq(cohortsTable.id, params.data.id));
  if (!cohort) {
    res.status(404).json({ error: "Cohort not found" });
    return;
  }
  res.json(cohort);
});

router.patch("/cohorts/:id", async (req, res): Promise<void> => {
  const params = UpdateCohortParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCohortBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cohort] = await db
    .update(cohortsTable)
    .set(parsed.data)
    .where(eq(cohortsTable.id, params.data.id))
    .returning();
  if (!cohort) {
    res.status(404).json({ error: "Cohort not found" });
    return;
  }
  res.json(cohort);
});

router.delete("/cohorts/:id", async (req, res): Promise<void> => {
  const params = DeleteCohortParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cohort] = await db
    .delete(cohortsTable)
    .where(eq(cohortsTable.id, params.data.id))
    .returning();
  if (!cohort) {
    res.status(404).json({ error: "Cohort not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
