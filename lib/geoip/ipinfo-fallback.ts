import { IPInfo } from "../store";

/**
 * IPInfo.io API 响应接口
 */
interface IPInfoResponse {
  ip: string;
  asn: string;
  as_name: string;
  as_domain: string;
  country_code: string;
  country: string;
  continent_code: string;
  continent: string;
}

/**
 * IPInfo.io 后备服务
 * 当本地数据库查询失败时使用
 */
export class IPInfoFallbackService {
  private readonly baseUrl = "https://api.ipinfo.io/lite";
  private readonly token: string | null;

  constructor() {
    this.token = process.env.IPINFO_TOKEN || null;
    
    if (!this.token) {
      console.warn("IPINFO_TOKEN environment variable not set, fallback service disabled");
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.token !== null;
  }

  /**
   * 查询IP信息作为后备方案
   */
  async queryIP(ip: string): Promise<IPInfo | null> {
    if (!this.isAvailable()) {
      console.log("IPInfo fallback service not available (token not configured)");
      return null;
    }

    try {
      const url = `${this.baseUrl}/${ip}?token=${this.token}`;
      console.log(`Querying IPInfo.io fallback for IP: ${ip}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'IPInfo-Query-App/1.0'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`IPInfo API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: IPInfoResponse = await response.json();
      
      // 转换为应用程序的IPInfo格式
      return this.transformResponse(data);
      
    } catch (error) {
      console.error("IPInfo fallback query failed:", error);
      return null;
    }
  }

  /**
   * 将IPInfo.io响应转换为应用程序格式
   */
  private transformResponse(response: IPInfoResponse): IPInfo {
    // 提取ASN编号
    const asnNumber = response.asn ? parseInt(response.asn.replace('AS', ''), 10) : undefined;
    
    return {
      ip: response.ip,
      country: response.country || "未知",
      countryCode: response.country_code || "UNKNOWN",
      // IPInfo.io lite版本不提供城市信息，所以使用默认值
      city: "未知",
      location: {
        latitude: 0,
        longitude: 0,
        accuracy_radius: 0,
      },
      accuracy: "low" as const, // 标记为低精度，因为缺少详细信息
      source: "MaxMind" as const, // 保持原有标记，避免UI显示问题
      ipVersion: response.ip.includes(':') ? "IPv6" : "IPv4",
      isp: response.as_name || "未知运营商",
      as: asnNumber ? {
        number: asnNumber,
        name: response.as_name,
        info: response.as_domain
      } : undefined,
      timezone: "UTC", // 默认时区
      // 添加标记表明这是后备数据
      registered_country: {
        code: response.country_code || "UNKNOWN",
        name: response.country || "未知"
      }
    };
  }
}

// 导出全局实例
export const ipinfoFallback = new IPInfoFallbackService();