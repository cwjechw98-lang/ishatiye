export type Intention = "open" | "company" | "chill";
export type View = "home" | "guests" | "chat" | "connections" | "events" | "about" | "rules" | "admin";

export type Guest = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  bio: string;
  status: string;
  intention: Intention;
  interests: string[];
  isHere: boolean;
  hidden: boolean;
  isDemo: boolean;
};

export type CurrentGuest = Guest & { muted: boolean; canModerate: boolean };
export type ChatMessage = {
  id: string;
  guestId: string;
  recipientId: string | null;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatar: string; staff: boolean };
  reactions: { emoji: string; count: number; mine: boolean }[];
};

export type VenueEvent = {
  id: string;
  title: string;
  description: string;
  image: string;
  startsAt: string;
  category: string;
  location: string;
  capacity: number;
  attendeeIds: string[];
  attendeeAvatars: string[];
  joined: boolean;
};

export type SocialState = {
  me: CurrentGuest | null;
  venue: { id: string; name: string; address: string; description: string; announcement: string | null };
  guests: Guest[];
  messages: ChatMessage[];
  directMessages: ChatMessage[];
  events: VenueEvent[];
  incoming: string[];
  outgoing: string[];
  matches: Guest[];
  stats: { here: number; company: number; messages: number; connections: number; visits: number };
  reports: { id: string; targetId: string; targetName: string; reporterName: string; reason: string; status: string; createdAt: string }[];
};

export type MutationResult = { state: SocialState; outcome?: string };
export type Mutate = (action: string, payload?: Record<string, unknown>) => Promise<MutationResult | null>;

export const INTEREST_OPTIONS = ["Музыка", "Путешествия", "Кино", "Дизайн", "Коктейли", "Настолки", "Технологии", "Искусство", "Джаз", "Танцы", "Бизнес", "Фотография"];
export const INTENTIONS: Record<Intention, { label: string; short: string; emoji: string }> = {
  open: { label: "Открыт к знакомству", short: "Открыт к общению", emoji: "👋" },
  company: { label: "Ищу компанию", short: "Ищу компанию", emoji: "🥂" },
  chill: { label: "Просто отдыхаю", short: "На своей волне", emoji: "✨" },
};
