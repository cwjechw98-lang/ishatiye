"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Hand, Heart, MessageCircle, MoreHorizontal, Search, SlidersHorizontal, Users, X } from "lucide-react";
import type { Guest, SocialState } from "@/lib/types";
import { Avatar, EmptyState, SectionHeading } from "./ui";

export type GuestFilters = { interests: string[]; minAge: number; maxAge: number };
export const DEFAULT_FILTERS: GuestFilters = { interests: [], minAge: 18, maxAge: 99 };
export type GuestTab = "all" | "company" | "open";

export function GuestCard({ guest, state, onSelect, onConnect, onMessage, busy }: { guest: Guest; state: SocialState; onSelect: (guest: Guest) => void; onConnect: (guest: Guest) => void; onMessage: (guest: Guest) => void; busy: boolean }) {
  const matched = state.matches.some((match) => match.id === guest.id);
  const sent = state.outgoing.includes(guest.id);
  return <article className="guest-card">
    <div className="guest-card-top"><button className="guest-identity" onClick={() => onSelect(guest)}><Avatar src={guest.avatar} name={guest.name} size={45} online /><span><strong>{guest.name}<span className="guest-age">, {guest.age}</span></strong><span className="guest-location">Здесь и сейчас</span></span></button><button className="icon-button small more-guest" aria-label={`Профиль: ${guest.name}`} onClick={() => onSelect(guest)}><MoreHorizontal size={18} /></button></div>
    <p className="guest-bio">{guest.bio}</p>
    <div className="interest-tags">{guest.interests.slice(0, 2).map((interest) => <span key={interest}>{interest}</span>)}{guest.interests.length > 2 && <span className="extra-interest" title={guest.interests.slice(2).join(", ")}>+{guest.interests.length - 2}</span>}</div>
    <div className="guest-card-footer"><span className={`guest-status ${guest.intention}`}><span />{guest.status}</span><button className={`wave-button ${sent ? "sent" : ""}`} disabled={busy || (sent && !matched)} onClick={() => matched ? onMessage(guest) : onConnect(guest)} title={matched ? "Начать разговор" : sent ? "Интерес отправлен" : "Помахать и проявить интерес"} aria-label={matched ? `Написать: ${guest.name}` : sent ? `Интерес отправлен: ${guest.name}` : `Познакомиться: ${guest.name}`}>
      {matched ? <MessageCircle size={16} /> : sent ? <Check size={16} /> : <Hand size={16} />}
    </button></div>
  </article>;
}

export function GuestsSection({ state, preview = false, tab, onTab, filters, onFilters, onSelect, onConnect, onMessage, onViewAll, busy }: { state: SocialState; preview?: boolean; tab: GuestTab; onTab: (tab: GuestTab) => void; filters: GuestFilters; onFilters: () => void; onSelect: (guest: Guest) => void; onConnect: (guest: Guest) => void; onMessage: (guest: Guest) => void; onViewAll: () => void; busy: boolean }) {
  const [query, setQuery] = useState("");
  const filterCount = filters.interests.length + (filters.minAge !== 18 || filters.maxAge !== 99 ? 1 : 0);
  const filtered = state.guests.filter((guest) => {
    const search = `${guest.name} ${guest.bio} ${guest.interests.join(" ")}`.toLocaleLowerCase("ru");
    return (tab === "all" || guest.intention === tab) && search.includes(query.toLocaleLowerCase("ru")) && guest.age >= filters.minAge && guest.age <= filters.maxAge && (!filters.interests.length || filters.interests.some((interest) => guest.interests.includes(interest)));
  });
  return <section className="guests-section">
    <SectionHeading title={preview ? "Кто сейчас здесь" : "Люди твоего вечера"} count={state.stats.here} action={preview ? "Все гости" : undefined} onAction={onViewAll} />
    {!preview && <div className="guest-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти по имени или интересам" aria-label="Поиск гостей" />{query && <button className="icon-button small" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={16} /></button>}</div>}
    <div className="guest-toolbar"><div className="filter-tabs"><button className={tab === "all" ? "active" : ""} onClick={() => onTab("all")}>Все гости</button><button className={tab === "company" ? "active" : ""} onClick={() => onTab("company")}>Ищу компанию</button><button className={tab === "open" ? "active" : ""} onClick={() => onTab("open")}>Знакомства</button></div><button className={`filter-button ${filterCount ? "has-filters" : ""}`} aria-label="Фильтры гостей" onClick={onFilters}><SlidersHorizontal size={16} />{filterCount > 0 && <span>{filterCount}</span>}</button></div>
    {filtered.length ? <div className="guest-grid">{(preview ? filtered.slice(0, 6) : filtered).map((guest) => <GuestCard key={guest.id} guest={guest} state={state} onSelect={onSelect} onConnect={onConnect} onMessage={onMessage} busy={busy} />)}</div> : <EmptyState icon={Users} title="Пока никого с такими интересами" description="Попробуйте другие фильтры. Возможно, ваш человек уже за соседним столиком." action={<button className="button secondary" onClick={onFilters}>Изменить фильтры</button>} />}
    {preview && <div className="guest-section-foot"><span><span className="live-dot" />Хороший разговор начинается с простого «привет»</span><Hand size={15} /></div>}
  </section>;
}

