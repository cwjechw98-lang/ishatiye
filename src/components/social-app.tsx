"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Compass, Handshake, Heart, LayoutDashboard, MapPin, Martini, Menu, MessageCircle, Moon, Plus, QrCode, Radio, Settings2, ShieldCheck, Sparkles, UserPlus, Users, X } from "lucide-react";
import type { Guest, MutationResult, SocialState, VenueEvent, View } from "@/lib/types";
import { getDemoState, mutateDemo } from "@/lib/demo";
import { Avatar, AvatarStack, Modal } from "./ui";
import { Chat } from "./chat";
import { Connections, DEFAULT_FILTERS, GuestsSection, type GuestFilters, type GuestTab } from "./guests";
import { EventRail, EventsView } from "./events";
import { AdminPanel, BAR_ART, RulesPanel, VenuePanel } from "./panels";
import { AnnouncementDialog, CreateEventDialog, EventDialog, FiltersDialog, GuestDialog, InviteDialog, MatchDialog, ProfileDialog } from "./dialogs";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type AppModal = { type: "profile" | "invite" | "filters" | "create-event" | "announcement" } | { type: "guest" | "match" | "dm"; guest: Guest } | { type: "event"; eventId: string } | null;
const VIEW_TITLES: Record<View, { title: string; description: string }> = {
  home: { title: "Сейчас в «Месте»", description: "Новые люди. Общие интересы. Один хороший вечер." },
  guests: { title: "Люди рядом", description: "Не незнакомцы. Просто люди, с которыми вы ещё не знакомы." },
  chat: { title: "Один бар. Общий разговор.", description: "Спроси, посоветуй, позови за свой столик. Ты среди своих." },
  connections: { title: "Знакомства", description: "Меньше неловкости. Больше настоящих разговоров." },
  events: { title: "Встретимся на событии", description: "Планы меняются. Хорошая компания остаётся." },
  about: { title: "То самое «Место»", description: "Коктейли, винил и люди, с которыми хочется задержаться." },
  rules: { title: "Здесь хорошо каждому", description: "Наши простые правила хорошего вечера." },
  admin: { title: "Пульс «Места»", description: "Люди, разговоры и события. Всё, чем живёт ваше пространство." },
};

function Brand({ onClick }: { onClick: () => void }) {
  return <button className="brand" onClick={onClick} aria-label="BAR SOCIAL — на главную"><span className="brand-symbol"><Martini size={26} strokeWidth={1.8} /></span><span className="brand-type">BAR<span>SOCIAL</span><small>ХОРОШИЕ ЛЮДИ РЯДОМ</small></span></button>;
}

