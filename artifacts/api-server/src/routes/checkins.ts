import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, checkinsTable, supervisorsTable, associatesTable, cohortsTable } from "@workspace/db";
import {
  GetCheckinParams,
  UpdateCheckinParams,
  DeleteCheckinParams,
  CompleteCheckinParams,
  CreateCheckinBody,
  UpdateCheckinBody,
  CompleteCheckinBody,
  ListCheckinsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/checkins", async (req, res): Promise<void> => {
  const query = ListCheckinsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let whereClause: ReturnType<typeof and>[] = [];
  if (query.data.associateId) whereClause.push(eq(checkinsTable.associateId, query.data.associateId));
  if (query.data.supervisorId) whereClause.push(eq(checkinsTable.supervisorId, query.data.supervisorId));
  if (query.data.phase) whereClause.push(eq(checkinsTable.phase, query.data.phase));

  const rows = await db
    .select({
      checkin: checkinsTable,
      supervisor: supervisorsTable,
      associate: associatesTable,
    })
    .from(checkinsTable)
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .where(whereClause.length > 0 ? and(...whereClause) : undefined)
    .orderBy(checkinsTable.createdAt);

  res.json(
    rows.map((r) => ({
      ...r.checkin,
      supervisor: r.supervisor,
      associate: r.associate,
    }))
  );
});

router.post("/checkins", async (req, res): Promise<void> => {
  const parsed = CreateCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [checkin] = await db.insert(checkinsTable).values(parsed.data).returning();
  res.status(201).json(checkin);
});

router.get("/checkins/:id", async (req, res): Promise<void> => {
  const params = GetCheckinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select({
      checkin: checkinsTable,
      supervisor: supervisorsTable,
      associate: associatesTable,
    })
    .from(checkinsTable)
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .where(eq(checkinsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }
  res.json({ ...row.checkin, supervisor: row.supervisor, associate: row.associate });
});

router.patch("/checkins/:id", async (req, res): Promise<void> => {
  const params = UpdateCheckinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed" && !updateData.completedAt) {
    updateData.completedAt = new Date();
  }
  const [checkin] = await db
    .update(checkinsTable)
    .set(updateData)
    .where(eq(checkinsTable.id, params.data.id))
    .returning();
  if (!checkin) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }
  res.json(checkin);
});

router.delete("/checkins/:id", async (req, res): Promise<void> => {
  const params = DeleteCheckinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [checkin] = await db
    .delete(checkinsTable)
    .where(eq(checkinsTable.id, params.data.id))
    .returning();
  if (!checkin) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/checkins/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteCheckinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CompleteCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [checkin] = await db
    .update(checkinsTable)
    .set({ status: "completed", notes: parsed.data.notes, completedAt: new Date() })
    .where(eq(checkinsTable.id, params.data.id))
    .returning();
  if (!checkin) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }
  res.json(checkin);
});

export default router;
