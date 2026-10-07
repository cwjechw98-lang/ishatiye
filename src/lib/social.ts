import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks, eventAttendees, events, guests, interests, messageReactions, messages, reports, venues } from "@/db/schema";
import { ensureSeeded, VENUE_ID } from "@/lib/seed";
import type { ChatMessage, Guest, SocialState } from "@/lib/types";

export const SESSION_COOKIE = "bar_social_session";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export type GuestRow = typeof guests.$inferSelect;

export async function getViewer() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [viewer] = await db.select().from(guests).where(and(eq(guests.sessionToken, hashToken(token)), eq(guests.venueId, VENUE_ID))).limit(1);
  return viewer ?? null;
}

export async function createSession() {
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  const [viewer] = await db.insert(guests).values({
    id, venueId: VENUE_ID, sessionToken: hashToken(token), name: "Саша", age: 27,
    avatar: "/images/sasha.jpg", bio: "Новые люди — лучшие планы на вечер.",
    status: "Открыт к общению", intention: "open", interests: ["Музыка", "Коктейли", "Путешествия"],
    role: "demo_host",
  }).returning();
  // Demo invitations let a visitor try the mutual-interest flow without simulated replies.
  await db.insert(interests).values([{ fromId: "anya", toId: id }, { fromId: "mark", toId: id }]).onConflictDoNothing();
  return { viewer, token };
}

function publicGuest(guest: GuestRow): Guest {
  return {
    id: guest.id, name: guest.name, age: guest.age, avatar: guest.avatar, bio: guest.bio,
    status: guest.status, intention: guest.intention as Guest["intention"], interests: guest.interests,
    isHere: guest.isHere, hidden: guest.hidden, isDemo: guest.isDemo,
  };
}

export async function getSocialState(viewer: GuestRow | null): Promise<SocialState> {
  await ensureSeeded();
  const [venueRows, allGuests, messageRows, eventRows, attendeeRows, interestRows, blockRows, reactionRows, reportRows, messageTotals] = await Promise.all([
    db.select().from(venues).where(eq(venues.id, VENUE_ID)),
    db.select().from(guests).where(eq(guests.venueId, VENUE_ID)).orderBy(guests.createdAt),
    db.select().from(messages).where(and(eq(messages.venueId, VENUE_ID), viewer
      ? or(isNull(messages.recipientId), eq(messages.guestId, viewer.id), eq(messages.recipientId, viewer.id))
      : isNull(messages.recipientId))).orderBy(desc(messages.createdAt)).limit(250),
    db.select().from(events).where(eq(events.venueId, VENUE_ID)).orderBy(events.startsAt),
    db.select().from(eventAttendees),
    db.select().from(interests),
    viewer ? db.select().from(blocks).where(or(eq(blocks.fromId, viewer.id), eq(blocks.toId, viewer.id))) : Promise.resolve([]),
    db.select().from(messageReactions),
    viewer?.role === "demo_host" ? db.select().from(reports).orderBy(desc(reports.createdAt)).limit(50) : Promise.resolve([]),
    db.select({ total: count() }).from(messages).where(and(eq(messages.venueId, VENUE_ID), isNull(messages.recipientId))),
  ]);
  const byId = new Map(allGuests.map((guest) => [guest.id, guest]));
  const excluded = new Set(blockRows.map((row) => row.fromId === viewer?.id ? row.toId : row.fromId));
  const recentlyActive = (guest: GuestRow) => guest.isDemo || guest.lastSeen.getTime() > Date.now() - 15 * 60 * 1000;
  const present = allGuests.filter((guest) => guest.isHere && !guest.hidden && recentlyActive(guest) && !excluded.has(guest.id));
  const available = new Set(allGuests.filter((guest) => !guest.hidden && !excluded.has(guest.id)).map((guest) => guest.id));
  const incoming = interestRows.filter((row) => row.toId === viewer?.id && available.has(row.fromId)).map((row) => row.fromId);
  const outgoing = interestRows.filter((row) => row.fromId === viewer?.id && available.has(row.toId)).map((row) => row.toId);
  const matchIds = incoming.filter((id) => outgoing.includes(id));
  const transformMessage = (row: typeof messages.$inferSelect): ChatMessage => {
    const author = byId.get(row.guestId);
    const grouped = new Map<string, { emoji: string; count: number; mine: boolean }>();
    reactionRows.filter((reaction) => reaction.messageId === row.id).forEach((reaction) => {
      const current = grouped.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false };
      current.count++;
      current.mine ||= reaction.guestId === viewer?.id;
      grouped.set(reaction.emoji, current);
    });
    return {
      ...row, createdAt: row.createdAt.toISOString(),
      author: { id: row.guestId, name: author?.name ?? "Гость", avatar: author?.avatar ?? "/images/sasha.jpg", staff: author?.role === "staff" },
      reactions: [...grouped.values()],
    };
  };
  const visibleMessages = messageRows.filter((row) => !excluded.has(row.guestId) && !excluded.has(row.recipientId ?? "")).reverse();
  const pairs = new Set(interestRows.map((row) => `${row.fromId}|${row.toId}`));
  const connections = interestRows.filter((row) => pairs.has(`${row.toId}|${row.fromId}`)).length / 2;
  return {
    me: viewer ? { ...publicGuest(viewer), muted: viewer.muted, canModerate: viewer.role === "demo_host" } : null,
    venue: venueRows[0],
    guests: present.filter((guest) => guest.id !== viewer?.id).map(publicGuest),
    messages: visibleMessages.filter((row) => !row.recipientId).slice(-60).map(transformMessage),
    directMessages: visibleMessages.filter((row) => row.recipientId && matchIds.includes(row.guestId === viewer?.id ? row.recipientId : row.guestId)).map(transformMessage),
    events: eventRows.map((event) => {
      const attendees = attendeeRows.filter((row) => row.eventId === event.id);
      return {
        ...event, startsAt: event.startsAt.toISOString(), attendeeIds: attendees.map((row) => row.guestId),
        attendeeAvatars: attendees.slice(0, 4).map((row) => byId.get(row.guestId)?.avatar ?? "/images/sasha.jpg"),
        joined: attendees.some((row) => row.guestId === viewer?.id),
      };
    }),
    incoming, outgoing, matches: allGuests.filter((guest) => matchIds.includes(guest.id)).map(publicGuest),
    stats: { here: present.length, company: present.filter((guest) => guest.intention === "company").length, messages: messageTotals[0]?.total ?? 0, connections, visits: allGuests.filter((guest) => guest.role !== "staff").length },
    reports: reportRows.map((report) => ({ ...report, targetName: byId.get(report.targetId)?.name ?? "Гость", reporterName: byId.get(report.reporterId)?.name ?? "Гость", createdAt: report.createdAt.toISOString() })),
  };
}
