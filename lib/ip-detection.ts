import { NextRequest } from "next/server";

// 代理检测结果接口
export interface ProxyDetectionResult {
  headerIP: string | null;
  domesticIP: string | null;
  foreignIP: string | null;
  isUsingProxy: boolean;
  proxyType: "direct" | "domestic" | "foreign" | "mixed" | "unknown";
  confidence: number; // 检测置信度 0-1
  errors: string[]; // API调用错误信息
  detectionTime: number; // 检测耗时(ms)
}

// 外部IP检测源配置
export interface IPDetectionSource {
  name: string;
  url: string;
  parser: (response: string) => string | null;
  timeout: number;
}

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

// 外部IP检测源配置
export const IP_DETECTION_SOURCES: IPDetectionSource[] = [
  {
    name: "国内源(IPIP.NET)",
    url: "https://myip.ipip.net/",
    parser: (response: string) => {
      // 解析格式：当前 IP：14.118.135.203  来自于：中国 广东 中山  电信
      const match = response.match(/当前 IP：(\d+\.\d+\.\d+\.\d+)/);
      return match ? match[1] : null;
    },
    timeout: 5000,
  },
  {
    name: "国外源(IPINFO.IO)",
    url: "https://ipinfo.io/ip",
    parser: (response: string) => {
      // 返回纯IP地址
      const ip = response.trim();
      return detectIPVersion(ip) !== "invalid" ? ip : null;
    },
    timeout: 5000,
  },
];

/**
 * 从外部API获取IP地址
 * @param source IP检测源配置
 * @returns Promise<string | null> 获取到的IP地址或null
 */
async function fetchExternalIP(
  source: IPDetectionSource
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), source.timeout);

    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    return source.parser(text);
  } catch (error) {
    console.error(`获取外部IP失败 (${source.name}):`, error);
    return null;
  }
}

/**
 * 分析代理类型
 * @param headerIP 从HTTP headers获取的IP
 * @param domesticIP 从国内API获取的IP
 * @param foreignIP 从国外API获取的IP
 * @returns 代理类型和置信度
 */
function analyzeProxyType(
  headerIP: string | null,
  domesticIP: string | null,
  foreignIP: string | null
): { proxyType: ProxyDetectionResult["proxyType"]; confidence: number } {
  const ips = [headerIP, domesticIP, foreignIP].filter(Boolean);

  // 如果获取的IP数量不足，置信度较低
  if (ips.length < 2) {
    return { proxyType: "unknown", confidence: 0.3 };
  }

  // 所有IP都相同 - 直连
  if (ips.length >= 2 && ips.every((ip) => ip === ips[0])) {
    return { proxyType: "direct", confidence: 0.9 };
  }

  // 分析不同的组合
  if (headerIP && domesticIP && foreignIP) {
    if (headerIP === domesticIP && headerIP !== foreignIP) {
      // headers IP = 国内IP ≠ 国外IP，可能使用国外代理
      return { proxyType: "foreign", confidence: 0.8 };
    }

    if (headerIP === foreignIP && headerIP !== domesticIP) {
      // headers IP = 国外IP ≠ 国内IP，可能使用国内代理
      return { proxyType: "domestic", confidence: 0.8 };
    }

    if (
      headerIP !== domesticIP &&
      headerIP !== foreignIP &&
      domesticIP !== foreignIP
    ) {
      // 三个IP都不同，复杂的代理环境
      return { proxyType: "mixed", confidence: 0.7 };
    }
  }

  // 其他情况
  return { proxyType: "unknown", confidence: 0.5 };
}

/**
 * 检测代理使用情况（服务端版本）
 * @param request NextRequest对象，用于获取headers中的IP
 * @returns Promise<ProxyDetectionResult> 代理检测结果
 */
export async function detectProxy(
  request?: NextRequest
): Promise<ProxyDetectionResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // 1. 获取headers中的IP
  const headerIP = request ? getClientIP(request) : null;

  // 2. 并行获取外部IP
  const externalIPPromises = IP_DETECTION_SOURCES.map(async (source) => {
    try {
      const ip = await fetchExternalIP(source);
      return { source: source.name, ip };
    } catch (error) {
      const errorMsg = `${source.name} 获取失败: ${
        error instanceof Error ? error.message : "未知错误"
      }`;
      errors.push(errorMsg);
      return { source: source.name, ip: null };
    }
  });

  const results = await Promise.allSettled(externalIPPromises);

  // 3. 提取结果
  let domesticIP: string | null = null;
  let foreignIP: string | null = null;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const { source, ip } = result.value;
      if (source.includes("国内")) {
        domesticIP = ip;
      } else if (source.includes("国外")) {
        foreignIP = ip;
      }
    } else {
      errors.push(
        `${IP_DETECTION_SOURCES[index].name} 请求失败: ${result.reason}`
      );
    }
  });

  // 4. 分析代理类型
  const { proxyType, confidence } = analyzeProxyType(
    headerIP,
    domesticIP,
    foreignIP
  );

  // 5. 判断是否使用代理
  const isUsingProxy = proxyType !== "direct" && proxyType !== "unknown";

  const detectionTime = Date.now() - startTime;

  return {
    headerIP,
    domesticIP,
    foreignIP,
    isUsingProxy,
    proxyType,
    confidence,
    errors,
    detectionTime,
  };
}

/**
 * 检测代理使用情况（客户端版本）
 * 直接在浏览器中调用外部API，用户可以在控制台看到网络请求
 * @param headerIP 从服务端获取的headers IP
 * @returns Promise<ProxyDetectionResult> 代理检测结果
 */
export async function detectProxyClient(
  headerIP: string | null = null
): Promise<ProxyDetectionResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log("开始客户端代理检测...", { headerIP });

  // 并行获取外部IP
  const externalIPPromises = IP_DETECTION_SOURCES.map(async (source) => {
    try {
      console.log(`正在请求 ${source.name}: ${source.url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), source.timeout);

      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      const ip = source.parser(text);

      console.log(`${source.name} 返回结果:`, { rawText: text, parsedIP: ip });

      return { source: source.name, ip };
    } catch (error) {
      const errorMsg = `${source.name} 获取失败: ${
        error instanceof Error ? error.message : "未知错误"
      }`;
      console.error(errorMsg, error);
      errors.push(errorMsg);
      return { source: source.name, ip: null };
    }
  });

  const results = await Promise.allSettled(externalIPPromises);

  // 提取结果
  let domesticIP: string | null = null;
  let foreignIP: string | null = null;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const { source, ip } = result.value;
      if (source.includes("国内")) {
        domesticIP = ip;
      } else if (source.includes("国外")) {
        foreignIP = ip;
      }
    } else {
      errors.push(
        `${IP_DETECTION_SOURCES[index].name} 请求失败: ${result.reason}`
      );
    }
  });

  // 分析代理类型
  const { proxyType, confidence } = analyzeProxyType(
    headerIP,
    domesticIP,
    foreignIP
  );

  // 判断是否使用代理
  const isUsingProxy = proxyType !== "direct" && proxyType !== "unknown";

  const detectionTime = Date.now() - startTime;

  const result = {
    headerIP,
    domesticIP,
    foreignIP,
    isUsingProxy,
    proxyType,
    confidence,
    errors,
    detectionTime,
  };

  console.log("客户端代理检测完成:", result);

  return result;
}
