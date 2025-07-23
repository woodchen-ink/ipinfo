import { Metadata } from "next";
import { isValidIP, detectIPVersion } from "@/lib/ip-detection";

interface Props {
  params: Promise<{ ip: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 解码 IP 地址
  const { ip: rawIP } = await params;
  const ip = decodeURIComponent(rawIP);
  
  // 验证 IP 地址
  if (!isValidIP(ip)) {
    return {
      title: "无效的IP地址",
      description: `IP地址 ${ip} 格式无效，请输入正确的IPv4或IPv6地址进行查询。`,
      robots: { index: false, follow: false }
    };
  }

  const ipVersion = detectIPVersion(ip);
  
  return {
    title: `${ip} - ${ipVersion}地址查询结果`,
    description: `查询${ipVersion}地址 ${ip} 的详细地理位置信息，包括国家、城市、运营商、ASN等网络信息。专业的IP地理位置查询工具。`,
    keywords: [`${ip}`, `${ipVersion}查询`, "IP地理位置", "运营商查询", "ASN查询", "网络信息"],
    openGraph: {
      title: `${ip} - ${ipVersion}地址查询结果 | IP查询工具`,
      description: `查询${ipVersion}地址 ${ip} 的详细地理位置信息，包括国家、城市、运营商、ASN等网络信息。`,
      url: `https://ipinfo.czl.net/${encodeURIComponent(ip)}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${ip} - ${ipVersion}地址查询结果`,
      description: `查询${ipVersion}地址 ${ip} 的详细地理位置信息，包括国家、城市、运营商、ASN等网络信息。`,
    },
    alternates: {
      canonical: `https://ipinfo.czl.net/${encodeURIComponent(ip)}`,
    },
  };
}

export default function IPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}