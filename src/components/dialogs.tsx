"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Ban, CalendarDays, Camera, Check, CheckCheck, Copy, Download, EyeOff, Flag, Hand, Heart, Link2, Loader2, LockKeyhole, MapPin, MessageCircle, QrCode, ShieldCheck, Users } from "lucide-react";
import { INTEREST_OPTIONS, INTENTIONS, type CurrentGuest, type Guest, type Intention, type Mutate, type SocialState, type VenueEvent } from "@/lib/types";
import { Avatar, AvatarStack, eventDate, Modal } from "./ui";
import { DEFAULT_FILTERS, type GuestFilters } from "./guests";

export function ProfileDialog({ me, mutate, onClose, notify }: { me: CurrentGuest; mutate: Mutate; onClose: () => void; notify: (message: string) => void }) {
  const [name, setName] = useState(me.name);
  const [age, setAge] = useState(me.age);
  const [bio, setBio] = useState(me.bio);
  const [avatar, setAvatar] = useState(me.avatar);
  const [intention, setIntention] = useState<Intention>(me.intention);
  const [interests, setInterests] = useState(me.interests);
  const [hidden, setHidden] = useState(me.hidden);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const result = await mutate("profile", { name, age, bio, avatar, intention, interests, hidden });
    setSaving(false);
    if (result) { notify("Профиль обновлён. Будьте собой — это притягивает."); onClose(); }
  }
  function upload(file?: File) {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Выберите JPG, PNG или WebP до 5 МБ."); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
      const size = Math.min(image.width, image.height);
      canvas.getContext("2d")?.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 256, 256);
      setAvatar(canvas.toDataURL("image/jpeg", 0.85)); URL.revokeObjectURL(url);
    };
    image.onerror = () => { setError("Не удалось прочитать фотографию."); URL.revokeObjectURL(url); };
    image.src = url;
  }
  return <Modal title="Просто будь собой" subtitle="Мини-профиль, с которого начинается знакомство" onClose={onClose} className="profile-modal"><form className="form-stack" onSubmit={save}><div className="profile-photo-field"><button type="button" onClick={() => fileInput.current?.click()} className="profile-photo-button" aria-label="Загрузить фото"><Avatar src={avatar} name={name} size={74} /><span><Camera size={15} /></span></button><div><strong>Тебя будет проще узнать</strong><p>Настоящее фото — лучший способ сказать «привет».</p><button type="button" className="text-link" onClick={() => fileInput.current?.click()}>Изменить фото<ArrowUpRight size={13} /></button></div><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => upload(event.target.files?.[0])} /></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-row"><label>Как тебя зовут<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={32} required placeholder="Имя или ник" /></label><label className="age-field">Возраст<input type="number" min={18} max={99} value={age} onChange={(event) => setAge(Number(event.target.value))} required /></label></div><label>Пара слов о себе<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={120} rows={2} placeholder="За чем ты сегодня здесь?" /><span className="field-hint">{bio.length}/120 · Не анкета. Просто повод заговорить.</span></label><fieldset><legend>Какой план на вечер?</legend><div className="intention-options">{(Object.keys(INTENTIONS) as Intention[]).map((key) => <button key={key} type="button" className={intention === key ? "selected" : ""} onClick={() => setIntention(key)}><span>{INTENTIONS[key].emoji}</span>{INTENTIONS[key].label}{intention === key && <Check size={13} />}</button>)}</div></fieldset><fieldset><legend>Что тебе интересно? <span>до 5 интересов</span></legend><div className="selectable-tags">{INTEREST_OPTIONS.map((interest) => <button type="button" key={interest} className={interests.includes(interest) ? "selected" : ""} disabled={!interests.includes(interest) && interests.length >= 5} onClick={() => setInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest])}>{interest}{interests.includes(interest) && <Check size={12} />}</button>)}</div></fieldset><label className="toggle-setting"><span><EyeOff size={18} /><span><strong>Режим невидимки</strong><small>Скрыть профиль из списка гостей</small></span></span><input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} /><span className="toggle-switch" /></label><button className="button primary full" disabled={saving}>{saving ? <Loader2 size={17} className="spin" /> : <Check size={17} />}Сохранить профиль</button><p className="privacy-note"><ShieldCheck size={13} />Твой профиль виден только в этом пространстве. 18+</p></form></Modal>;
}

