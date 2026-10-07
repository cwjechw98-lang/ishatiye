// Run with Node 24: node --experimental-strip-types scripts/demo-test.ts
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type * as Demo from "../src/lib/demo";

const moduleUrl = pathToFileURL(resolve("src/lib/demo.ts")).href;
let revision = 0;
const reload = async (): Promise<typeof Demo> => import(`${moduleUrl}?test=${revision++}`);
const storage = new Map<string, string>();
let rejectWrites = false;
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (rejectWrites) throw new Error("Storage quota exceeded");
    storage.set(key, value);
  },
};
const demo = await reload();
assert.equal(demo.getDemoState().me?.id, "demo-host", "SSR uses deterministic seed");
assert.ok(Object.isFrozen(demo.initialDemoState.me?.interests), "seed is deeply immutable");
await assert.rejects(demo.mutateDemo("enter", {}), /браузере/);
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage, crypto: globalThis.crypto } });

const original = demo.getDemoState();
assert.ok(original.me);
assert.notEqual(original.me.id, "demo-host");
const originalId = original.me.id;
assert.match(original.me.avatar, /^data:image\/svg\+xml/);
assert.ok(original.events.every((event) => event.image.startsWith("data:")));
original.me.name = "External change";
assert.notEqual(demo.getDemoState().me?.name, "External change", "snapshots are isolated");

const me = demo.getDemoState().me!;
const profile = { name: "Тест", age: 28, bio: "О себе", avatar: me.avatar, intention: "company", interests: ["Музыка"], hidden: false };
await demo.mutateDemo("profile", profile);
assert.equal(demo.getDemoState().me?.name, "Тест");
await assert.rejects(demo.mutateDemo("profile", { ...profile, age: 17 }), /18/);
assert.equal(demo.getDemoState().me?.age, 28, "failed mutations do not persist");
await demo.mutateDemo("presence", { isHere: false });
await assert.rejects(demo.mutateDemo("message", { body: "Привет" }), /Я здесь/);
await demo.mutateDemo("enter", {});
await demo.mutateDemo("mute", { muted: true });
assert.equal(demo.getDemoState().me?.muted, true);
await assert.rejects(demo.mutateDemo("message", { body: "Привет", recipientId: "sonya" }), /взаимного/);
const initialMessages = demo.getDemoState().messages.length;
await demo.mutateDemo("message", { body: "Моё сообщение" });
assert.equal(demo.getDemoState().messages.length, initialMessages + 1);
assert.equal(demo.getDemoState().messages.at(-1)?.body, "Моё сообщение");
await assert.rejects(demo.mutateDemo("message", { body: "Слишком быстро" }), /медленнее/);
const messageId = demo.getDemoState().messages.at(-1)!.id;
await demo.mutateDemo("reaction", { messageId, emoji: "💚" });
assert.equal(demo.getDemoState().messages.at(-1)?.reactions[0].mine, true);
await demo.mutateDemo("reaction", { messageId, emoji: "💚" });
assert.equal(demo.getDemoState().messages.at(-1)?.reactions.length, 0);
await assert.rejects(demo.mutateDemo("reaction", { messageId, emoji: "invalid" }), /реакцию/);

let reopened = await reload();
assert.equal(reopened.getDemoState().me?.id, originalId, "browser identity survives module reload");
assert.equal(reopened.getDemoState().messages.at(-1)?.body, "Моё сообщение", "message survives reload");
const eventId = reopened.getDemoState().events[0].id;
await reopened.mutateDemo("rsvp", { eventId });
assert.equal(reopened.getDemoState().events[0].joined, true);
await reopened.mutateDemo("rsvp", { eventId });
assert.equal(reopened.getDemoState().events[0].joined, false);
assert.equal((await reopened.mutateDemo("interest", { targetId: "anya" })).outcome, "match");
assert.equal((await reopened.mutateDemo("interest", { targetId: "sonya" })).outcome, "interest");
assert.equal(reopened.getDemoState().incoming.includes("sonya"), false, "no invented reciprocal interest");
// Move only the persisted sender timestamp, avoiding a sleep for the rate limiter.
const key = [...storage.keys()][0];
const saved = JSON.parse(storage.get(key)!);
saved.state.messages.at(-1).createdAt = "2000-01-01T00:00:00.000Z";
localStorage.setItem(key, JSON.stringify(saved));
await reopened.mutateDemo("message", { body: "Личное сообщение", recipientId: "anya" });
assert.equal(reopened.getDemoState().directMessages.length, 1, "only the sender's message, no fake reply");
await reopened.mutateDemo("report", { targetId: "sonya", reason: "Тестовая жалоба" });
const reportId = reopened.getDemoState().reports[0].id;
await reopened.mutateDemo("moderate", { reportId, hide: true });
assert.equal(reopened.getDemoState().reports[0].status, "resolved");
assert.equal(reopened.getDemoState().guests.some((guest) => guest.id === "sonya"), false);
await reopened.mutateDemo("block", { targetId: "anya" });
assert.equal(reopened.getDemoState().matches.length, 0);
assert.equal(reopened.getDemoState().directMessages.length, 0);
await assert.rejects(reopened.mutateDemo("interest", { targetId: "anya" }), /недоступно/);
await reopened.mutateDemo("announcement", { body: "Тестовое объявление" });
assert.equal(reopened.getDemoState().venue.announcement, "Тестовое объявление");
await reopened.mutateDemo("create-event", { title: "Новый квиз", description: "Описание нового квиза", startsAt: "2030-01-01T18:00:00Z", category: "Квиз", capacity: 2 });
const newEvent = reopened.getDemoState().events.find((event) => event.title === "Новый квиз")!;
assert.ok(newEvent);
assert.equal(newEvent.capacity, 2);
await assert.rejects(reopened.mutateDemo("unknown", {}), /Неизвестное/);

rejectWrites = true;
await reopened.mutateDemo("presence", { isHere: false });
assert.equal(reopened.getDemoState().me?.isHere, false, "quota errors retain session-only changes");
await reopened.mutateDemo("enter", {});
assert.equal(reopened.getDemoState().me?.isHere, true);
rejectWrites = false;
storage.clear();
reopened = await reload();
assert.notEqual(reopened.getDemoState().me?.id, originalId, "fresh browser gets isolated identity/state");
assert.equal(reopened.getDemoState().directMessages.length, 0);
assert.equal(reopened.getDemoState().reports.length, 0);
assert.equal(reopened.getDemoState().me?.name, "Саша");
console.log("demo adapter checks passed: SSR, immutable snapshots, validations, persistence/reload, actions, isolation, no autoresponses, storage fallback");
