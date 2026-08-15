import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { associatesTable } from "./associates";
import { supervisorsTable } from "./supervisors";

export const onboardingPhases = ["pre_start", "first_day", "week_1", "week_2", "week_3", "week_4"] as const;
export type OnboardingPhase = (typeof onboardingPhases)[number];

export const checkinStatuses = ["pending", "completed"] as const;
export type CheckinStatus = (typeof checkinStatuses)[number];

export const riskStatuses = ["low", "medium", "high"] as const;
export type RiskStatus = (typeof riskStatuses)[number];

export const supervisorRolesForCheckin = ["director", "manager", "team_lead", "senior_mentor"] as const;

export const checkinsTable = pgTable("checkins", {
  id: serial("id").primaryKey(),
  associateId: integer("associate_id").notNull().references(() => associatesTable.id, { onDelete: "cascade" }),
  supervisorId: integer("supervisor_id").notNull().references(() => supervisorsTable.id),
  supervisorRole: text("supervisor_role", { enum: supervisorRolesForCheckin }).notNull(),
  phase: text("phase", { enum: onboardingPhases }).notNull(),
  status: text("status", { enum: checkinStatuses }).notNull().default("pending"),
  riskStatus: text("risk_status", { enum: riskStatuses }),
  notes: text("notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCheckinSchema = createInsertSchema(checkinsTable).omit({ id: true, createdAt: true, completedAt: true });
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type Checkin = typeof checkinsTable.$inferSelect;
