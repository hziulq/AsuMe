import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")),
  title: "英単語アプリ AsuMe",
  description: "自分だけの単語帳を作って、効率的に英語を学習できるアプリ",
  openGraph: {
    title: "英単語アプリ AsuMe",
    description: "英単語を入力するだけで、TOEICに特化した実践的な例文やネイティブ音声を自動生成！自分だけの単語帳を作って効率的に学習できるブラウザ完結型アプリ。",
    siteName: "AsuMe",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/ogp-image.png",
        width: 1200,
        height: 630,
        alt: "英単語アプリ AsuMe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "英単語アプリ AsuMe",
    description: "英単語を入力するだけで、TOEICに特化した実践的な例文やネイティブ音声を自動生成！自分だけの単語帳を作って効率的に学習できるブラウザ完結型アプリ。",
    images: ["/ogp-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
