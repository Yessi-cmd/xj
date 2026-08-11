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
    description: "以传统命理理解投资偏好，以 AShare 量化纪律筛选股票与基金。",
    metadataBase: new URL(origin),
    openGraph: {
      type: "website",
      locale: "zh_CN",
      title: "玄鉴｜观五行之势，守投资之衡",
      description: "命理偏好 15%，量化纪律 85%。一套可解释的股票与基金研究框架。",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "玄鉴命理投研罗盘" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "玄鉴｜命理投研罗盘",
      description: "观五行之势，守投资之衡。",
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
