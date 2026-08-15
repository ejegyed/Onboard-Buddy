import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  checkinsTable,
  supervisorsTable,
  associatesTable,
  cohortsTable,
  checkinToolGradesTable,
  toolsTable,
} from "@workspace/db";
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

// Phase availability offsets in days from cohort start date.
// null means always available (no start-date gate).
const PHASE_OFFSETS: Record<string, number | null> = {
  pre_start: null,
  first_day: 0,
  week_1: 1,
  week_2: 8,
  week_3: 15,
  week_4: 22,
};

function getPhaseStartDate(cohortStartDate: string, phase: string): Date | null {
  const offset = PHASE_OFFSETS[phase];
  if (offset === null) return null;
  const d = new Date(cohortStartDate);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
}

async function fetchCheckinWithGrades(checkinId: number) {
  const [row] = await db
    .select({ checkin: checkinsTable, supervisor: supervisorsTable, associate: associatesTable })
    .from(checkinsTable)
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .where(eq(checkinsTable.id, checkinId));
  if (!row) return null;

  const grades = await db
    .select({ grade: checkinToolGradesTable, tool: toolsTable })
    .from(checkinToolGradesTable)
    .leftJoin(toolsTable, eq(checkinToolGradesTable.toolId, toolsTable.id))
    .where(eq(checkinToolGradesTable.checkinId, checkinId));

  return {
    ...row.checkin,
    supervisor: row.supervisor,
    associate: row.associate,
    toolGrades: grades.map((g) => ({ ...g.grade, tool: g.tool })),
  };
}

router.get("/checkins", async (req, res): Promise<void> => {
  const query = ListCheckinsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions: ReturnType<typeof eq>[] = [];
  if (query.data.associateId) conditions.push(eq(checkinsTable.associateId, query.data.associateId));
  if (query.data.supervisorId) conditions.push(eq(checkinsTable.supervisorId, query.data.supervisorId));
  if (query.data.phase) conditions.push(eq(checkinsTable.phase, query.data.phase));

  const rows = await db
    .select({ checkin: checkinsTable, supervisor: supervisorsTable, associate: associatesTable })
    .from(checkinsTable)
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(checkinsTable.createdAt);

  res.json(rows.map((r) => ({ ...r.checkin, supervisor: r.supervisor, associate: r.associate })));
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
  const result = await fetchCheckinWithGrades(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }
  res.json(result);
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

  // Fetch checkin with associate + cohort for validation
  const [row] = await db
    .select({ checkin: checkinsTable, associate: associatesTable, cohort: cohortsTable })
    .from(checkinsTable)
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .leftJoin(cohortsTable, eq(associatesTable.cohortId, cohortsTable.id))
    .where(eq(checkinsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Check-in not found" });
    return;
  }

  // Supervisor role validation: only the assigned supervisor may complete their check-in
  if (row.checkin.supervisorId !== parsed.data.supervisorId) {
    res.status(403).json({
      error: "Only the assigned supervisor can complete this check-in.",
    });
    return;
  }

  // Phase gating: future phases may not be completed yet
  if (row.cohort?.startDate) {
    const phaseStart = getPhaseStartDate(row.cohort.startDate, row.checkin.phase);
    if (phaseStart) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (today < phaseStart) {
        const dateStr = phaseStart.toISOString().split("T")[0];
        res.status(409).json({
          error: `The '${row.checkin.phase}' phase does not start until ${dateStr}.`,
        });
        return;
      }
    }
  }

  // Mark check-in complete
  const [checkin] = await db
    .update(checkinsTable)
    .set({
      status: "completed",
      notes: parsed.data.notes,
      riskStatus: parsed.data.riskStatus,
      completedAt: new Date(),
    })
    .where(eq(checkinsTable.id, params.data.id))
    .returning();

  // Persist tool grades
  if (parsed.data.toolGrades && parsed.data.toolGrades.length > 0) {
    await db.insert(checkinToolGradesTable).values(
      parsed.data.toolGrades.map((tg) => ({
        checkinId: checkin.id,
        toolId: tg.toolId,
        grade: tg.grade,
      }))
    );
  }

  const result = await fetchCheckinWithGrades(checkin.id);
  res.json(result);
});

export default router;
