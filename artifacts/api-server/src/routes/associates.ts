import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, associatesTable, supervisorsTable, cohortsTable, checkinsTable, onboardingPhases } from "@workspace/db";
import {
  GetAssociateParams,
  UpdateAssociateParams,
  DeleteAssociateParams,
  GetAssociateProgressParams,
  CreateAssociateBody,
  UpdateAssociateBody,
  ListAssociatesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/associates", async (req, res): Promise<void> => {
  const query = ListAssociatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let qb = db
    .select({
      associate: associatesTable,
      cohort: cohortsTable,
      director: {
        id: supervisorsTable.id,
        name: supervisorsTable.name,
        email: supervisorsTable.email,
        role: supervisorsTable.role,
        title: supervisorsTable.title,
        createdAt: supervisorsTable.createdAt,
      },
    })
    .from(associatesTable)
    .leftJoin(cohortsTable, eq(associatesTable.cohortId, cohortsTable.id))
    .leftJoin(supervisorsTable, eq(associatesTable.directorId, supervisorsTable.id));

  const rows = query.data.cohortId
    ? await qb.where(eq(associatesTable.cohortId, query.data.cohortId)).orderBy(associatesTable.name)
    : await qb.orderBy(associatesTable.name);

  // Hydrate all supervisors for each associate
  const associateIds = rows.map((r) => r.associate.id);
  if (associateIds.length === 0) {
    res.json([]);
    return;
  }

  const allAssociates = await db.select().from(associatesTable).orderBy(associatesTable.name);
  const allSupervisors = await db.select().from(supervisorsTable);
  const allCohorts = await db.select().from(cohortsTable);

  const filteredAssociates = query.data.cohortId
    ? allAssociates.filter((a) => a.cohortId === query.data.cohortId)
    : allAssociates;

  const hydrated = filteredAssociates.map((a) => ({
    ...a,
    cohort: allCohorts.find((c) => c.id === a.cohortId) ?? null,
    director: allSupervisors.find((s) => s.id === a.directorId) ?? null,
    manager: allSupervisors.find((s) => s.id === a.managerId) ?? null,
    teamLead: allSupervisors.find((s) => s.id === a.teamLeadId) ?? null,
    seniorMentor: allSupervisors.find((s) => s.id === a.seniorMentorId) ?? null,
  }));

  res.json(hydrated);
});

router.post("/associates", async (req, res): Promise<void> => {
  const parsed = CreateAssociateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [associate] = await db.insert(associatesTable).values(parsed.data).returning();
  res.status(201).json(associate);
});

router.get("/associates/:id", async (req, res): Promise<void> => {
  const params = GetAssociateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [associate] = await db
    .select()
    .from(associatesTable)
    .where(eq(associatesTable.id, params.data.id));
  if (!associate) {
    res.status(404).json({ error: "Associate not found" });
    return;
  }
  const allSupervisors = await db.select().from(supervisorsTable);
  const [cohort] = await db.select().from(cohortsTable).where(eq(cohortsTable.id, associate.cohortId));

  res.json({
    ...associate,
    cohort: cohort ?? null,
    director: allSupervisors.find((s) => s.id === associate.directorId) ?? null,
    manager: allSupervisors.find((s) => s.id === associate.managerId) ?? null,
    teamLead: allSupervisors.find((s) => s.id === associate.teamLeadId) ?? null,
    seniorMentor: allSupervisors.find((s) => s.id === associate.seniorMentorId) ?? null,
  });
});

router.patch("/associates/:id", async (req, res): Promise<void> => {
  const params = UpdateAssociateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAssociateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [associate] = await db
    .update(associatesTable)
    .set(parsed.data)
    .where(eq(associatesTable.id, params.data.id))
    .returning();
  if (!associate) {
    res.status(404).json({ error: "Associate not found" });
    return;
  }
  res.json(associate);
});

router.delete("/associates/:id", async (req, res): Promise<void> => {
  const params = DeleteAssociateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [associate] = await db
    .delete(associatesTable)
    .where(eq(associatesTable.id, params.data.id))
    .returning();
  if (!associate) {
    res.status(404).json({ error: "Associate not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/associates/:id/progress", async (req, res): Promise<void> => {
  const params = GetAssociateProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [associate] = await db
    .select()
    .from(associatesTable)
    .where(eq(associatesTable.id, params.data.id));
  if (!associate) {
    res.status(404).json({ error: "Associate not found" });
    return;
  }

  const checkins = await db
    .select({
      checkin: checkinsTable,
      supervisor: supervisorsTable,
    })
    .from(checkinsTable)
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .where(eq(checkinsTable.associateId, params.data.id));

  const phaseProgress = onboardingPhases.map((phase) => {
    const phaseCheckins = checkins.filter((c) => c.checkin.phase === phase);
    const completed = phaseCheckins.filter((c) => c.checkin.status === "completed");
    return {
      phase,
      completedCount: completed.length,
      totalCount: phaseCheckins.length,
      checkins: phaseCheckins.map((c) => ({
        ...c.checkin,
        supervisor: c.supervisor,
      })),
    };
  });

  const totalCheckins = checkins.length;
  const completedCheckins = checkins.filter((c) => c.checkin.status === "completed").length;

  res.json({
    associateId: associate.id,
    totalCheckins,
    completedCheckins,
    overallPercent: totalCheckins > 0 ? Math.round((completedCheckins / totalCheckins) * 100) : 0,
    phases: phaseProgress,
  });
});

export default router;
