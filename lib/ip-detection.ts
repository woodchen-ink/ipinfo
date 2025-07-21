import { NextRequest } from "next/server";

// IP版本检测
export function detectIPVersion(ip: string): "IPv4" | "IPv6" | "invalid" {
  // 去除空格和其他字符
  const cleanIP = ip.trim();

  // IPv4正则表达式
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6正则表达式（完整和压缩格式）
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  if (ipv4Regex.test(cleanIP)) return "IPv4";
  if (ipv6Regex.test(cleanIP)) return "IPv6";
  return "invalid";
}

// 获取客户端真实IP地址
export function getClientIP(request: NextRequest): string | null {
  // 按优先级尝试不同的header
  const headers = [
    "x-real-ip",
    "x-forwarded-for",
    "x-client-ip",
    "cf-connecting-ip", // Cloudflare
    "x-vercel-forwarded-for", // Vercel
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for可能包含多个IP，取第一个
      const ips = value.split(",").map((ip) => ip.trim());
      const firstIP = ips[0];

      // 验证IP格式
      if (detectIPVersion(firstIP) !== "invalid") {
        return firstIP;
      }
    }
  }

  return null;
}

// 获取用户首选IP版本
export function getUserIPVersion(
  request: NextRequest
): "IPv4" | "IPv6" | "dual" {
  const url = request.nextUrl;
  const forcedVersion = url.searchParams.get("ipVersion");

  // 检查URL参数强制指定版本
  if (forcedVersion === "v4") return "IPv4";
  if (forcedVersion === "v6") return "IPv6";

  // 检查子域名
  const hostname = request.headers.get("host") || "";
  const subdomain = hostname.split(".")[0];

  if (subdomain === "ip4") return "IPv4";
  if (subdomain === "ip6") return "IPv6";

  // 自动检测客户端IP版本
  const clientIP = getClientIP(request);
  if (clientIP) {
    const version = detectIPVersion(clientIP);
    if (version !== "invalid") return version;
  }

  return "dual";
}

// 验证IP地址格式
export function isValidIP(ip: string): boolean {
  return detectIPVersion(ip) !== "invalid";
}

// 判断是否为私有/内网IP
export function isPrivateIP(ip: string): boolean {
  const version = detectIPVersion(ip);

  if (version === "IPv4") {
    const parts = ip.split(".").map(Number);
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  if (version === "IPv6") {
    const lowerIP = ip.toLowerCase();
    // ::1 (localhost)
    if (lowerIP === "::1") return true;
    // fe80::/10 (link-local)
    if (lowerIP.startsWith("fe80:")) return true;
    // fc00::/7 (unique local)
    if (lowerIP.startsWith("fc") || lowerIP.startsWith("fd")) return true;
  }

  return false;
}
