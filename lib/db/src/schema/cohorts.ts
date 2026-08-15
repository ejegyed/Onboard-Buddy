import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cohortsTable = pgTable("cohorts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCohortSchema = createInsertSchema(cohortsTable).omit({ id: true, createdAt: true });
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Cohort = typeof cohortsTable.$inferSelect;
