"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, BellOff, Check, ChevronDown, LockKeyhole, Maximize2, MessageCircle, MoreHorizontal, Pin, Send, Smile } from "lucide-react";
import type { Guest, Mutate, SocialState } from "@/lib/types";
import { Avatar, timeLabel } from "./ui";

export function Chat({ state, mutate, expanded = false, recipient, onGuest, onExpand }: { state: SocialState; mutate: Mutate; expanded?: boolean; recipient?: Guest; onGuest?: (guest: Guest) => void; onExpand?: () => void }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const [menu, setMenu] = useState(false);
  const [reacting, setReacting] = useState<string | null>(null);
  const [reactionPending, setReactionPending] = useState(false);
  const feed = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const chatMessages = recipient ? state.directMessages.filter((message) => message.guestId === recipient.id || message.recipientId === recipient.id) : state.messages;
  const firstPaint = useRef(true);
  useEffect(() => {
    if (!feed.current) return;
    feed.current.scrollTop = firstPaint.current ? 0 : feed.current.scrollHeight;
    firstPaint.current = false;
  }, [chatMessages.length, recipient?.id]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    const result = await mutate("message", { body: draft.trim(), ...(recipient ? { recipientId: recipient.id } : {}) });
    if (result) { setDraft(""); setEmojis(false); input.current?.focus(); }
    setSending(false);
  }
  async function react(messageId: string, emoji: string) {
    if (reactionPending) return;
    setReactionPending(true);
    await mutate("reaction", { messageId, emoji });
    setReactionPending(false);
    setReacting(null);
  }
  return <section className={`chat-panel ${expanded ? "expanded" : ""} ${recipient ? "direct-chat" : ""}`}>
    {!recipient && <header className="chat-header"><div className="chat-heading"><MessageCircle size={19} /><h2>Общий чат</h2><span className="chat-live"><span className="live-dot" />LIVE</span></div><div className="chat-header-actions">{onExpand && <button className="icon-button small" aria-label="Развернуть чат" onClick={onExpand}><Maximize2 size={15} /></button>}<div className="popover-container"><button className="icon-button small" aria-label="Настройки чата" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={19} /></button>{menu && <div className="small-popover"><button onClick={async () => { await mutate("mute", { muted: !state.me?.muted }); setMenu(false); }}><BellOff size={16} />{state.me?.muted ? "Включить уведомления" : "Не беспокоить"}</button>{onExpand && <button onClick={() => { onExpand(); setMenu(false); }}><ArrowUpRight size={16} />Открыть общий чат</button>}</div>}</div></div></header>}
    {!recipient && state.venue.announcement && <div className="chat-pinned"><Pin size={14} /><div><span>От команды «Места»</span><p>{state.venue.announcement}</p></div></div>}
    {recipient && <div className="direct-chat-note"><LockKeyhole size={14} />Только вы и {recipient.name}. Интерес взаимный.</div>}
    <div className="chat-feed" ref={feed} aria-live="polite" aria-label={recipient ? "Личная переписка" : "Сообщения общего чата"}>
      {expanded && <div className="chat-day">Сегодня · Место</div>}
      {!chatMessages.length && <div className="chat-first-message"><span>👋</span><h3>Начните с простого «привет»</h3><p>Вы уже в одном месте — это отличный повод для разговора.</p>{recipient?.isDemo && <small>Это демо-профиль. Сообщения сохраняются, но автоматических ответов не будет.</small>}</div>}
      {chatMessages.map((message) => <div className={`chat-message ${message.author.staff ? "staff" : ""} ${message.guestId === state.me?.id ? "mine" : ""}`} key={message.id}>
        <button className="unstyled message-avatar" aria-label={`Профиль: ${message.author.name}`} onClick={() => { const guest = state.guests.find((person) => person.id === message.guestId); if (guest) onGuest?.(guest); }}><Avatar src={message.author.avatar} name={message.author.name} size={29} /></button>
        <div className="message-content"><div className="message-meta"><span>{message.guestId === state.me?.id ? "Вы" : message.author.name}{message.author.staff && <Check size={10} />}</span><time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time></div><p>{message.body}</p><div className="message-reactions">{message.reactions.map((reaction) => <button key={reaction.emoji} className={reaction.mine ? "my-reaction" : ""} disabled={reactionPending} onClick={() => react(message.id, reaction.emoji)} aria-label={`${reaction.emoji}: ${reaction.count}. Добавить или убрать реакцию`}>{reaction.emoji}<span>{reaction.count}</span></button>)}<div className="reaction-container"><button className="add-reaction" aria-label="Добавить реакцию" onClick={() => setReacting(reacting === message.id ? null : message.id)}><Smile size={13} /></button>{reacting === message.id && <div className="reaction-picker">{["💚", "🔥", "🙌", "🥂"].map((emoji) => <button key={emoji} disabled={reactionPending} onClick={() => react(message.id, emoji)}>{emoji}</button>)}</div>}</div></div></div>
      </div>)}
    </div>
    <div className="chat-compose-area">{state.me && !state.me.isHere && <div className="chat-away">Вы вышли из пространства. <button onClick={() => mutate("presence", { isHere: true })}>Я снова здесь</button></div>}<form className="chat-compose" onSubmit={send}><input ref={input} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} placeholder={recipient ? `Написать ${recipient.name}…` : "Скажи что-нибудь…"} aria-label="Текст сообщения" disabled={!state.me?.isHere} /><div className="emoji-container"><button type="button" className="icon-button small" aria-label="Выбрать эмодзи" onClick={() => setEmojis(!emojis)}><Smile size={18} /></button>{emojis && <div className="emoji-picker">{["👋", "💚", "🥂", "🔥", "🪩", "🙌", "😂", "✨"].map((emoji) => <button type="button" key={emoji} onClick={() => { setDraft((current) => current + emoji); setEmojis(false); input.current?.focus(); }}>{emoji}</button>)}</div>}</div><button type="submit" className="send-button" disabled={!draft.trim() || sending || !state.me?.isHere} aria-label="Отправить сообщение"><Send size={17} /></button></form><p className="chat-privacy">{state.me?.muted && !recipient ? <><BellOff size={11} />Уведомления отключены</> : <><LockKeyhole size={11} />{recipient ? "Личный разговор остаётся личным" : "Только для тех, кто сейчас здесь"}</>}</p></div>
    {expanded && !recipient && <div className="chat-bottom"><span className="live-dot" />{state.stats.here} гостя в пространстве<ChevronDown size={13} /></div>}
  </section>;
}
