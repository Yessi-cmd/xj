import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" ? "http" : "https";
  const origin = host ? `${protocol}://${host}` : "https://xuanjian.example";
  const socialImage = new URL("/og.png", origin).toString();

  return {
    title: {
      default: "玄鉴｜命理投研罗盘",
      template: "%s｜玄鉴",
    },
    description: "本命盘遇见今日流日。每天揭开六枚 A 股玄签，收藏缘分、回看星轨，仅作传统文化娱乐。",
    metadataBase: new URL(origin),
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "玄鉴｜命理投研罗盘",
      description: "本命盘遇见今日流日，每天揭开六枚 A 股玄签。传统文化娱乐体验。",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "玄鉴命理投研罗盘" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "玄鉴｜命理投研罗盘",
      description: "本命盘遇见今日流日，每天揭开六枚 A 股玄签。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>{children}</body>
    </html>
  );
}
