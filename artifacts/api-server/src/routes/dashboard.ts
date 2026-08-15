import { Router, type IRouter } from "express";
import { eq, count, and } from "drizzle-orm";
import { db, cohortsTable, supervisorsTable, associatesTable, checkinsTable, onboardingPhases } from "@workspace/db";
import { GetCohortDashboardParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [cohortCount] = await db.select({ count: count() }).from(cohortsTable);
  const [associateCount] = await db.select({ count: count() }).from(associatesTable);
  const [supervisorCount] = await db.select({ count: count() }).from(supervisorsTable);
  const [totalCheckins] = await db.select({ count: count() }).from(checkinsTable);
  const [completedCheckins] = await db
    .select({ count: count() })
    .from(checkinsTable)
    .where(eq(checkinsTable.status, "completed"));

  const total = totalCheckins.count;
  const completed = completedCheckins.count;
  const pending = total - completed;

  const recentlyCompleted = await db
    .select({
      checkin: checkinsTable,
      supervisor: supervisorsTable,
      associate: associatesTable,
    })
    .from(checkinsTable)
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .where(eq(checkinsTable.status, "completed"))
    .orderBy(checkinsTable.completedAt)
    .limit(5);

  res.json({
    totalCohorts: cohortCount.count,
    totalAssociates: associateCount.count,
    totalSupervisors: supervisorCount.count,
    totalCheckins: total,
    completedCheckins: completed,
    pendingCheckins: pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    recentlyCompleted: recentlyCompleted.map((r) => ({
      ...r.checkin,
      supervisor: r.supervisor,
      associate: r.associate,
    })),
  });
});

router.get("/dashboard/cohort/:cohortId", async (req, res): Promise<void> => {
  const params = GetCohortDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cohort] = await db
    .select()
    .from(cohortsTable)
    .where(eq(cohortsTable.id, params.data.cohortId));
  if (!cohort) {
    res.status(404).json({ error: "Cohort not found" });
    return;
  }

  const associates = await db
    .select()
    .from(associatesTable)
    .where(eq(associatesTable.cohortId, params.data.cohortId));

  const allSupervisors = await db.select().from(supervisorsTable);
  const associateIds = associates.map((a) => a.id);

  const allCheckins =
    associateIds.length > 0
      ? await db
          .select({
            checkin: checkinsTable,
            supervisor: supervisorsTable,
          })
          .from(checkinsTable)
          .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
          .where(
            associateIds.length === 1
              ? eq(checkinsTable.associateId, associateIds[0])
              : undefined
          )
      : [];

  // Filter manually if multiple associates
  const filteredCheckins =
    associateIds.length > 1
      ? allCheckins.filter((c) => associateIds.includes(c.checkin.associateId))
      : allCheckins;

  const associatesProgress = associates.map((associate) => {
    const associateCheckins = filteredCheckins.filter((c) => c.checkin.associateId === associate.id);
    const phaseProgress = onboardingPhases.map((phase) => {
      const phaseCheckins = associateCheckins.filter((c) => c.checkin.phase === phase);
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

    const total = associateCheckins.length;
    const completedTotal = associateCheckins.filter((c) => c.checkin.status === "completed").length;

    return {
      associateId: associate.id,
      totalCheckins: total,
      completedCheckins: completedTotal,
      overallPercent: total > 0 ? Math.round((completedTotal / total) * 100) : 0,
      phases: phaseProgress,
    };
  });

  const totalCheckins = filteredCheckins.length;
  const completedCheckins = filteredCheckins.filter((c) => c.checkin.status === "completed").length;

  res.json({
    cohort,
    totalAssociates: associates.length,
    associates: associatesProgress,
    totalCheckins,
    completedCheckins,
    completionRate: totalCheckins > 0 ? Math.round((completedCheckins / totalCheckins) * 100) : 0,
  });
});

router.get("/dashboard/pending-checkins", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      checkin: checkinsTable,
      associate: associatesTable,
      supervisor: supervisorsTable,
      cohort: cohortsTable,
    })
    .from(checkinsTable)
    .leftJoin(associatesTable, eq(checkinsTable.associateId, associatesTable.id))
    .leftJoin(supervisorsTable, eq(checkinsTable.supervisorId, supervisorsTable.id))
    .leftJoin(cohortsTable, eq(associatesTable.cohortId, cohortsTable.id))
    .where(eq(checkinsTable.status, "pending"))
    .orderBy(checkinsTable.createdAt);

  res.json(
    rows.map((r) => ({
      id: r.checkin.id,
      associateId: r.checkin.associateId,
      associateName: r.associate?.name ?? "Unknown",
      cohortName: r.cohort?.name ?? "Unknown",
      supervisorId: r.checkin.supervisorId,
      supervisorName: r.supervisor?.name ?? "Unknown",
      supervisorRole: r.checkin.supervisorRole,
      phase: r.checkin.phase,
      createdAt: r.checkin.createdAt,
    }))
  );
});

export default router;
