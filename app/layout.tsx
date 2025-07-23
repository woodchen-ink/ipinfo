import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/sonner";
import DatabaseInitializer from "@/components/database-initializer";


export const metadata: Metadata = {
  metadataBase: new URL('https://ipinfo.czl.net'),
  title: {
    default: "IP地理位置查询工具 - 精确查询IPv4/IPv6地址信息",
    template: "%s | IP查询工具"
  },
  description: "专业的IP地理位置查询工具，支持IPv4/IPv6地址查询，提供详细的地理位置、运营商、ASN、网络拓扑等信息。快速、准确、免费的IP定位服务。",
  keywords: ["IP查询", "IPv4查询", "IPv6查询", "IP地理位置", "IP定位", "运营商查询", "ASN查询", "网络信息", "IP地址查询", "免费IP查询"],
  authors: [{ name: "CZL", url: "https://github.com/dnslin" }],
  creator: "CZL",
  publisher: "IP查询工具",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "https://ipinfo.czl.net",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://ipinfo.czl.net",
    title: "IP地理位置查询工具 - 精确查询IPv4/IPv6地址信息",
    description: "专业的IP地理位置查询工具，支持IPv4/IPv6地址查询，提供详细的地理位置、运营商、ASN、网络拓扑等信息。快速、准确、免费的IP定位服务。",
    siteName: "IP查询工具",
    images: [
      {
        url: "/favicon.ico",
        width: 32,
        height: 32,
        alt: "IP地理位置查询工具"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "IP地理位置查询工具 - 精确查询IPv4/IPv6地址信息",
    description: "专业的IP地理位置查询工具，支持IPv4/IPv6地址查询，提供详细的地理位置、运营商、ASN、网络拓扑等信息。",
  },
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code", 
    // yahoo: "your-yahoo-verification-code",
  },
  category: "technology",
  classification: "IP查询工具",
  referrer: "origin-when-cross-origin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C08259",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`sunai font-sans antialiased`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script defer src="https://analytics.czl.net/script.js" data-website-id="7871b00c-6f50-46e1-826a-30fc9b83e10b"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // 确保文档根元素始终有 sunai 类
                document.documentElement.classList.add('sunai');
                
                // 处理暗色模式切换
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-[rgb(var(--color-background))] text-[rgb(var(--color-text-primary))] transition-colors duration-300">
        <div id="root">
          {children}
        </div>
        <Toaster />
        <DatabaseInitializer />
      </body>
    </html>
  );
}
