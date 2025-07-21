import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from 'next/font/google';
import "./globals.css";

// 字体配置
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "极简IP查询 - 精确的IPv4/IPv6地理位置查询工具",
  description: "专业的IP地址查询工具，支持IPv4/IPv6双栈，提供精确的地理位置、运营商信息和网络详情查询服务。",
  keywords: "IP查询,IPv4,IPv6,地理位置,运营商,ASN,网络信息,IP定位",
  authors: [{ name: "极简IP查询团队" }],
  creator: "极简IP查询",
  publisher: "极简IP查询",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "极简IP查询 - 精确的IPv4/IPv6地理位置查询工具",
    description: "专业的IP地址查询工具，支持IPv4/IPv6双栈，提供精确的地理位置、运营商信息和网络详情查询服务。",
    siteName: "极简IP查询",
  },
  twitter: {
    card: "summary_large_image",
    title: "极简IP查询 - 精确的IPv4/IPv6地理位置查询工具",
    description: "专业的IP地址查询工具，支持IPv4/IPv6双栈，提供精确的地理位置、运营商信息和网络详情查询服务。",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased bg-white text-gray-900">
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
