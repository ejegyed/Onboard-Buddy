import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { checkinsTable } from "./checkins";
import { toolsTable } from "./tools";

export const toolGradeValues = ["below_expectations", "meets_expectations", "exceeds_expectations"] as const;
export type ToolGradeValue = (typeof toolGradeValues)[number];

export const checkinToolGradesTable = pgTable("checkin_tool_grades", {
  id: serial("id").primaryKey(),
  checkinId: integer("checkin_id")
    .notNull()
    .references(() => checkinsTable.id, { onDelete: "cascade" }),
  toolId: integer("tool_id")
    .notNull()
    .references(() => toolsTable.id, { onDelete: "cascade" }),
  grade: text("grade", { enum: toolGradeValues }).notNull(),
});

export type CheckinToolGrade = typeof checkinToolGradesTable.$inferSelect;
