import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { chats } from "./chats";

export const tickets = sqliteTable(
  "appointments",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    user_id: text("user_id").notNull(),
    location_id: text("location_id").notNull(),
    date_time: integer("date_time", { mode: "timestamp" }).notNull(),
    duration: integer("duration").notNull(),
    status: text("status", {
      enum: ["reserved", "confirmed", "canceled"],
    }).notNull(),
    additional_comments: text("additional_comments"),
    price: real("price"),
    reminders_enabled: integer("reminders_enabled", { mode: 'boolean' }),
  },
  (table) => ({
    status_index: index("status_index").on(table.status),
    user_id_index: index("user_id_index").on(table.status),
    location_id_index: index("location_id_index").on(table.status),
  }),
);

export const ticketsRelations = relations(tickets, ({ many }) => ({
  tickets: many(chats),
}));

export type Ticket = typeof tickets.$inferSelect;
