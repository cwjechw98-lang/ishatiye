import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { blocks, eventAttendees, events, guests, interests, messageReactions, messages, reports, venues } from "@/db/schema";
import { createSession, getSocialState, getViewer, SESSION_COOKIE } from "@/lib/social";
import { ensureSeeded, VENUE_ID } from "@/lib/seed";

export const dynamic = "force-dynamic";

class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function text(value: unknown, min: number, max: number, label = "Поле") {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new InputError(`${label}: от ${min} до ${max} символов.`);
  return value.trim();
}
function boolean(value: unknown) {
  if (typeof value !== "boolean") throw new InputError("Некорректное значение настройки.");
  return value;
}

export async function GET(request: NextRequest) {
  try {
    await ensureSeeded();
    let viewer = await getViewer();
    let newToken: string | undefined;
    if (!viewer) {
      const session = await createSession();
      viewer = session.viewer;
      newToken = session.token;
    } else {
      const [updated] = await db.update(guests).set({ lastSeen: new Date() }).where(eq(guests.id, viewer.id)).returning();
      viewer = updated;
    }
    const response = NextResponse.json(await getSocialState(viewer), { headers: { "Cache-Control": "private, no-store" } });
    if (newToken) response.cookies.set(SESSION_COOKIE, newToken, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https", maxAge: 60 * 60 * 24 * 30, path: "/" });
    return response;
  } catch (error) {
    console.error("Social state failed", error);
    return NextResponse.json({ error: "Не удалось загрузить пространство. Попробуйте ещё раз." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    const allowedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
    if (origin && new URL(origin).host !== allowedHost && new URL(origin).host !== request.nextUrl.host) throw new InputError("Запрос из другого пространства отклонён.", 403);
    if (Number(request.headers.get("content-length") ?? 0) > 1500000) throw new InputError("Файл слишком большой.", 413);
    let input: Record<string, unknown>;
    try { input = await request.json(); } catch { throw new InputError("Некорректный запрос."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new InputError("Некорректный запрос.");
    const viewer = await getViewer();
    if (!viewer) throw new InputError("Перезагрузите страницу, чтобы войти в пространство.", 401);
    const action = input.action;
    let outcome: string | undefined;
    const canModerate = () => { if (viewer.role !== "demo_host") throw new InputError("Только команда заведения может выполнить это действие.", 403); };
    const target = async () => {
      const id = text(input.targetId, 1, 100);
      if (id === viewer.id) throw new InputError("Выберите другого гостя.");
      const [guest] = await db.select().from(guests).where(and(eq(guests.id, id), eq(guests.venueId, VENUE_ID))).limit(1);
      if (!guest || guest.hidden) throw new InputError("Этот профиль недоступен.", 404);
      return guest;
    };
    const notBlocked = async (id: string) => {
      const rows = await db.select().from(blocks).where(or(and(eq(blocks.fromId, viewer.id), eq(blocks.toId, id)), and(eq(blocks.fromId, id), eq(blocks.toId, viewer.id))));
      if (rows.length) throw new InputError("Взаимодействие с этим гостем недоступно.", 403);
    };
    switch (action) {
      case "profile": {
        const name = text(input.name, 2, 32, "Имя");
        const bio = text(input.bio, 0, 120, "О себе");
        const age = Number(input.age);
        if (!Number.isInteger(age) || age < 18 || age > 99) throw new InputError("BAR SOCIAL — пространство для гостей от 18 лет.");
        const intention = text(input.intention, 1, 20);
        if (!["open", "company", "chill"].includes(intention)) throw new InputError("Выберите настроение на вечер.");
        if (!Array.isArray(input.interests) || input.interests.length > 5 || input.interests.some((value) => typeof value !== "string" || value.length > 24)) throw new InputError("Выберите до 5 интересов.");
        let avatar = viewer.avatar;
        if (input.avatar !== undefined) {
          avatar = text(input.avatar, 1, 1000000, "Фото");
          if (!/^\/images\/[a-z-]+\.jpg$/.test(avatar) && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) throw new InputError("Поддерживаются изображения JPG, PNG и WebP.");
        }
        const status = intention === "company" ? "Ищу компанию" : intention === "chill" ? "На своей волне" : "Открыт к общению";
        await db.update(guests).set({ name, age, bio, intention, status, avatar, interests: input.interests as string[], hidden: boolean(input.hidden), lastSeen: new Date() }).where(eq(guests.id, viewer.id));
        break;
      }
      case "presence":
        await db.update(guests).set({ isHere: boolean(input.isHere), lastSeen: new Date() }).where(eq(guests.id, viewer.id));
        break;
      case "mute":
        await db.update(guests).set({ muted: boolean(input.muted) }).where(eq(guests.id, viewer.id));
        break;
      case "message": {
        if (!viewer.isHere) throw new InputError("Нажмите «Я здесь», чтобы участвовать в чате.");
        const body = text(input.body, 1, 1000, "Сообщение");
        let recipientId: string | null = null;
        if (input.recipientId) {
          recipientId = text(input.recipientId, 1, 100);
          await notBlocked(recipientId);
          const pair = await db.select().from(interests).where(or(and(eq(interests.fromId, viewer.id), eq(interests.toId, recipientId)), and(eq(interests.fromId, recipientId), eq(interests.toId, viewer.id))));
          if (pair.length !== 2) throw new InputError("Личный диалог доступен только после взаимного интереса.", 403);
        }
        const [last] = await db.select().from(messages).where(eq(messages.guestId, viewer.id)).orderBy(desc(messages.createdAt)).limit(1);
        if (last && Date.now() - last.createdAt.getTime() < 700) throw new InputError("Немного медленнее — сообщение уже в пути.", 429);
        await db.insert(messages).values({ id: randomUUID(), venueId: VENUE_ID, guestId: viewer.id, recipientId, body });
        break;
      }
      case "interest": {
        if (!viewer.isHere || viewer.hidden) throw new InputError("Сделайте профиль видимым и отметьтесь «Я здесь», чтобы знакомиться.");
        const guest = await target();
        await notBlocked(guest.id);
        await db.insert(interests).values({ fromId: viewer.id, toId: guest.id }).onConflictDoNothing();
        const reciprocal = await db.select().from(interests).where(and(eq(interests.fromId, guest.id), eq(interests.toId, viewer.id)));
        outcome = reciprocal.length ? "match" : "interest";
        break;
      }
      case "reaction": {
        const messageId = text(input.messageId, 1, 100);
        const emoji = text(input.emoji, 1, 12);
        if (!["💚", "🔥", "🙌", "🥂", "😂", "👋"].includes(emoji)) throw new InputError("Выберите реакцию из списка.");
        const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
        if (!message || message.venueId !== VENUE_ID || (message.recipientId && message.guestId !== viewer.id && message.recipientId !== viewer.id)) throw new InputError("Сообщение недоступно.", 404);
        await notBlocked(message.guestId);
        const condition = and(eq(messageReactions.guestId, viewer.id), eq(messageReactions.messageId, messageId), eq(messageReactions.emoji, emoji));
        const existing = await db.select().from(messageReactions).where(condition);
        if (existing.length) await db.delete(messageReactions).where(condition);
        else await db.insert(messageReactions).values({ guestId: viewer.id, messageId, emoji }).onConflictDoNothing();
        break;
      }
      case "rsvp": {
        const eventId = text(input.eventId, 1, 100);
        await db.transaction(async (tx) => {
          const [event] = await tx.select().from(events).where(and(eq(events.id, eventId), eq(events.venueId, VENUE_ID))).for("update");
          if (!event) throw new InputError("Событие не найдено.", 404);
          const attendees = await tx.select().from(eventAttendees).where(eq(eventAttendees.eventId, eventId));
          if (attendees.some((row) => row.guestId === viewer.id)) await tx.delete(eventAttendees).where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.guestId, viewer.id)));
          else {
            if (attendees.length >= event.capacity) throw new InputError("Все места заняты. Попробуйте другое событие.");
            await tx.insert(eventAttendees).values({ eventId, guestId: viewer.id });
          }
        });
        break;
      }
      case "block": {
        const guest = await target();
        await db.insert(blocks).values({ fromId: viewer.id, toId: guest.id }).onConflictDoNothing();
        break;
      }
      case "report": {
        const guest = await target();
        const reason = text(input.reason, 5, 500, "Причина жалобы");
        await db.insert(reports).values({ id: randomUUID(), reporterId: viewer.id, targetId: guest.id, reason });
        break;
      }
      case "announcement": {
        canModerate();
        const body = text(input.body, 3, 240, "Объявление");
        await db.transaction(async (tx) => {
          await tx.update(venues).set({ announcement: body }).where(eq(venues.id, VENUE_ID));
          await tx.insert(messages).values({ id: randomUUID(), venueId: VENUE_ID, guestId: "mesto-team", body });
        });
        break;
      }
      case "create-event": {
        canModerate();
        const title = text(input.title, 3, 70, "Название");
        const description = text(input.description, 10, 1000, "Описание");
        const startsAt = new Date(text(input.startsAt, 10, 50));
        if (!Number.isFinite(startsAt.getTime())) throw new InputError("Укажите дату и время.");
        const category = text(input.category, 2, 25);
        const capacity = Number(input.capacity);
        if (!Number.isInteger(capacity) || capacity < 2 || capacity > 500) throw new InputError("Количество мест: от 2 до 500.");
        const image = category === "DJ-сет" ? "/images/vinyl.jpg" : category === "Знакомства" ? "/images/cocktails.jpg" : "/images/bar.jpg";
        await db.insert(events).values({ id: randomUUID(), venueId: VENUE_ID, title, description, startsAt, category, capacity, image });
        break;
      }
      case "moderate": {
        canModerate();
        const reportId = text(input.reportId, 1, 100);
        const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
        if (!report) throw new InputError("Жалоба не найдена.", 404);
        await db.transaction(async (tx) => {
          if (input.hide === true) await tx.update(guests).set({ hidden: true }).where(and(eq(guests.id, report.targetId), eq(guests.venueId, VENUE_ID)));
          await tx.update(reports).set({ status: "resolved" }).where(eq(reports.id, reportId));
        });
        break;
      }
      default: throw new InputError("Неизвестное действие.");
    }
    const [updated] = await db.select().from(guests).where(eq(guests.id, viewer.id));
    return NextResponse.json({ state: await getSocialState(updated), outcome }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Social mutation failed", error);
    return NextResponse.json({ error: "Не удалось сохранить. Попробуйте ещё раз." }, { status: 500 });
  }
}
