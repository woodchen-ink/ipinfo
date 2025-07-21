import type { Metadata, Viewport } from "next";
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
  title: "IP地址查询 - 精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情",
  description: "精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情",
  keywords: "IP查询,IPv4,IPv6,地理位置,运营商,ASN,网络信息,IP定位",
  authors: [{ name: "IP查询工具" }],
  creator: "IP查询工具",
  publisher: "IP查询工具",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "IP地址查询 - 精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情",
    description: "精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情",
    siteName: "IP地址查询",
  },
  twitter: {
    card: "summary_large_image",
    title: "IP地址查询 - 精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情",
    description: "精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
