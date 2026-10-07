import { db } from "@/db";
import { venues, guests, messages, interests, events, eventAttendees, messageReactions } from "@/db/schema";

export const VENUE_ID = "mesto";
let seedPromise: Promise<void> | undefined;

const profiles = [
  { id: "anya", name: "Аня", age: 25, avatar: "anya", intention: "open", status: "Открыта к знакомству", bio: "За хорошей музыкой и спонтанными разговорами ✨", interests: ["Музыка", "Путешествия", "Искусство"] },
  { id: "mark", name: "Марк", age: 28, avatar: "mark", intention: "company", status: "Ищу компанию", bio: "Кто за коктейль и партию в настолки?", interests: ["Настолки", "Кино", "Коктейли"] },
  { id: "sonya", name: "Соня", age: 24, avatar: "sonya", intention: "open", status: "Открыта к знакомству", bio: "Сегодня в планах танцы. Присоединяйся!", interests: ["Танцы", "Музыка", "Дизайн"] },
  { id: "danil", name: "Данил", age: 27, avatar: "danil", intention: "company", status: "Ищу компанию", bio: "Обсудим идеи за бокалом Negroni?", interests: ["Технологии", "Бизнес", "Коктейли"] },
  { id: "lera", name: "Лера", age: 26, avatar: "lera", intention: "open", status: "Открыта к знакомству", bio: "Собираю впечатления, а не планы на вечер", interests: ["Дизайн", "Фотография", "Кино"] },
  { id: "nikita", name: "Никита", age: 29, avatar: "nikita", intention: "company", status: "Ищу компанию", bio: "Хороший джаз — уже повод познакомиться", interests: ["Джаз", "Путешествия", "Музыка"] },
  ...["Алиса", "Артём", "Маша", "Илья", "Полина", "Максим", "Вика", "Денис", "Даша", "Роман", "Ксюша", "Андрей", "Катя", "Олег", "Юля", "Глеб", "Ева"].map((name, i) => ({
    id: `guest-${i + 7}`, name, age: 23 + i % 9,
    avatar: ["anya", "mark", "sonya", "danil", "lera", "nikita"][i % 6],
    intention: i % 2 === 0 ? "company" : i % 3 === 0 ? "chill" : "open",
    status: i % 2 === 0 ? "Ищу компанию" : i % 3 === 0 ? "На своей волне" : "Открыт к общению",
    bio: ["Новые знакомства — лучшие планы на вечер", "Люблю уютные бары и интересные истории", "Здесь за музыкой и хорошей компанией"][i % 3],
    interests: [["Коктейли", "Музыка"], ["Кино", "Путешествия"], ["Дизайн", "Искусство"], ["Джаз", "Настолки"]][i % 4],
  })),
];

async function seed() {
  const now = new Date();
  const tonight = (hour: number, day = 0) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + day);
    date.setUTCHours(hour - 3, 0, 0, 0);
    return date;
  };
  await db.transaction(async (tx) => {
    await tx.insert(venues).values({
      id: VENUE_ID, name: "Место", address: "Москва, ул. Покровка, 16",
      description: "Камерный бар на Покровке. Авторские коктейли, винил и люди, с которыми хочется задержаться. Приходи за любимым напитком — оставайся ради хорошего разговора.",
      announcement: "В 21:00 встаём за вертушки. Винил, любимые треки и никаких случайных людей 🪩",
    }).onConflictDoNothing();
    await tx.insert(guests).values([
      ...profiles.map((profile, index) => ({ ...profile, venueId: VENUE_ID, avatar: `/images/${profile.avatar}.jpg`, isDemo: true, role: "demo_profile", createdAt: new Date(now.getTime() - 3600000 + index * 1000) })),
      { id: "mesto-team", venueId: VENUE_ID, name: "Команда Места", age: 25, avatar: "/images/bar.jpg", role: "staff", hidden: true, isHere: false, isDemo: true, interests: [], bio: "Мы всегда рядом", status: "Команда бара", intention: "chill" },
    ]).onConflictDoNothing();
    await tx.insert(messages).values([
      { id: "welcome-1", guestId: "mark", body: "Кто-нибудь пробовал Basil Smash? Что скажете? 🌿" },
      { id: "welcome-2", guestId: "anya", body: "Да! Мой любимый здесь. Ещё попробуй Paloma 🙌" },
      { id: "welcome-3", guestId: "nikita", body: "Кто сегодня на винил? Я уже у барной стойки" },
      { id: "welcome-4", guestId: "sonya", body: "Мы с подругой идём! Оставьте нам местечко 🪩" },
      { id: "welcome-5", guestId: "mesto-team", body: "Ребята, рады всем! Знакомьтесь, не стесняйтесь. Этот вечер — ваш 💚" },
    ].map((message, i) => ({ ...message, venueId: VENUE_ID, createdAt: new Date(now.getTime() - (15 - i * 2) * 60000) }))).onConflictDoNothing();
    await tx.insert(messageReactions).values([
      { guestId: "mark", messageId: "welcome-2", emoji: "💚" },
      { guestId: "lera", messageId: "welcome-2", emoji: "💚" },
      { guestId: "anya", messageId: "welcome-5", emoji: "🔥" },
      { guestId: "nikita", messageId: "welcome-5", emoji: "🔥" },
      { guestId: "mark", messageId: "welcome-5", emoji: "🔥" },
    ]).onConflictDoNothing();
    await tx.insert(events).values([
      { id: "vinyl-night", venueId: VENUE_ID, title: "Винил, вино и разговоры", description: "Никаких плейлистов. Только живой винил от DJ Misha, любимые коктейли и знакомства между треками. Начинаем с соула, заканчиваем танцами.", image: "/images/vinyl.jpg", startsAt: tonight(21), category: "DJ-сет", location: "Основной зал", capacity: 50 },
      { id: "cocktail-stories", venueId: VENUE_ID, title: "Давай по коктейлю?", description: "Знакомимся без неловкости: бармен смешает авторский коктейль, а мы поможем найти тему для первого разговора. Можно и нужно приходить одному.", image: "/images/cocktails.jpg", startsAt: tonight(20, 1), category: "Знакомства", location: "Барная стойка", capacity: 24 },
      { id: "quiz-friends", venueId: VENUE_ID, title: "Свои люди: барный квиз", description: "Музыка, кино и немного случайных знаний. Собери команду в общем чате или приходи соло — мы найдём тебе компанию. Победителям — комплимент от бара.", image: "/images/bar.jpg", startsAt: tonight(19, 2), category: "Квиз", location: "Большой стол", capacity: 36 },
    ]).onConflictDoNothing();
    await tx.insert(eventAttendees).values([
      ...profiles.slice(0, 14).map((p) => ({ eventId: "vinyl-night", guestId: p.id })),
      ...profiles.slice(3, 11).map((p) => ({ eventId: "cocktail-stories", guestId: p.id })),
      ...profiles.slice(7, 13).map((p) => ({ eventId: "quiz-friends", guestId: p.id })),
    ]).onConflictDoNothing();
    await tx.insert(interests).values([
      ...[0, 2, 4, 6, 8, 10].flatMap((i) => [
        { fromId: profiles[i].id, toId: profiles[i + 1].id },
        { fromId: profiles[i + 1].id, toId: profiles[i].id },
      ]),
    ]).onConflictDoNothing();
  });
}

export function ensureSeeded() {
  if (!seedPromise) seedPromise = seed().catch((error) => { seedPromise = undefined; throw error; });
  return seedPromise;
}
