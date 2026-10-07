import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAR SOCIAL — Твоё место. Твои люди.",
  description: "Живое пространство бара «Место». Узнай, кто рядом, найди компанию, начни разговор и стань частью хорошего вечера. Без скачивания приложения.",
  applicationName: "BAR SOCIAL",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#131511", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
