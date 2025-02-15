import { bigint, pgEnum, pgTable, serial, text } from "drizzle-orm/pg-core";

export const cellOptionsType = pgEnum("cellOptionsType", [
  //Field settings
  "setting:custom",
  "setting:approve",
  "setting:approveCustom",
  // Field errors
  "error:multipleOptions",
  "error:missingValue",
  "error:needsApproval",
  // Field data
  "data:customValue",
  "data:customApprovalThreshold",
  "data:lastApprovedValue",
]);

export function cellOptionsTable(name: string) {
  return pgTable(
    name,
    {
      id: serial("id").primaryKey(),
      // ROW REFERENCE
      // COLUMN
      type: cellOptionsType("type").notNull(),
      data: text("data"), // JSON
      notes: text("notes"),
      created: bigint("lastUpdated", { mode: "number" }).notNull(),
    }
    // INDEXES
  );

  // RELATIONS
}

// Zod validation
