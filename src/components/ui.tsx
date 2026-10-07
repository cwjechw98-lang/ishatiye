"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { ArrowUpRight, X, type LucideIcon } from "lucide-react";

export function Avatar({ src, name = "Гость", size = 40, online = false, className = "" }: { src: string; name?: string; size?: number; online?: boolean; className?: string }) {
  return <span className={`avatar ${className}`} style={{ width: size, height: size }}><span className="avatar-fallback">{name.charAt(0)}</span><img src={src} alt={name} width={size} height={size} loading="lazy" />{online && <span className="online-dot" />}</span>;
}

export function AvatarStack({ avatars, size = 27, max = 4 }: { avatars: string[]; size?: number; max?: number }) {
  return <div className="avatar-stack">{avatars.slice(0, max).map((avatar, index) => <Avatar key={`${avatar}-${index}`} src={avatar} size={size} name="Участник" />)}</div>;
}

export function Modal({ title, subtitle, onClose, children, className = "" }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = old; };
  }, []);
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-inner"><header className="modal-header"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Закрыть окно"><X size={20} /></button></header>{children}</div>
  </dialog>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={30} strokeWidth={1.4} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function SectionHeading({ title, count, action, onAction }: { title: string; count?: number; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div className="section-title"><h2>{title}</h2>{count !== undefined && <span className="count-badge">{count}</span>}</div>{action && <button className="text-link" onClick={onAction}>{action}<ArrowUpRight size={15} /></button>}</div>;
}

export function eventDate(value: string, includeTime = true) {
  const date = new Date(value);
  const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" });
  const today = dayFormat.format(new Date());
  const tomorrow = dayFormat.format(new Date(Date.now() + 86400000));
  const day = dayFormat.format(date);
  const label = day === today ? "Сегодня" : day === tomorrow ? "Завтра" : date.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" });
  return includeTime ? `${label}, ${time}` : label;
}

export function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" });
}
