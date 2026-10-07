import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const venues = pgTable("venues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  description: text("description").notNull(),
  announcement: text("announcement"),
});

export const guests = pgTable("guests", {
  id: text("id").primaryKey(),
  venueId: text("venue_id").notNull().references(() => venues.id),
  sessionToken: text("session_token").unique(),
  name: text("name").notNull(),
  age: integer("age").notNull().default(25),
  avatar: text("avatar").notNull(),
  bio: text("bio").notNull().default(""),
  status: text("status").notNull().default("Открыт к общению"),
  intention: text("intention").notNull().default("open"),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  isHere: boolean("is_here").notNull().default(true),
  hidden: boolean("hidden").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  role: text("role").notNull().default("guest"),
  muted: boolean("muted").notNull().default(false),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  venueId: text("venue_id").notNull().references(() => venues.id),
  guestId: text("guest_id").notNull().references(() => guests.id),
  recipientId: text("recipient_id").references(() => guests.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interests = pgTable("interests", {
  fromId: text("from_id").notNull().references(() => guests.id),
  toId: text("to_id").notNull().references(() => guests.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.fromId, table.toId] })]);

export const messageReactions = pgTable("message_reactions", {
  guestId: text("guest_id").notNull().references(() => guests.id),
  messageId: text("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull(),
}, (table) => [primaryKey({ columns: [table.guestId, table.messageId, table.emoji] })]);

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  venueId: text("venue_id").notNull().references(() => venues.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  category: text("category").notNull(),
  location: text("location").notNull().default("Основной зал"),
  capacity: integer("capacity").notNull().default(50),
});

export const eventAttendees = pgTable("event_attendees", {
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  guestId: text("guest_id").notNull().references(() => guests.id),
}, (table) => [primaryKey({ columns: [table.eventId, table.guestId] })]);

export const blocks = pgTable("blocks", {
  fromId: text("from_id").notNull().references(() => guests.id),
  toId: text("to_id").notNull().references(() => guests.id),
}, (table) => [primaryKey({ columns: [table.fromId, table.toId] })]);

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => guests.id),
  targetId: text("target_id").notNull().references(() => guests.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
