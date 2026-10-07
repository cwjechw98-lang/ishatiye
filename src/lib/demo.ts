import type { ChatMessage, CurrentGuest, Guest, Intention, MutationResult, SocialState, VenueEvent } from "./types";

// This is an offline sandbox: all people, invitations and historical messages are
// fixtures. Mutations never contact a provider or manufacture another guest's reply.
const STORAGE_KEY = "bar-social:ishatiye:demo:v1";
const svg = (label: string, color = "#315c4b") => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="${color}"/><circle cx="320" cy="190" r="82" fill="#e9d8b4"/><path d="M170 480v-70a150 150 0 0 1 300 0v70" fill="#e9d8b4"/><text x="320" y="220" text-anchor="middle" font-family="sans-serif" font-size="64" fill="${color}">${label}</text></svg>`)}`;
const avatar = (name: string) => svg(name.slice(0, 1).replace(/[<>&"']/g, ""));
const statusFor = (intention: Intention) => intention === "company" ? "Ищу компанию" : intention === "chill" ? "На своей волне" : "Открыт к общению";
const profileData: [string, string, number, Intention, string, string[]][] = [
  ["anya", "Аня", 25, "open", "За хорошей музыкой и спонтанными разговорами ✨", ["Музыка", "Путешествия", "Искусство"]],
  ["mark", "Марк", 28, "company", "Кто за коктейль и партию в настолки?", ["Настолки", "Кино", "Коктейли"]],
  ["sonya", "Соня", 24, "open", "Сегодня в планах танцы. Присоединяйся!", ["Танцы", "Музыка", "Дизайн"]],
  ["danil", "Данил", 27, "company", "Обсудим идеи за бокалом Negroni?", ["Технологии", "Бизнес", "Коктейли"]],
  ["lera", "Лера", 26, "open", "Собираю впечатления, а не планы на вечер", ["Дизайн", "Фотография", "Кино"]],
  ["nikita", "Никита", 29, "company", "Хороший джаз — уже повод познакомиться", ["Джаз", "Путешествия", "Музыка"]],
];
const demoGuests: Guest[] = profileData.map(([id, name, age, intention, bio, interests]) => ({ id, name, age, intention, bio, interests, avatar: avatar(name), status: statusFor(intention), isHere: true, hidden: false, isDemo: true }));
["Алиса", "Артём", "Маша", "Илья", "Полина", "Максим", "Вика", "Денис", "Даша", "Роман", "Ксюша", "Андрей", "Катя", "Олег", "Юля", "Глеб", "Ева"].forEach((name, i) => {
  const intention: Intention = i % 2 === 0 ? "company" : i % 3 === 0 ? "chill" : "open";
  demoGuests.push({ id: `guest-${i + 7}`, name, age: 23 + i % 9, avatar: avatar(name), intention, status: statusFor(intention), bio: "Демонстрационный профиль. Люблю уютные бары и интересные истории.", interests: [["Коктейли", "Музыка"], ["Кино", "Путешествия"], ["Дизайн", "Искусство"], ["Джаз", "Настолки"]][i % 4], isHere: true, hidden: false, isDemo: true });
});
const team = { id: "mesto-team", name: "Команда Места", avatar: avatar("Место"), staff: true };
const seedTime = "2026-01-01T17:00:00.000Z";
const seedMessages: ChatMessage[] = [
  ["mark", "Кто-нибудь пробовал Basil Smash? Что скажете? 🌿"],
  ["anya", "Да! Мой любимый здесь. Ещё попробуй Paloma 🙌"],
  ["nikita", "Кто сегодня на винил? Я уже у барной стойки"],
  ["sonya", "Мы с подругой идём! Оставьте нам местечко 🪩"],
  ["mesto-team", "Это демонстрационный чат. Сообщения сохраняются только в вашем браузере; профили не отвечают автоматически. 💚"],
].map(([guestId, body], i) => {
  const guest = demoGuests.find((candidate) => candidate.id === guestId);
  return { id: `welcome-${i + 1}`, guestId, recipientId: null, body, createdAt: new Date(Date.parse(seedTime) + i * 120000).toISOString(), author: guest ? { id: guest.id, name: guest.name, avatar: guest.avatar, staff: false } : { ...team }, reactions: i === 1 ? [{ emoji: "💚", count: 2, mine: false }] : i === 4 ? [{ emoji: "🔥", count: 3, mine: false }] : [] };
});
const seedEvents: VenueEvent[] = [
  { id: "vinyl-night", title: "Винил, вино и разговоры", description: "Только живой винил, любимые коктейли и знакомства между треками.", image: svg("♫", "#4a4d36"), startsAt: "2026-01-01T18:00:00.000Z", category: "DJ-сет", location: "Основной зал", capacity: 50, attendeeIds: demoGuests.slice(0, 14).map((guest) => guest.id), attendeeAvatars: [], joined: false },
  { id: "cocktail-stories", title: "Давай по коктейлю?", description: "Знакомимся без неловкости. Можно и нужно приходить одному.", image: svg("♧", "#76573e"), startsAt: "2026-01-02T17:00:00.000Z", category: "Знакомства", location: "Барная стойка", capacity: 24, attendeeIds: demoGuests.slice(3, 11).map((guest) => guest.id), attendeeAvatars: [], joined: false },
  { id: "quiz-friends", title: "Свои люди: барный квиз", description: "Музыка, кино и немного случайных знаний. Собери команду или приходи соло.", image: svg("?", "#4c536e"), startsAt: "2026-01-03T16:00:00.000Z", category: "Квиз", location: "Большой стол", capacity: 36, attendeeIds: demoGuests.slice(7, 13).map((guest) => guest.id), attendeeAvatars: [], joined: false },
];
seedEvents.forEach((event) => { event.attendeeAvatars = event.attendeeIds.slice(0, 4).map((id) => demoGuests.find((guest) => guest.id === id)!.avatar); });

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// Deterministic, deeply frozen and safe to import during SSR; no browser access,
// random IDs, clock reads, database imports or shared server-side mutable sessions.
export const initialDemoState: SocialState = freeze({
  me: { id: "demo-host", name: "Саша", age: 27, avatar: avatar("Саша"), bio: "Новые люди — лучшие планы на вечер.", status: "Открыт к общению", intention: "open", interests: ["Музыка", "Коктейли", "Путешествия"], isHere: true, hidden: false, isDemo: true, muted: false, canModerate: true },
  venue: { id: "mesto", name: "Место", address: "Москва, ул. Покровка, 16", description: "Камерный бар на Покровке. Авторские коктейли, винил и люди, с которыми хочется задержаться.", announcement: "Демо: изменения видны только в вашем браузере. Профили и приглашения — примеры, автоматических ответов нет." },
  guests: demoGuests, messages: seedMessages, directMessages: [], events: seedEvents,
  incoming: ["anya", "mark"], outgoing: [], matches: [],
  stats: { here: demoGuests.length + 1, company: demoGuests.filter((guest) => guest.intention === "company").length, messages: seedMessages.length, connections: 6, visits: demoGuests.length + 1 },
  reports: [],
});

type Store = { version: 1; state: SocialState; blocked: string[] };
// Memory fallback is only ever read/written in a browser (e.g. storage disabled).
let browserStore: Store | undefined;
let persistenceUnavailable = false;
function freshStore(): Store {
  const state = clone(initialDemoState);
  state.me!.id = window.crypto.randomUUID();
  const now = Date.now();
  state.messages.forEach((message, i) => { message.createdAt = new Date(now - (15 - i * 2) * 60000).toISOString(); });
  state.events.forEach((event, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours([21, 20, 19][i], 0, 0, 0);
    event.startsAt = date.toISOString();
  });
  return { version: 1, state, blocked: [] };
}
function load(): Store {
  if (persistenceUnavailable && browserStore) return clone(browserStore);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Store;
      if (saved.version === 1 && saved.state?.me && Array.isArray(saved.state.guests) && Array.isArray(saved.state.messages) && Array.isArray(saved.state.directMessages) && Array.isArray(saved.state.events) && Array.isArray(saved.state.incoming) && Array.isArray(saved.state.outgoing) && Array.isArray(saved.state.reports) && saved.state.venue && Array.isArray(saved.blocked)) {
        browserStore = saved;
        return clone(saved);
      }
    }
  } catch { /* Private browsing, storage disabled or damaged JSON: local fallback. */ }
  browserStore ??= freshStore();
  return clone(browserStore);
}
function save(store: Store) {
  browserStore = clone(store);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
  catch { persistenceUnavailable = true; /* Session-only fallback when storage is unavailable/full. */ }
}
function snapshot(store: Store): SocialState {
  const state = clone(store.state);
  const me = state.me;
  const available = new Set(state.guests.filter((guest) => !guest.hidden && !store.blocked.includes(guest.id)).map((guest) => guest.id));
  state.guests = state.guests.filter((guest) => available.has(guest.id) && guest.isHere);
  state.incoming = state.incoming.filter((id) => available.has(id));
  state.outgoing = state.outgoing.filter((id) => available.has(id));
  state.matches = store.state.guests.filter((guest) => state.incoming.includes(guest.id) && state.outgoing.includes(guest.id)).map(clone);
  const allowedMessage = (message: ChatMessage) => !store.blocked.includes(message.guestId) && !store.blocked.includes(message.recipientId ?? "");
  state.messages = state.messages.filter(allowedMessage).slice(-60);
  state.directMessages = state.directMessages.filter((message) => allowedMessage(message) && state.matches.some((guest) => guest.id === (message.guestId === me?.id ? message.recipientId : message.guestId)));
  state.events.forEach((event) => {
    event.joined = event.attendeeIds.includes(me?.id ?? "");
    event.attendeeAvatars = event.attendeeIds.slice(0, 4).map((id) => id === me?.id ? me.avatar : store.state.guests.find((guest) => guest.id === id)?.avatar ?? avatar("Гость"));
  });
  state.stats = { here: state.guests.length + (me?.isHere && !me.hidden ? 1 : 0), company: state.guests.filter((guest) => guest.intention === "company").length + (me?.isHere && !me.hidden && me.intention === "company" ? 1 : 0), messages: store.state.messages.length, connections: 6 + state.matches.length, visits: store.state.guests.length + 1 };
  if (!me?.canModerate) state.reports = [];
  return state;
}

export function getDemoState(): SocialState {
  if (typeof window === "undefined") return clone(initialDemoState);
  const store = load();
  save(store);
  return snapshot(store);
}
function text(value: unknown, min: number, max: number, label = "Поле"): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`${label}: от ${min} до ${max} символов.`);
  return value.trim();
}
function bool(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Некорректное значение настройки.");
  return value;
}