export function InviteDialog({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    const invitation = new URL(window.location.pathname, window.location.origin);
    invitation.searchParams.set("venue", "mesto");
    const link = invitation.href;
    import("qrcode").then((module) => {
      if (!mounted) return null;
      setUrl(link);
      return module.toDataURL(link, { width: 480, margin: 2, color: { dark: "#192014", light: "#ffffff" }, errorCorrectionLevel: "M" });
    }).then((image) => { if (mounted && image) setQr(image); }).catch(() => { if (mounted) { setUrl(link); setError(true); } });
    return () => { mounted = false; };
  }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(url); notify("Ссылка скопирована. Хороший вечер лучше разделить!"); } catch { notify("Скопируйте ссылку из поля ниже."); }
  }
  return <Modal title="Хороший вечер лучше разделить" subtitle="Позови друзей в живое пространство «Места»" onClose={onClose} className="invite-modal"><div className="invite-content"><div className="qr-card"><div className="qr-brand">BAR<span>SOCIAL</span></div>{qr ? <img src={qr} alt="QR-код для входа в пространство бара Место" width={200} height={200} /> : <div className="qr-loading">{error ? <QrCode size={70} /> : <Loader2 className="spin" size={30} />}</div>}<strong>Твоё место. Твои люди.</strong><span>Сканируй. Знакомься. Будь здесь.</span></div><p className="invite-instruction">Камера → QR → вы с нами.<br /><span>Без скачиваний и длинных регистраций.</span></p><div className="copy-link-field"><Link2 size={16} /><input value={url} readOnly aria-label="Ссылка на пространство" onFocus={(event) => event.target.select()} /><button className="icon-button" onClick={copy} aria-label="Скопировать ссылку"><Copy size={16} /></button></div><button className="button primary full" onClick={copy}><Copy size={16} />Скопировать приглашение</button>{qr && <a className="button secondary full" href={qr} download="bar-social-mesto-qr.png"><Download size={16} />Скачать QR для стола</a>}<p className="privacy-note">Демонстрационное пространство · Только для гостей 18+</p></div></Modal>;
}

export function FiltersDialog({ value, onApply, onClose }: { value: GuestFilters; onApply: (filters: GuestFilters) => void; onClose: () => void }) {
  const [filters, setFilters] = useState(value);
  const [error, setError] = useState("");
  return <Modal title="Найди своих людей" subtitle="Общий интерес — уже тема для разговора" onClose={onClose}><form className="form-stack" onSubmit={(event) => { event.preventDefault(); if (filters.minAge > filters.maxAge) { setError("Минимальный возраст не может быть больше максимального."); return; } onApply(filters); onClose(); }}><fieldset><legend>Общие интересы</legend><div className="selectable-tags">{INTEREST_OPTIONS.map((interest) => <button type="button" key={interest} className={filters.interests.includes(interest) ? "selected" : ""} onClick={() => setFilters((current) => ({ ...current, interests: current.interests.includes(interest) ? current.interests.filter((item) => item !== interest) : [...current.interests, interest] }))}>{interest}{filters.interests.includes(interest) && <Check size={12} />}</button>)}</div><p className="field-hint">Покажем гостей хотя бы с одним из выбранных интересов.</p></fieldset><fieldset><legend>Возраст</legend><div className="form-row"><label>От<input type="number" min={18} max={99} required value={filters.minAge} onChange={(event) => setFilters({ ...filters, minAge: Number(event.target.value) })} /></label><label>До<input type="number" min={18} max={99} required value={filters.maxAge} onChange={(event) => setFilters({ ...filters, maxAge: Number(event.target.value) })} /></label></div></fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button secondary" onClick={() => { setFilters(DEFAULT_FILTERS); setError(""); }}>Сбросить</button><button className="button primary" type="submit">Показать гостей<ArrowRight size={16} /></button></div></form></Modal>;
}

