import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cohortsTable } from "./cohorts";
import { supervisorsTable } from "./supervisors";

export const associatesTable = pgTable("associates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  cohortId: integer("cohort_id").notNull().references(() => cohortsTable.id),
  directorId: integer("director_id").references(() => supervisorsTable.id),
  managerId: integer("manager_id").references(() => supervisorsTable.id),
  teamLeadId: integer("team_lead_id").references(() => supervisorsTable.id),
  seniorMentorId: integer("senior_mentor_id").references(() => supervisorsTable.id),
  position: text("position"),
  department: text("department"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAssociateSchema = createInsertSchema(associatesTable).omit({ id: true, createdAt: true });
export type InsertAssociate = z.infer<typeof insertAssociateSchema>;
export type Associate = typeof associatesTable.$inferSelect;
