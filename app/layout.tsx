import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "自學小老師 Self-Teacher",
  description: "拍照學習，AI 老師為你量身打造課程與測驗",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gradient-to-br from-sky-50 via-amber-50 to-rose-50">
        {children}
      </body>
    </html>
  );
}
