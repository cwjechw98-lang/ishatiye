import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../../src/app/globals.css";

export const metadata: Metadata = {
  title: "BAR SOCIAL — браузерное демо",
  description: "Демонстрация барного сообщества. Данные и действия хранятся только в вашем браузере.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