export function GuestDialog({ guest, state, onClose, onConnect, onMessage, mutate, notify, busy }: { guest: Guest; state: SocialState; onClose: () => void; onConnect: (guest: Guest) => void; onMessage: (guest: Guest) => void; mutate: Mutate; notify: (message: string) => void; busy: boolean }) {
  const [safety, setSafety] = useState<"report" | "block" | null>(null);
  const [reason, setReason] = useState("");
  const matched = state.matches.some((person) => person.id === guest.id);
  const sent = state.outgoing.includes(guest.id);
  async function report(event: FormEvent) {
    event.preventDefault();
    const result = await mutate("report", { targetId: guest.id, reason });
    if (result) { notify("Жалоба передана команде заведения. Спасибо, что помогаете заботиться о пространстве."); onClose(); }
  }
  return <Modal title={safety === "report" ? "Расскажите, что случилось" : safety === "block" ? "Заблокировать гостя?" : "Человек твоего вечера"} onClose={onClose} className="guest-modal">{safety === "report" ? <form className="form-stack" onSubmit={report}><p className="muted">Жалобу на профиль «{guest.name}» увидит только команда заведения. Гость не узнает, кто её отправил.</p><label>Причина<textarea minLength={5} maxLength={500} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Опишите ситуацию…" required /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setSafety(null)}>Назад</button><button className="button primary" disabled={busy}><Flag size={16} />Отправить жалобу</button></div></form> : safety === "block" ? <div className="form-stack"><p className="muted">Вы и {guest.name} больше не будете видеть друг друга в списке гостей. Личные сообщения и проявление интереса станут недоступны.</p><div className="modal-actions"><button className="button secondary" onClick={() => setSafety(null)}>Отмена</button><button className="button danger" disabled={busy} onClick={async () => { const result = await mutate("block", { targetId: guest.id }); if (result) { notify("Гость заблокирован. Ваше спокойствие важнее всего."); onClose(); } }}><Ban size={16} />Заблокировать</button></div></div> : <div className="guest-profile"><Avatar src={guest.avatar} name={guest.name} size={100} online={guest.isHere} /><h3>{guest.name}, {guest.age}</h3><span className={`guest-status ${guest.intention}`}><span />{guest.status}</span><p className="profile-bio">{guest.bio}</p><div className="interest-tags profile-interests">{guest.interests.map((interest) => <span key={interest}>{interest}</span>)}</div><div className="profile-venue"><MapPin size={15} />Сейчас в «Месте»<span>·</span>Москва</div>{state.incoming.includes(guest.id) && !matched && <div className="incoming-note"><Heart size={16} />Вы уже понравились этому гостю</div>}<button className="button primary full" disabled={busy || (sent && !matched)} onClick={() => matched ? onMessage(guest) : onConnect(guest)}>{matched ? <><MessageCircle size={17} />Начать разговор</> : sent ? <><Check size={17} />Интерес отправлен</> : <><Hand size={17} />{state.incoming.includes(guest.id) ? "Ответить взаимностью" : "Помахать и познакомиться"}</>}</button><p className="privacy-note"><LockKeyhole size={12} />Личный чат откроется после взаимного интереса</p><div className="safety-actions"><button onClick={() => setSafety("report")}><Flag size={13} />Пожаловаться</button><button onClick={() => setSafety("block")}><Ban size={13} />Заблокировать</button></div>{guest.isDemo && <div className="demo-disclaimer">Демо-гость: можно проверить механику знакомств. Автоматических ответов в чате не будет.</div>}</div>}</Modal>;
}

export function MatchDialog({ guest, me, onClose, onMessage }: { guest: Guest; me: CurrentGuest; onClose: () => void; onMessage: () => void }) {
  return <Modal title="Кажется, вечер становится интереснее" onClose={onClose} className="match-modal"><div className="match-content"><div className="match-avatars"><Avatar src={me.avatar} name={me.name} size={95} /><span className="match-heart"><Heart size={25} fill="currentColor" /></span><Avatar src={guest.avatar} name={guest.name} size={95} /></div><span className="eyebrow lime">ОДНО МЕСТО. ВЗАИМНЫЙ ИНТЕРЕС.</span><h3>Это взаимно!</h3><p>Вы и {guest.name} интересны друг другу.<br />Самое время сказать «привет».</p><button className="button primary full" onClick={onMessage}><MessageCircle size={18} />Начать разговор<ArrowUpRight size={17} /></button><button className="button ghost full" onClick={onClose}>Продолжить вечер</button>{guest.isDemo && <p className="demo-disclaimer">Это демонстрация взаимного интереса с демо-профилем.</p>}</div></Modal>;
}

export function EventDialog({ event, onClose, onJoin, busy }: { event: VenueEvent; onClose: () => void; onJoin: (event: VenueEvent) => void; busy: boolean }) {
  return <Modal title={event.title} subtitle={event.category} onClose={onClose} className="event-modal"><img className="event-modal-image" src={event.image} alt={event.title} /><div className="event-modal-meta"><span><CalendarDays size={17} />{eventDate(event.startsAt)} · МСК</span><span><MapPin size={17} />{event.location}, «Место»</span></div><p className="event-modal-description">{event.description}</p><div className="event-modal-attendees"><AvatarStack avatars={event.attendeeAvatars} size={34} /><div><strong>{event.attendeeIds.length} уже идут</strong><span>{Math.max(0, event.capacity - event.attendeeIds.length)} свободных мест · 18+</span></div></div><button className={`button ${event.joined ? "secondary" : "primary"} full`} disabled={busy || (!event.joined && event.attendeeIds.length >= event.capacity)} onClick={() => onJoin(event)}>{event.joined ? <><CheckCheck size={18} />Вы в списке · Отменить участие</> : <><Users size={18} />Я иду<ArrowUpRight size={18} /></>}</button><p className="privacy-note">Вход свободный. Хорошее настроение приветствуется.</p></Modal>;
}

export function CreateEventDialog({ mutate, onClose, notify }: { mutate: Mutate; onClose: () => void; notify: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    const result = await mutate("create-event", { title: form.get("title"), description: form.get("description"), startsAt: `${form.get("date")}T${form.get("time")}:00+03:00`, category: form.get("category"), capacity: Number(form.get("capacity")) });
    setSaving(false);
    if (result) { notify("Событие опубликовано. Гости уже могут присоединяться."); onClose(); }
  }
  return <Modal title="Создать повод собраться" subtitle="Новое событие в «Месте»" onClose={onClose}><form className="form-stack" onSubmit={submit}><label>Название события<input name="title" minLength={3} maxLength={70} placeholder="Например, вечер винила" required /></label><label>О чём этот вечер<textarea name="description" rows={3} minLength={10} maxLength={1000} placeholder="Расскажите гостям, что их ждёт…" required /></label><div className="form-row"><label>Дата<input type="date" name="date" defaultValue={date} min={date} required /></label><label>Время · МСК<input type="time" name="time" defaultValue="21:00" required /></label></div><div className="form-row"><label>Формат<select name="category"><option>DJ-сет</option><option>Знакомства</option><option>Квиз</option><option>Настолки</option><option>Встреча</option></select></label><label>Количество мест<input type="number" name="capacity" min={2} max={500} defaultValue={50} required /></label></div><div className="info-box"><ShieldCheck size={17} /><p>Событие появится в демо-пространстве для всех гостей. Изображение будет подобрано по формату.</p></div><button className="button primary full" disabled={saving}>{saving ? <Loader2 size={17} className="spin" /> : <CalendarDays size={17} />}Опубликовать событие</button></form></Modal>;
}

export function AnnouncementDialog({ mutate, onClose, notify, current }: { mutate: Mutate; onClose: () => void; notify: (message: string) => void; current: string | null }) {
  const [body, setBody] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  return <Modal title="Слово команде бара" subtitle="Объявление появится в чате и будет закреплено сверху" onClose={onClose}><form className="form-stack" onSubmit={async (event) => { event.preventDefault(); setSaving(true); const result = await mutate("announcement", { body }); setSaving(false); if (result) { notify("Объявление отправлено и закреплено в общем чате."); onClose(); } }}><label>Сообщение гостям<textarea value={body} onChange={(event) => setBody(event.target.value)} rows={4} minLength={3} maxLength={240} required placeholder="Что сегодня происходит в Месте?" /><span className="field-hint">{body.length}/240 символов</span></label><button className="button primary full" disabled={saving}><MessageCircle size={17} />Отправить гостям</button></form></Modal>;
}