export default function SocialApp({ initialState, initialView = "home" }: { initialState: SocialState; initialView?: View }) {
  const [state, setState] = useState(initialState);
  const [view, setView] = useState<View>(initialView);
  const [modal, setModal] = useState<AppModal>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [guestTab, setGuestTab] = useState<GuestTab>("all");
  const [filters, setFilters] = useState<GuestFilters>(DEFAULT_FILTERS);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [notificationsSeen, setNotificationsSeen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const pending = useRef(false);
  const revision = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const incomingCount = state.incoming.filter((id) => !state.outgoing.includes(id)).length;

  const notify = useCallback((message: string, error = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, error });
    toastTimer.current = setTimeout(() => setToast(null), 5500);
  }, []);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    const version = revision.current;
    try {
      let data: SocialState;
      if (DEMO_MODE) data = getDemoState();
      else {
        const response = await fetch("/api/social", { cache: "no-store" });
        if (!response.ok) throw new Error("Connection unavailable");
        data = await response.json() as SocialState;
      }
      if (revision.current === version && !pending.current) setState(data);
      setConnected(true);
    } catch { setConnected(false); }
  }, []);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => { if (mounted) void refresh(); });
    const interval = setInterval(() => { if (!document.hidden) refresh(); }, 8000);
    const onFocus = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { mounted = false; clearInterval(interval); document.removeEventListener("visibilitychange", onFocus); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [refresh]);

  useEffect(() => {
    const onPop = () => { const next = new URL(window.location.href).searchParams.get("view"); setView(next && next in VIEW_TITLES ? next as View : "home"); setModal(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const outside = (event: PointerEvent) => { if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotifications(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);

  const mutate = useCallback(async (action: string, payload: Record<string, unknown> = {}): Promise<MutationResult | null> => {
    if (pending.current) return null;
    pending.current = true; revision.current++; setBusy(true);
    try {
      let data: MutationResult;
      if (DEMO_MODE) data = await mutateDemo(action, payload);
      else {
        const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить изменения.");
        data = result as MutationResult;
      }
      setState(data.state); setConnected(true);
      return data as MutationResult;
    } catch (error) { notify(error instanceof Error ? error.message : "Соединение прервалось. Попробуйте ещё раз.", true); return null; }
    finally { pending.current = false; setBusy(false); }
  }, [notify]);

  function navigate(next: View) {
    setView(next); setMobileMenu(false); setNotifications(false); setModal(null);
    const url = new URL(window.location.href);
    if (next === "home") url.searchParams.delete("view"); else url.searchParams.set("view", next);
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function profile() {
    if (state.me) setModal({ type: "profile" });
    else notify("Подключаем ваш профиль. Попробуйте через секунду.");
  }
  async function connect(guest: Guest) {
    const result = await mutate("interest", { targetId: guest.id });
    if (result?.outcome === "match") setModal({ type: "match", guest });
    else if (result) notify(`Вы помахали ${guest.name}. Личный чат откроется, если интерес будет взаимным.`);
  }
  async function join(event: VenueEvent) {
    const result = await mutate("rsvp", { eventId: event.id });
    if (result) notify(event.joined ? "Участие отменено. Найдём другие планы на вечер?" : `Вы в списке «${event.title}». До встречи!`);
  }
  const guestProps = {
    state, tab: guestTab, onTab: setGuestTab, filters, onFilters: () => setModal({ type: "filters" } as AppModal),
    onSelect: (guest: Guest) => setModal({ type: "guest", guest }), onConnect: connect,
    onMessage: (guest: Guest) => setModal({ type: "dm", guest }), onViewAll: () => navigate("guests"), busy,
  };
  const eventProps = { onSelect: (event: VenueEvent) => setModal({ type: "event", eventId: event.id }), onJoin: join, busy };
  const activeEvent = modal?.type === "event" ? state.events.find((event) => event.id === modal.eventId) : null;
  const navItems = [
    { id: "home" as View, label: "Сейчас в баре", icon: LayoutDashboard },
    { id: "guests" as View, label: "Гости", icon: Users, badge: state.stats.here },
    { id: "chat" as View, label: "Общий чат", icon: MessageCircle },
    { id: "connections" as View, label: "Знакомства", icon: Heart, badge: incomingCount || undefined },
    { id: "events" as View, label: "События", icon: CalendarDays, badge: state.events.length },
  ];

  return <div className={`app-shell ${DEMO_MODE ? "browser-demo" : ""}`}>
    {DEMO_MODE && <div className="browser-demo-notice" role="note">Браузерное демо: действия сохраняются только в этом браузере. Другие гости — примеры, общего сервера нет.</div>}
    {mobileMenu && <button className="mobile-backdrop" onClick={() => setMobileMenu(false)} aria-label="Закрыть меню" />}
    <aside className={`sidebar ${mobileMenu ? "is-open" : ""}`}><div className="sidebar-top"><Brand onClick={() => navigate("home")} /><button className="venue-switch" onClick={() => navigate("about")}><span className="venue-thumbnail"><img src={BAR_ART} alt="" /><span className="live-dot" /></span><span><strong>Место</strong><small>Москва · Покровка, 16</small></span><ChevronDown size={14} /></button><div className="nav-label">ТВОЙ ВЕЧЕР</div><nav className="main-nav" aria-label="Основная навигация">{navItems.map(({ id, label, icon: Icon, badge }) => <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => navigate(id)} aria-current={view === id ? "page" : undefined}><Icon size={18} strokeWidth={1.65} /><span>{label}</span>{badge !== undefined ? <span className={`nav-badge ${id === "connections" ? "accent" : ""}`}>{badge}</span> : id === "home" && view === id ? <span className="nav-active-dot" /> : id === "chat" && !state.me?.muted ? <span className="nav-unread-dot" /> : null}</button>)}</nav><div className="nav-label secondary-label">ПРОСТРАНСТВО</div><nav className="main-nav secondary-nav" aria-label="О пространстве"><button className={`nav-item ${view === "about" ? "active" : ""}`} onClick={() => navigate("about")}><Compass size={18} strokeWidth={1.65} /><span>О заведении</span></button><button className={`nav-item ${view === "rules" ? "active" : ""}`} onClick={() => navigate("rules")}><ShieldCheck size={18} strokeWidth={1.65} /><span>Правила сообщества</span></button></nav></div>
      <div className="sidebar-bottom"><div className="sidebar-invite"><div className="invite-orbit"><Users size={23} /><span /><span /></div><h3>Вечер лучше,<br />когда вы вместе.</h3><p>Позови своих в «Место».</p><button onClick={() => setModal({ type: "invite" })}>Пригласить друзей<ArrowUpRight size={14} /></button></div><button className={`admin-nav ${view === "admin" ? "active" : ""}`} onClick={() => navigate("admin")}><BarChartIcon /><span>Панель заведения</span><ArrowUpRight size={14} /></button><div className="sidebar-account"><button className="account-identity" onClick={profile}><Avatar src={state.me?.avatar ?? BAR_ART} name={state.me?.name ?? "Саша"} size={35} online={state.me?.isHere ?? true} /><span><strong>{state.me?.name ?? "Саша"}</strong><small>Мой профиль</small></span></button><button className="icon-button small" aria-label="Настроить профиль" onClick={profile}><Settings2 size={17} /></button></div><span className="demo-mode"><span />Демо-пространство <span className="age-mark">18+</span></span></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu-toggle" onClick={() => setMobileMenu(true)} aria-label="Открыть меню"><Menu size={21} /></button><MapPin size={16} /><span>Москва</span><ChevronRight size={13} /><button onClick={() => navigate("about")}>Место</button><span className="venue-category">BAR & SOCIAL SPACE</span></div><div className="topbar-right"><span className="evening-status"><Moon size={14} />Хороший вечер начинается здесь</span><div className="notification-wrap" ref={notificationRef}><button className={`icon-button notification-button ${notifications ? "selected" : ""}`} aria-label="Уведомления" aria-expanded={notifications} onClick={() => { setNotifications(!notifications); setNotificationsSeen(true); }}><Bell size={19} strokeWidth={1.7} />{incomingCount > 0 && !notificationsSeen && <span />}</button>{notifications && <div className="notifications-popover"><header><h3>Что нового</h3><span>Твой вечер в деталях</span></header>{state.guests.filter((guest) => state.incoming.includes(guest.id)).map((guest) => <button key={guest.id} onClick={() => { setModal({ type: "guest", guest }); setNotifications(false); }}><Avatar src={guest.avatar} name={guest.name} size={36} /><span><strong>{guest.name} проявляет интерес</strong><small>{state.outgoing.includes(guest.id) ? "У вас взаимная симпатия" : "Может, это начало хорошего разговора?"}</small></span><Heart size={15} /></button>)}{!state.incoming.length && <p className="muted">Пока тихо. Самое время сделать первый шаг.</p>}<button className="notification-event" onClick={() => navigate("events")}><span className="metric-icon lavender"><CalendarDays size={19} /></span><span><strong>Есть планы на вечер</strong><small>{state.events.length} события в «Месте»</small></span><ArrowUpRight size={15} /></button><footer>Без спама. Только жизнь пространства.</footer></div>}</div><span className="topbar-divider" /><button className={`presence-button ${state.me && !state.me.isHere ? "away" : ""}`} disabled={busy || !state.me} title={state.me?.isHere ? "Нажмите, если вы уже ушли из бара" : "Вернуться в пространство"} onClick={async () => { const isHere = !state.me?.isHere; const result = await mutate("presence", { isHere }); if (result) notify(isHere ? "С возвращением! Вы снова в пространстве." : "Вы вышли из пространства. До следующего хорошего вечера!"); }}><span className="live-dot" />{state.me && !state.me.isHere ? "Вернуться" : "Я здесь"}<Check size={13} /></button></div></header>
      <main className="page-content"><div className="page-heading"><div><div className="page-title-line"><h1>{VIEW_TITLES[view].title}</h1>{view === "home" && <span className="live-label"><span className="live-dot" />LIVE</span>}</div><p>{VIEW_TITLES[view].description}</p></div><button className={`button ${view === "admin" ? "primary" : "secondary"} page-action`} onClick={() => setModal({ type: view === "admin" ? "create-event" : "invite" })}>{view === "admin" ? <Plus size={16} /> : <UserPlus size={16} />}{view === "admin" ? "Создать событие" : "Пригласить друзей"}</button></div>
        {!connected && <div className="connection-warning"><span>Не удаётся обновить пространство. Сохранённые данные остаются доступны.</span><button onClick={refresh}>Повторить</button></div>}
        {(view === "home" || view === "guests") && <div className="dashboard-grid"><div className="main-stream">{view === "home" && <><section className="venue-hero"><img className="hero-image" src={BAR_ART} alt="Тёплый свет и барная стойка Места" /><div className="hero-shade" /><div className="hero-content"><span className="hero-eyebrow"><span />ТЫ В НУЖНОМ МЕСТЕ</span><h2>Твоё место.<br />Твои люди.</h2><p>Хорошие знакомства ближе, чем кажется.</p><div className="hero-actions"><button className="button primary" onClick={() => { setGuestTab("company"); navigate("guests"); }}>Найти компанию<ArrowUpRight size={17} /></button><button className="hero-about" onClick={() => navigate("about")}>О заведении<ArrowUpRight size={14} /></button></div></div><span className="hero-open"><span className="live-dot" />Открыто до 03:00</span><div className="hero-venue-mark">место<span>.</span><small>COCKTAILS & MUSIC</small></div><div className="hero-guests"><AvatarStack avatars={state.guests.slice(0, 3).map((guest) => guest.avatar)} size={23} max={3} /><span>Уже <b>{state.stats.here}</b> человека здесь</span></div></section><div className="stats-grid"><button className="stat-card" onClick={() => { setGuestTab("all"); navigate("guests"); }}><span className="metric-icon lime"><Users size={20} /></span><span><strong>{state.stats.here}<span className="stat-live">LIVE</span></strong><small>Гостя сейчас здесь</small></span><ArrowUpRight className="stat-arrow" size={15} /></button><button className="stat-card" onClick={() => { setGuestTab("company"); navigate("guests"); }}><span className="metric-icon lavender"><UserPlus size={20} /></span><span><strong>{state.stats.company}</strong><small>Ищут компанию</small></span><ArrowUpRight className="stat-arrow" size={15} /></button><button className="stat-card" onClick={() => navigate("connections")}><span className="metric-icon peach"><Handshake size={20} /></span><span><strong>{state.stats.connections}</strong><small>Новых знакомств</small></span><ArrowUpRight className="stat-arrow" size={15} /></button></div></>}
          <GuestsSection {...guestProps} preview={view === "home"} />{view === "home" && <div className="evening-note"><span className="note-sparkle"><Sparkles size={23} strokeWidth={1.4} /></span><div><h3>Не нужен идеальный повод. Достаточно «привет».</h3><p>Пара слов о себе поможет твоим людям тебя найти.</p></div><button onClick={profile} aria-label="Рассказать о себе"><ArrowUpRight size={21} /></button></div>}</div><aside className="right-rail"><Chat state={state} mutate={mutate} onGuest={guestProps.onSelect} onExpand={() => navigate("chat")} /><EventRail event={state.events[0]} {...eventProps} onAll={() => navigate("events")} /><button className="safe-space-note" onClick={() => navigate("rules")}><ShieldCheck size={17} /><span>Здесь безопасно быть собой.<small>Мы знакомим. Ты выбираешь.</small></span><ArrowUpRight size={13} /></button></aside></div>}
        {view === "chat" && <div className="dashboard-grid chat-page-grid"><Chat state={state} mutate={mutate} expanded onGuest={guestProps.onSelect} /><aside className="right-rail"><section className="panel room-guests"><div className="section-heading"><h2>С вами в пространстве</h2><span className="count-badge">{state.stats.here}</span></div>{state.guests.slice(0, 7).map((guest) => <button key={guest.id} onClick={() => setModal({ type: "guest", guest })}><Avatar src={guest.avatar} name={guest.name} size={36} online /><span><strong>{guest.name}</strong><small>{guest.status}</small></span><ChevronRight size={15} /></button>)}<button className="button secondary full" onClick={() => navigate("guests")}>Посмотреть всех<ArrowUpRight size={15} /></button></section><EventRail event={state.events[0]} {...eventProps} onAll={() => navigate("events")} /></aside></div>}
        {view === "connections" && <Connections state={state} onConnect={connect} onSelect={guestProps.onSelect} onMessage={guestProps.onMessage} onExplore={() => navigate("guests")} busy={busy} />}
        {view === "events" && <EventsView state={state} {...eventProps} />}
        {view === "about" && <VenuePanel state={state} onInvite={() => setModal({ type: "invite" })} onEvents={() => navigate("events")} />}
        {view === "rules" && <RulesPanel onProfile={profile} />}
        {view === "admin" && <AdminPanel state={state} mutate={mutate} onCreateEvent={() => setModal({ type: "create-event" })} onAnnounce={() => setModal({ type: "announcement" })} onInvite={() => setModal({ type: "invite" })} onEvent={eventProps.onSelect} notify={notify} busy={busy} />}
        <footer className="page-footer"><span>BAR SOCIAL<span>Не просто рядом. Вместе.</span></span><span><span className={`live-dot ${connected ? "" : "offline"}`} />{connected ? "Пространство обновляется вживую" : "Восстанавливаем соединение"}<span className="footer-separator">·</span>18+</span></footer>
      </main>
    </div>
    {modal?.type === "profile" && state.me && <ProfileDialog me={state.me} mutate={mutate} onClose={() => setModal(null)} notify={notify} />}
    {modal?.type === "invite" && <InviteDialog onClose={() => setModal(null)} notify={notify} />}
    {modal?.type === "filters" && <FiltersDialog value={filters} onApply={setFilters} onClose={() => setModal(null)} />}
    {modal?.type === "guest" && <GuestDialog guest={modal.guest} state={state} onClose={() => setModal(null)} onConnect={connect} onMessage={guestProps.onMessage} mutate={mutate} notify={notify} busy={busy} />}
    {modal?.type === "match" && state.me && <MatchDialog guest={modal.guest} me={state.me} onClose={() => setModal(null)} onMessage={() => setModal({ type: "dm", guest: modal.guest })} />}
    {modal?.type === "dm" && <Modal title={`Разговор с ${modal.guest.name}`} subtitle="Одно место. Взаимный интерес." className="dm-modal" onClose={() => setModal(null)}><Chat state={state} mutate={mutate} recipient={modal.guest} expanded /></Modal>}
    {modal?.type === "event" && activeEvent && <EventDialog event={activeEvent} onClose={() => setModal(null)} onJoin={join} busy={busy} />}
    {modal?.type === "create-event" && <CreateEventDialog mutate={mutate} onClose={() => setModal(null)} notify={notify} />}
    {modal?.type === "announcement" && <AnnouncementDialog mutate={mutate} onClose={() => setModal(null)} notify={notify} current={state.venue.announcement} />}
    {toast && <div className={`toast ${toast.error ? "error" : ""}`} role="status">{toast.error ? <CircleHelp size={20} /> : <CheckCircle2 size={20} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="Закрыть уведомление"><X size={16} /></button></div>}
  </div>;
}

function BarChartIcon() { return <Activity size={17} strokeWidth={1.65} />; }
