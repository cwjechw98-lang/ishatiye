import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { and, eq, inArray, or } from "drizzle-orm";
import { db, pool } from "@/db";
import { blocks, eventAttendees, events, guests, interests, messageReactions, messages, reports, venues } from "@/db/schema";
import type { SocialState } from "@/lib/types";

async function main() {
  const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  await mkdir(".artifacts", { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors: string[] = [];
  const testGuestIds: string[] = [];
  const testEventIds: string[] = [];
  let originalAnnouncement: string | null | undefined;
  page.on("pageerror", (error) => errors.push(error.message));
  async function state() { const response = await context.request.get(`${base}/api/social`); assert.equal(response.status(), 200); return await response.json() as SocialState; }
  async function post(action: string, data: Record<string, unknown> = {}) { return context.request.post(`${base}/api/social`, { data: { action, ...data } }); }
  async function closeDialog() { await page.getByRole("button", { name: "Закрыть окно", exact: true }).click(); }
  try {
    // Clean up the authenticated API smoke-test visitor, if present.
    try {
      const headers = await readFile("/tmp/bar-social-headers.txt", "utf8");
      const cookie = headers.match(/set-cookie: ([^;]+)/i)?.[1];
      if (cookie) {
        const response = await fetch(`${base}/api/social`, { headers: { cookie } });
        const data = await response.json() as SocialState;
        if (data.me) testGuestIds.push(data.me.id);
        await fetch(`${base}/api/social`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ action: "presence", isHere: false }) });
      }
    } catch { /* Optional first-run smoke-test session. */ }
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>(".presence-button")?.disabled);
    const initial = await state();
    assert.ok(initial.me); testGuestIds.push(initial.me.id);
    originalAnnouncement = initial.venue.announcement;
    assert.ok(initial.guests.length >= 23);
    assert.equal(await page.locator(".guest-card").count(), 6);
    await page.screenshot({ path: ".artifacts/desktop.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Desktop should not overflow");
    if (process.env.SCREENSHOTS_ONLY === "1") {
      await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
      await page.screenshot({ path: ".artifacts/mobile.png", fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Mobile should not overflow");
      console.log("Screenshots captured. No horizontal overflow.");
      return;
    }
    // Real profile update and persistence after navigation.
    await page.getByRole("button", { name: "Настроить профиль", exact: true }).click();
    await page.getByLabel("Как тебя зовут").fill("Саша · тест");
    await page.getByLabel("Пара слов о себе").fill("Проверяем хороший вечер.");
    await page.getByRole("button", { name: "Сохранить профиль", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    assert.equal((await state()).me?.name, "Саша · тест");
    console.log("PASS profile update and persistence");
    // Discovery and filtering.
    await page.getByRole("button", { name: "Найти компанию", exact: true }).click();
    assert.ok(await page.locator(".guest-card").count() >= 10);
    await page.getByRole("button", { name: "Фильтры гостей", exact: true }).click();
    await page.getByRole("button", { name: "Технологии", exact: true }).click();
    await page.getByRole("button", { name: "Показать гостей", exact: true }).click();
    assert.equal(await page.locator(".guest-card").count(), 1);
    console.log("PASS interest and intention filters");
    // Mutual interest is required for direct messaging.
    const denied = await post("message", { body: "Must not be sent", recipientId: "lera" });
    assert.equal(denied.status(), 403);
    await page.locator(".main-nav").first().getByRole("button", { name: /Знакомства/ }).click();
    await page.getByRole("button", { name: /Вам симпатизируют/ }).first().click();
    await page.getByRole("button", { name: "Ответить взаимностью", exact: true }).first().click();
    await page.getByRole("heading", { name: "Это взаимно!", exact: true }).waitFor();
    await page.screenshot({ path: ".artifacts/match.png" });
    await page.getByRole("button", { name: "Начать разговор", exact: true }).last().click();
    await page.getByRole("textbox", { name: "Текст сообщения", exact: true }).fill("Привет! Рад знакомству 👋");
    await page.getByRole("button", { name: "Отправить сообщение", exact: true }).click();
    await page.getByText("Привет! Рад знакомству 👋", { exact: true }).waitFor();
    await closeDialog();
    assert.ok((await state()).directMessages.some((message) => message.body === "Привет! Рад знакомству 👋"));
    console.log("PASS mutual interest, matching, and private messaging authorization");
    // Common room chat and reactions.
    await page.locator(".main-nav").first().getByRole("button", { name: "Общий чат", exact: true }).click();
    await page.getByRole("textbox", { name: "Текст сообщения", exact: true }).fill("Тест: всем хорошего вечера! 🥂");
    await page.waitForTimeout(750);
    await page.getByRole("button", { name: "Отправить сообщение", exact: true }).click();
    await page.getByText("Тест: всем хорошего вечера! 🥂", { exact: true }).waitFor();
    assert.ok((await state()).messages.some((message) => message.body.startsWith("Тест:")));
    const reaction = await post("reaction", { messageId: "welcome-2", emoji: "💚" });
    assert.equal(reaction.status(), 200);
    assert.ok((await state()).messages.find((message) => message.id === "welcome-2")?.reactions.some((item) => item.emoji === "💚" && item.mine));
    console.log("PASS public messages and reactions");
    // Event RSVP is durable, reversible, and duplicate safe.
    await page.locator(".main-nav").first().getByRole("button", { name: /События/ }).click();
    await page.getByRole("button", { name: "Я иду", exact: true }).first().click();
    await page.getByRole("button", { name: /Вы в списке/ }).first().waitFor();
    assert.equal((await state()).events[0].joined, true);
    await page.reload({ waitUntil: "networkidle" });
    assert.ok(await page.getByRole("button", { name: /Вы в списке/ }).count());
    await page.getByRole("button", { name: /Вы в списке/ }).first().click();
    await page.getByRole("button", { name: "Я иду", exact: true }).first().waitFor();
    assert.equal((await state()).events[0].joined, false);
    console.log("PASS event RSVP, reload persistence, and cancellation");
    // QR creation is local and links to this origin.
    await page.getByRole("button", { name: "Пригласить друзей", exact: true }).first().click();
    await page.locator(".qr-card img").waitFor();
    assert.ok((await page.locator(".qr-card img").getAttribute("src"))?.startsWith("data:image/png"));
    assert.equal(await page.getByRole("textbox", { name: "Ссылка на пространство" }).inputValue(), `${base}/?venue=mesto`);
    await closeDialog();
    console.log("PASS downloadable QR invitation");
    // Host demo: create an event and publish an announcement.
    await page.getByRole("button", { name: "Панель заведения", exact: true }).click();
    await page.getByRole("button", { name: "Создать событие", exact: true }).first().click();
    await page.getByLabel("Название события").fill("Тестовый вечер");
    await page.getByLabel("О чём этот вечер").fill("Проверка создания события в пространстве.");
    await page.getByRole("button", { name: "Опубликовать событие", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    const created = (await state()).events.find((event) => event.title === "Тестовый вечер");
    assert.ok(created); testEventIds.push(created.id);
    await page.getByRole("button", { name: "Сообщение гостям", exact: true }).click();
    await page.getByLabel("Сообщение гостям").fill("Тестовое объявление команды бара.");
    await page.getByRole("button", { name: "Отправить гостям", exact: true }).click();
    await page.waitForFunction(() => !document.querySelector("dialog[open]"));
    assert.equal((await state()).venue.announcement, "Тестовое объявление команды бара.");
    console.log("PASS host event publishing and announcements");
    // Safety mechanisms and invalid-input checks.
    assert.equal((await post("profile", { name: "x", age: 10 })).status(), 400);
    assert.equal((await post("report", { targetId: "lera", reason: "Тестовая жалоба для проверки модерации" })).status(), 200);
    const report = (await state()).reports.find((item) => item.reason.startsWith("Тестовая жалоба"));
    assert.ok(report);
    assert.equal((await post("moderate", { reportId: report.id, hide: false })).status(), 200);
    assert.equal((await post("block", { targetId: "lera" })).status(), 200);
    assert.equal((await state()).guests.some((guest) => guest.id === "lera"), false);
    assert.equal((await post("interest", { targetId: "lera" })).status(), 403);
    assert.equal((await post("presence", { isHere: false })).status(), 200);
    assert.equal((await post("message", { body: "Should not send while absent" })).status(), 400);
    assert.equal((await post("presence", { isHere: true })).status(), 200);
    console.log("PASS reporting, moderation, blocking, presence, and validation");
    // Mobile navigation and layout.
    await page.goto(base, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: ".artifacts/mobile.png", fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Mobile should not overflow");
    await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
    await page.locator(".sidebar").getByRole("button", { name: "Правила сообщества", exact: true }).click();
    await page.getByRole("heading", { name: "Здесь хорошо каждому", exact: true }).waitFor();
    assert.equal(await page.locator(".sidebar.is-open").count(), 0);
    await page.setViewportSize({ width: 360, height: 780 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log("PASS responsive layouts and mobile navigation");
    assert.deepEqual(errors, [], "No client-side runtime errors");
    console.log("ALL BROWSER AND API CHECKS PASSED");
  } catch (error) {
    await page.screenshot({ path: ".artifacts/failure.png", fullPage: true });
    await writeFile(".artifacts/browser-errors.json", JSON.stringify(errors, null, 2));
    throw error;
  } finally {
    await browser.close();
    if (testGuestIds.length) {
      await db.transaction(async (tx) => {
        await tx.delete(messageReactions).where(inArray(messageReactions.guestId, testGuestIds));
        await tx.delete(messages).where(or(inArray(messages.guestId, testGuestIds), inArray(messages.recipientId, testGuestIds)));
        await tx.delete(interests).where(or(inArray(interests.fromId, testGuestIds), inArray(interests.toId, testGuestIds)));
        await tx.delete(blocks).where(or(inArray(blocks.fromId, testGuestIds), inArray(blocks.toId, testGuestIds)));
        await tx.delete(reports).where(or(inArray(reports.reporterId, testGuestIds), inArray(reports.targetId, testGuestIds)));
        await tx.delete(eventAttendees).where(inArray(eventAttendees.guestId, testGuestIds));
        await tx.delete(guests).where(inArray(guests.id, testGuestIds));
        if (testEventIds.length) await tx.delete(events).where(inArray(events.id, testEventIds));
        if (originalAnnouncement !== undefined) await tx.update(venues).set({ announcement: originalAnnouncement }).where(eq(venues.id, "mesto"));
        await tx.delete(messages).where(and(eq(messages.guestId, "mesto-team"), eq(messages.body, "Тестовое объявление команды бара.")));
      });
    }
    await pool.end();
    console.log("Test fixtures cleaned up through Drizzle.");
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
