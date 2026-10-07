"use client";

import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Clock3, Music2, Users } from "lucide-react";
import type { Mutate, SocialState, VenueEvent } from "@/lib/types";
import { AvatarStack, EmptyState, eventDate, SectionHeading } from "./ui";

export function EventCard({ event, onSelect, onJoin, busy, compact = false }: { event: VenueEvent; onSelect: (event: VenueEvent) => void; onJoin: (event: VenueEvent) => void; busy: boolean; compact?: boolean }) {
  return <article className={`event-card ${compact ? "compact" : ""}`}><button className="event-image-button" onClick={() => onSelect(event)} aria-label={`Подробнее: ${event.title}`}><img src={event.image} alt={event.title} loading="lazy" /><span className="event-type"><Music2 size={12} />{event.category}</span><span className="event-date-pill"><span className="live-dot" />{eventDate(event.startsAt)}</span><span className="event-image-arrow"><ArrowUpRight size={19} /></span></button><div className="event-card-content"><button className="unstyled event-title" onClick={() => onSelect(event)}><h3>{event.title}</h3></button>{!compact && <p className="event-description">{event.description}</p>}<div className="event-attendance"><AvatarStack avatars={event.attendeeAvatars} size={24} max={3} /><span><b>{event.attendeeIds.length}</b> уже идут</span><span className="free-entry">Вход свободный</span></div><button className={`button event-join ${event.joined ? "joined" : ""}`} onClick={() => onJoin(event)} disabled={busy || (!event.joined && event.attendeeIds.length >= event.capacity)}>{event.joined ? <><Check size={16} />Вы в списке<small>Отменить</small></> : <><Users size={16} />Я иду<ArrowUpRight size={16} /></>}</button></div></article>;
}

export function EventsView({ state, onSelect, onJoin, busy }: { state: SocialState; onSelect: (event: VenueEvent) => void; onJoin: (event: VenueEvent) => void; busy: boolean }) {
  const [filter, setFilter] = useState<"all" | "today" | "mine">("all");
  const events = state.events.filter((event) => filter === "all" || (filter === "mine" ? event.joined : eventDate(event.startsAt, false) === "Сегодня"));
  return <section className="events-view"><div className="events-feature"><span className="feature-icon"><CalendarDays size={26} /></span><div><h2>Повод собраться вместе</h2><p>Хорошая музыка, общие интересы и люди, с которыми стоит познакомиться.</p></div><span className="events-feature-note"><Clock3 size={16} />Время московское</span></div><div className="filter-tabs event-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Все события <span>{state.events.length}</span></button><button className={filter === "today" ? "active" : ""} onClick={() => setFilter("today")}>Сегодня</button><button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>Мои планы <span>{state.events.filter((event) => event.joined).length}</span></button></div>{events.length ? <div className="event-grid">{events.map((event) => <EventCard event={event} key={event.id} onSelect={onSelect} onJoin={onJoin} busy={busy} />)}</div> : <EmptyState icon={CalendarDays} title={filter === "mine" ? "В планах пока чистый лист" : "Сегодня можно просто общаться"} description="Выберите событие по душе. Самые интересные вечера редко случаются по плану." action={<button className="button primary" onClick={() => setFilter("all")}>Посмотреть события<ArrowUpRight size={16} /></button>} />}</section>;
}

export function EventRail({ event, onSelect, onJoin, onAll, busy }: { event?: VenueEvent; onSelect: (event: VenueEvent) => void; onJoin: (event: VenueEvent) => void; onAll: () => void; busy: boolean }) {
  if (!event) return null;
  return <section className="event-rail"><SectionHeading title="Планы на вечер" action="Все" onAction={onAll} /><EventCard event={event} onSelect={onSelect} onJoin={onJoin} busy={busy} compact /></section>;
}