export async function mutateDemo(action: string, payload: Record<string, unknown>): Promise<MutationResult> {
  if (typeof window === "undefined") throw new Error("Демо доступно только в браузере.");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Некорректный запрос.");
  const store = load();
  const state = store.state;
  const me = state.me as CurrentGuest;
  let outcome: string | undefined;
  const id = () => window.crypto.randomUUID();
  const notBlocked = (guestId: string) => { if (store.blocked.includes(guestId)) throw new Error("Взаимодействие с этим гостем недоступно."); };
  const target = (value = payload.targetId) => {
    const guestId = text(value, 1, 100);
    if (guestId === me.id) throw new Error("Выберите другого гостя.");
    const guest = state.guests.find((candidate) => candidate.id === guestId && !candidate.hidden);
    if (!guest) throw new Error("Этот профиль недоступен.");
    return guest;
  };
  const canModerate = () => { if (!me.canModerate) throw new Error("Только команда заведения может выполнить это действие."); };
  const message = (body: string, recipientId: string | null = null, staff = false): ChatMessage => ({ id: id(), guestId: staff ? team.id : me.id, recipientId, body, createdAt: new Date().toISOString(), author: staff ? { ...team } : { id: me.id, name: me.name, avatar: me.avatar, staff: false }, reactions: [] });
  switch (action) {
    case "enter":
      me.isHere = true;
      break;
    case "presence":
      me.isHere = bool(payload.isHere);
      break;
    case "mute":
      me.muted = bool(payload.muted);
      break;
    case "profile": {
      const name = text(payload.name, 2, 32, "Имя");
      const bio = text(payload.bio, 0, 120, "О себе");
      const age = Number(payload.age);
      if (!Number.isInteger(age) || age < 18 || age > 99) throw new Error("BAR SOCIAL — пространство для гостей от 18 лет.");
      const intention = text(payload.intention, 1, 20);
      if (intention !== "open" && intention !== "company" && intention !== "chill") throw new Error("Выберите настроение на вечер.");
      if (!Array.isArray(payload.interests) || payload.interests.length > 5 || payload.interests.some((value) => typeof value !== "string" || value.length > 24)) throw new Error("Выберите до 5 интересов.");
      let photo = me.avatar;
      if (payload.avatar !== undefined) {
        const value = text(payload.avatar, 1, 1000000, "Фото");
        if (value === me.avatar || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) photo = value;
        else if (/^\/(?:ishatiye\/)?images\/[a-z-]+\.jpg$/.test(value)) photo = avatar(name);
        else throw new Error("Поддерживаются изображения JPG, PNG и WebP.");
      }
      Object.assign(me, { name, age, bio, intention, status: statusFor(intention), avatar: photo, interests: [...payload.interests] as string[], hidden: bool(payload.hidden) });
      [...state.messages, ...state.directMessages].filter((entry) => entry.guestId === me.id).forEach((entry) => { entry.author.name = name; entry.author.avatar = photo; });
      break;
    }
    case "interest": {
      if (!me.isHere || me.hidden) throw new Error("Сделайте профиль видимым и отметьтесь «Я здесь», чтобы знакомиться.");
      const guest = target();
      notBlocked(guest.id);
      if (!state.outgoing.includes(guest.id)) state.outgoing.push(guest.id);
      outcome = state.incoming.includes(guest.id) ? "match" : "interest";
      break;
    }
    case "message": {
      if (!me.isHere) throw new Error("Нажмите «Я здесь», чтобы участвовать в чате.");
      const body = text(payload.body, 1, 1000, "Сообщение");
      let recipientId: string | null = null;
      if (payload.recipientId) {
        recipientId = text(payload.recipientId, 1, 100);
        target(recipientId);
        notBlocked(recipientId);
        if (!state.incoming.includes(recipientId) || !state.outgoing.includes(recipientId)) throw new Error("Личный диалог доступен только после взаимного интереса.");
      }
      const previous = [...state.messages, ...state.directMessages].filter((entry) => entry.guestId === me.id).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
      if (previous && Date.now() - Date.parse(previous.createdAt) < 700) throw new Error("Немного медленнее — сообщение уже в пути.");
      (recipientId ? state.directMessages : state.messages).push(message(body, recipientId));
      break;
    }
    case "reaction": {
      const messageId = text(payload.messageId, 1, 100);
      const emoji = text(payload.emoji, 1, 12);
      if (!["💚", "🔥", "🙌", "🥂", "😂", "👋"].includes(emoji)) throw new Error("Выберите реакцию из списка.");
      const entry = [...state.messages, ...state.directMessages].find((candidate) => candidate.id === messageId);
      if (!entry || (entry.recipientId && entry.guestId !== me.id && entry.recipientId !== me.id)) throw new Error("Сообщение недоступно.");
      notBlocked(entry.guestId);
      if (entry.recipientId) notBlocked(entry.recipientId);
      const reaction = entry.reactions.find((candidate) => candidate.emoji === emoji);
      if (!reaction) entry.reactions.push({ emoji, count: 1, mine: true });
      else { reaction.count += reaction.mine ? -1 : 1; reaction.mine = !reaction.mine; }
      entry.reactions = entry.reactions.filter((candidate) => candidate.count > 0);
      break;
    }
    case "rsvp": {
      const event = state.events.find((candidate) => candidate.id === text(payload.eventId, 1, 100));
      if (!event) throw new Error("Событие не найдено.");
      if (event.attendeeIds.includes(me.id)) event.attendeeIds = event.attendeeIds.filter((guestId) => guestId !== me.id);
      else {
        if (event.attendeeIds.length >= event.capacity) throw new Error("Все места заняты. Попробуйте другое событие.");
        event.attendeeIds.push(me.id);
      }
      break;
    }
    case "block": {
      const guest = target();
      if (!store.blocked.includes(guest.id)) store.blocked.push(guest.id);
      break;
    }
    case "report": {
      const guest = target();
      state.reports.push({ id: id(), targetId: guest.id, targetName: guest.name, reporterName: me.name, reason: text(payload.reason, 5, 500, "Причина жалобы"), status: "open", createdAt: new Date().toISOString() });
      break;
    }
    case "announcement": {
      canModerate();
      const body = text(payload.body, 3, 240, "Объявление");
      state.venue.announcement = body;
      // An explicit host announcement is the only new staff message, not a reply.
      state.messages.push(message(body, null, true));
      break;
    }
    case "create-event": {
      canModerate();
      const title = text(payload.title, 3, 70, "Название");
      const description = text(payload.description, 10, 1000, "Описание");
      const startsAt = new Date(text(payload.startsAt, 10, 50));
      if (!Number.isFinite(startsAt.getTime())) throw new Error("Укажите дату и время.");
      const category = text(payload.category, 2, 25);
      const capacity = Number(payload.capacity);
      if (!Number.isInteger(capacity) || capacity < 2 || capacity > 500) throw new Error("Количество мест: от 2 до 500.");
      state.events.push({ id: id(), title, description, startsAt: startsAt.toISOString(), category, capacity, image: svg("♫"), location: "Основной зал", attendeeIds: [], attendeeAvatars: [], joined: false });
      state.events.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
      break;
    }
    case "moderate": {
      canModerate();
      const report = state.reports.find((candidate) => candidate.id === text(payload.reportId, 1, 100));
      if (!report) throw new Error("Жалоба не найдена.");
      if (payload.hide === true) {
        const guest = state.guests.find((candidate) => candidate.id === report.targetId);
        if (guest) guest.hidden = true;
      }
      report.status = "resolved";
      break;
    }
    default:
      throw new Error("Неизвестное действие.");
  }
  save(store);
  return { state: snapshot(store), ...(outcome ? { outcome } : {}) };
}
