import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supervisorRoles = ["director", "manager", "team_lead", "senior_mentor"] as const;
export type SupervisorRole = (typeof supervisorRoles)[number];

export const supervisorsTable = pgTable("supervisors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: supervisorRoles }).notNull(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupervisorSchema = createInsertSchema(supervisorsTable).omit({ id: true, createdAt: true });
export type InsertSupervisor = z.infer<typeof insertSupervisorSchema>;
export type Supervisor = typeof supervisorsTable.$inferSelect;