export function Connections({ state, onConnect, onSelect, onMessage, onExplore, busy }: { state: SocialState; onConnect: (guest: Guest) => void; onSelect: (guest: Guest) => void; onMessage: (guest: Guest) => void; onExplore: () => void; busy: boolean }) {
  const [tab, setTab] = useState<"matches" | "incoming" | "outgoing">("matches");
  const incoming = state.guests.filter((guest) => state.incoming.includes(guest.id) && !state.outgoing.includes(guest.id));
  const outgoing = state.guests.filter((guest) => state.outgoing.includes(guest.id) && !state.incoming.includes(guest.id));
  const items = tab === "matches" ? state.matches : tab === "incoming" ? incoming : outgoing;
  return <section className="connections-view"><div className="connections-intro"><span className="feature-icon"><Heart size={25} /></span><div><h2>Всё начинается с взаимности</h2><p>Личные сообщения открываются, только когда интерес взаимный.</p></div></div><div className="filter-tabs connection-tabs"><button className={tab === "matches" ? "active" : ""} onClick={() => setTab("matches")}>Взаимный интерес <span>{state.matches.length}</span></button><button className={tab === "incoming" ? "active" : ""} onClick={() => setTab("incoming")}>Вам симпатизируют <span>{incoming.length}</span></button><button className={tab === "outgoing" ? "active" : ""} onClick={() => setTab("outgoing")}>Отправленные <span>{outgoing.length}</span></button></div>
    {items.length ? <div className="connection-grid">{items.map((guest) => <article className="connection-card" key={guest.id}><button className="unstyled" onClick={() => onSelect(guest)}><Avatar src={guest.avatar} name={guest.name} size={76} online /><h3>{guest.name}, {guest.age}</h3></button><p>{guest.bio}</p><div className="interest-tags">{guest.interests.map((interest) => <span key={interest}>{interest}</span>)}</div><button className={`button ${tab === "outgoing" ? "secondary" : "primary"}`} disabled={busy || tab === "outgoing"} onClick={() => tab === "matches" ? onMessage(guest) : onConnect(guest)}>{tab === "matches" ? <><MessageCircle size={17} />Начать разговор</> : tab === "incoming" ? <><Heart size={17} />Ответить взаимностью</> : <><Check size={17} />Интерес отправлен</>}</button>{guest.isDemo && <small>Демо-профиль</small>}</article>)}</div> : <EmptyState icon={Heart} title={tab === "matches" ? "Ваши люди ещё впереди" : tab === "incoming" ? "Вечер только начинается" : "Сделайте первый шаг"} description={tab === "matches" ? "Помашите тому, кто вам интересен. А во вкладке «Вам симпатизируют» уже могут ждать новые знакомства." : "Посмотрите, кто сейчас в баре, и проявите интерес. Никаких неловких первых сообщений."} action={<button className="button primary" onClick={tab === "matches" && incoming.length ? () => setTab("incoming") : onExplore}>{tab === "matches" && incoming.length ? `Вам симпатизируют · ${incoming.length}` : "Посмотреть гостей"}<ArrowUpRight size={17} /></button>} />}
    <p className="privacy-note">Никакие контакты не раскрываются автоматически. Вы сами решаете, чем поделиться.</p>
  </section>;
}
