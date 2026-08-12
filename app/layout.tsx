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
    description: "一命一盘，千股寻缘。以五行、星曜、卦宫与灵数探索你的 A 股缘分签。",
    metadataBase: new URL(origin),
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "玄鉴｜一命一盘，千股寻缘",
      description: "以生辰启局，让五行、星曜、卦宫与灵数穿过近五千只 A 股。",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "玄鉴命理投研罗盘" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "玄鉴｜命理投研罗盘",
      description: "一命一盘，千股寻缘。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
