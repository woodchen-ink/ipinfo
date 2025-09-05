import { IPInfo } from "../store";

/**
 * MaxMind Web API 响应接口
 */
interface MaxMindResponse {
  continent?: {
    code: string;
    names: {
      en: string;
      'zh-CN'?: string;
    };
  };
  country?: {
    iso_code: string;
    names: {
      en: string;
      'zh-CN'?: string;
    };
  };
  subdivisions?: Array<{
    iso_code: string;
    names: {
      en: string;
      'zh-CN'?: string;
    };
  }>;
  city?: {
    names: {
      en: string;
      'zh-CN'?: string;
    };
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy_radius: number;
    time_zone: string;
  };
  postal?: {
    code: string;
  };
  traits?: {
    ip_address: string;
    network: string;
  };
  // ASN数据
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
  network?: string;
}

/**
 * MaxMind Web API 后备服务
 * 当本地数据库查询失败时使用
 */
export class MaxMindFallbackService {
  private readonly baseUrl = "https://geoip.maxmind.com/geoip/v2.1";
  private readonly accountId: string | null;
  private readonly licenseKey: string | null;
  
  constructor() {
    this.accountId = process.env.MAXMIND_ACCOUNT_ID || null;
    this.licenseKey = process.env.MAXMIND_LICENSE_KEY || null;
    
    if (!this.accountId || !this.licenseKey) {
      console.warn("MaxMind credentials not configured, MaxMind fallback service disabled");
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.accountId !== null && this.licenseKey !== null;
  }

  /**
   * 查询IP信息作为后备方案
   */
  async queryIP(ip: string): Promise<IPInfo | null> {
    if (!this.isAvailable()) {
      console.log("MaxMind fallback service not available (credentials not configured)");
      return null;
    }

    try {
      // 同时查询城市和ASN信息
      const [cityData, asnData] = await Promise.allSettled([
        this.queryEndpoint('city', ip),
        this.queryEndpoint('asn', ip)
      ]);

      const cityResult = cityData.status === 'fulfilled' ? cityData.value : null;
      const asnResult = asnData.status === 'fulfilled' ? asnData.value : null;

      if (!cityResult && !asnResult) {
        console.log(`MaxMind API: No data found for IP ${ip}`);
        return null;
      }

      return this.transformResponse(ip, cityResult, asnResult);
      
    } catch (error) {
      console.error("MaxMind fallback query failed:", error);
      return null;
    }
  }

  /**
   * 查询特定的MaxMind端点
   */
  private async queryEndpoint(endpoint: 'city' | 'asn', ip: string): Promise<MaxMindResponse | null> {
    const url = `${this.baseUrl}/${endpoint}/${ip}`;
    const credentials = Buffer.from(`${this.accountId}:${this.licenseKey}`).toString('base64');
    
    console.log(`Querying MaxMind ${endpoint} API for IP: ${ip}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json',
          'User-Agent': 'IPInfo-Query-App/1.0'
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`MaxMind API: ${endpoint} data not found for IP ${ip}`);
          return null;
        }
        console.error(`MaxMind ${endpoint} API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: MaxMindResponse = await response.json();
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`MaxMind ${endpoint} API request timeout for IP: ${ip}`);
      } else {
        console.error(`MaxMind ${endpoint} API request failed:`, error);
      }
      return null;
    }
  }

  /**
   * 将MaxMind API响应转换为应用程序格式
   */
  private transformResponse(ip: string, cityData: MaxMindResponse | null, asnData: MaxMindResponse | null): IPInfo {
    // 优先使用中文名称，回退到英文
    const getLocalizedName = (names: { en: string; 'zh-CN'?: string } | undefined) => {
      if (!names) return "未知";
      return names['zh-CN'] || names.en || "未知";
    };

    const country = cityData?.country ? getLocalizedName(cityData.country.names) : "未知";
    const countryCode = cityData?.country?.iso_code || "UNKNOWN";
    
    // 获取省份信息
    const province = cityData?.subdivisions?.[0] ? getLocalizedName(cityData.subdivisions[0].names) : undefined;
    const provinceCode = cityData?.subdivisions?.[0]?.iso_code;
    
    // 获取城市信息
    const city = cityData?.city ? getLocalizedName(cityData.city.names) : undefined;
    
    // 位置信息
    const location = cityData?.location ? {
      latitude: cityData.location.latitude,
      longitude: cityData.location.longitude,
      accuracy_radius: cityData.location.accuracy_radius || 0,
    } : {
      latitude: 0,
      longitude: 0,
      accuracy_radius: 0,
    };

    // ASN信息
    const asInfo = asnData?.autonomous_system_number ? {
      number: asnData.autonomous_system_number,
      name: asnData.autonomous_system_organization || "未知运营商",
      info: asnData.network
    } : undefined;

    return {
      ip,
      country,
      countryCode,
      province,
      provinceCode,
      city,
      location,
      accuracy: cityData?.location ? "high" as const : "medium" as const,
      source: "MaxMind" as const,
      ipVersion: ip.includes(':') ? "IPv6" : "IPv4",
      isp: asnData?.autonomous_system_organization || "未知运营商",
      as: asInfo,
      timezone: cityData?.location?.time_zone || "UTC",
      postal: cityData?.postal?.code,
      registered_country: {
        code: countryCode,
        name: country
      }
    };
  }
}

// 导出全局实例
export const maxmindFallback = new MaxMindFallbackService();