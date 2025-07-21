import NodeCache from "node-cache";
import { NominatimResult, GeocodeConfig, CoordinateResult } from "./types";

/**
 * 地理编码服务
 * 负责将地理位置信息转换为经纬度坐标
 */
export class GeocodeService {
  private cache: NodeCache;
  private config: GeocodeConfig;
  private lastRequestTime = 0;

  constructor(config?: Partial<GeocodeConfig>) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 7 * 24 * 60 * 60, // 7天
      requestTimeout: 15000, // 增加到15秒，给Nominatim API更多时间
      maxRetries: 2, // 减少重试次数，避免总时间过长
      rateLimitDelay: 1000, // 1秒
      nominatimBaseUrl: "https://map.447654.xyz/search",
      ...config,
    };

    this.cache = new NodeCache({
      stdTTL: this.config.cacheTTL,
      checkperiod: 600, // 10分钟检查一次过期
    });
  }

  /**
   * 获取坐标信息
   * 优先使用GeoCN原始坐标，缺失时调用Nominatim API
   */
  async getCoordinates(
    geocnLat?: number,
    geocnLng?: number,
    province?: string,
    city?: string,
    district?: string
  ): Promise<CoordinateResult | null> {
    // 首先检查GeoCN原始坐标
    if (geocnLat && geocnLng && geocnLat !== 0 && geocnLng !== 0) {
      return {
        latitude: geocnLat,
        longitude: geocnLng,
        accuracy: "high",
        source: "geocn",
      };
    }

    // 构建地理位置查询字符串
    const locationQuery = this.buildLocationQuery(province, city, district);
    if (!locationQuery) {
      return null;
    }

    // 检查缓存
    if (this.config.cacheEnabled) {
      const cached = this.cache.get<CoordinateResult>(locationQuery);
      if (cached) {
        return cached;
      }
    }

    // 调用Nominatim API
    try {
      const coordinates = await this.geocodeLocation(locationQuery);

      if (coordinates && this.config.cacheEnabled) {
        this.cache.set(locationQuery, coordinates);
      }

      return coordinates;
    } catch (error) {
      console.warn(
        `地理编码失败 "${locationQuery}":`,
        error instanceof Error ? error.message : error
      );

      if (this.config.cacheEnabled) {
        this.cache.set(locationQuery, null, 3600);
      }

      return null;
    }
  }

  /**
   * 智能构建地理位置查询字符串
   */
  private buildLocationQuery(
    province?: string,
    city?: string,
    district?: string
  ): string | null {
    const parts: string[] = [];

    // 添加省份信息
    if (province) {
      parts.push(province);
    }

    // 添加城市信息
    if (city) {
      // 去除常见的市、县等后缀以提高匹配率
      const cleanCity = city.replace(/[市县区]$/, "");
      if (cleanCity && cleanCity !== province?.replace(/[省市]$/, "")) {
        parts.push(cleanCity);
      }
    }

    // 添加区县信息
    if (district) {
      const cleanDistrict = district.replace(/[区县]$/, "");
      if (cleanDistrict && cleanDistrict !== city?.replace(/[市县区]$/, "")) {
        parts.push(cleanDistrict);
      }
    }

    if (parts.length === 0) {
      return null;
    }

    // 组合查询字符串，添加中国以提高准确性
    return parts.join(" ") + " 中国";
  }

  /**
   * 调用Nominatim API获取坐标
   */
  private async geocodeLocation(
    query: string
  ): Promise<CoordinateResult | null> {
    // 实现请求限频
    await this.enforceRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const url = new URL(this.config.nominatimBaseUrl);
        url.searchParams.set("format", "json");
        url.searchParams.set("q", query);
        url.searchParams.set("limit", "1");
        url.searchParams.set("accept-language", "zh-CN");

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.requestTimeout
        );

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            "User-Agent": "IPInfo-Geocoder/1.0",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const results: NominatimResult[] = await response.json();

        if (results.length > 0) {
          const result = results[0];
          console.log(
            `Nominatim返回结果: ${result.display_name} (${result.lat}, ${result.lon})`
          );
          return {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            accuracy: "medium",
            source: "nominatim",
          };
        }

        console.log(`Nominatim未找到 "${query}" 的结果`);
        return null;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`第${attempt + 1}次尝试失败:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          // 指数退避重试
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`等待${delay}ms后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("地理编码失败");
  }

  /**
   * 实现请求限频控制
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      const waitTime = this.config.rateLimitDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.flushAll();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

// 导出全局实例
export const globalGeocodeService = new GeocodeService();
