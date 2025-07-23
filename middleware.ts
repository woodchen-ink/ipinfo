import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIP, getUserIPVersion, isValidIP } from "@/lib/ip-detection";

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // 解析子域名
  const subdomain = hostname.split(".")[0];

  // 检查是否是IP路径查询（如 /58.xx.xx.xx 或 /2001:db8::1）
  const pathname = url.pathname;
  if (pathname !== "/" && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    // 移除开头的斜杠，获取可能的IP地址
    let possibleIP = pathname.slice(1);
    
    // 处理URL解码
    possibleIP = decodeURIComponent(possibleIP);
    
    // 处理IPv6地址的特殊情况
    if (possibleIP.includes("%3A")) {
      possibleIP = possibleIP.replace(/%3A/g, ":");
    }
    
    // 验证是否是有效的IP地址
    if (isValidIP(possibleIP)) {
      // 这是一个有效的IP地址路径，添加到URL参数中
      url.searchParams.set("queryIP", possibleIP);
    }
  }

  // 获取客户端IP并添加到请求头
  const clientIP = getClientIP(request);
  if (clientIP) {
    url.searchParams.set("clientIP", clientIP);
  }

  // 处理不同的子域名路由
  switch (subdomain) {
    case "ip4":
      // 强制IPv4版本
      url.searchParams.set("ipVersion", "v4");
      url.searchParams.set("forceVersion", "true");
      break;

    case "ip6":
      // 强制IPv6版本
      url.searchParams.set("ipVersion", "v6");
      url.searchParams.set("forceVersion", "true");
      break;

    case "ip":
    default:
      // 自动检测或双栈支持
      const preferredVersion = getUserIPVersion(request);
      if (preferredVersion !== "dual") {
        url.searchParams.set(
          "ipVersion",
          preferredVersion === "IPv4" ? "v4" : "v6"
        );
      }
      break;
  }

  // 添加用户代理信息用于统计
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  url.searchParams.set("isMobile", isMobile.toString());

  // 添加地理位置hint（如果有Cloudflare等CDN提供）
  const cfCountry = request.headers.get("cf-ipcountry");
  if (cfCountry) {
    url.searchParams.set("cfCountry", cfCountry);
  }

  // 安全头设置
  const response = NextResponse.rewrite(url);

  // 安全相关头
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // CORS设置（API路由需要）
  if (url.pathname.startsWith("/api/")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  // 缓存设置
  if (url.pathname.startsWith("/api/query")) {
    response.headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了:
     * - api路由 (除了我们的查询API)
     * - _next/static (静态文件)
     * - _next/image (图像优化文件)
     * - favicon.ico (网站图标)
     * - 公共文件夹中的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
