import { geoIPReader } from "./reader";
import { DataMerger } from "./merger";
import { globalIPCache } from "./cache";
import { GeoIPError } from "./types";
import { IPInfo } from "../store";
import { isPrivateIP, detectIPVersion } from "../ip-detection";
import { startupCheckService } from "./startup-check";

/**
 * 统一的IP地理位置查询接口
 * 集成数据库读取、数据合并和缓存功能
 */
export class GeoIPService {
  private initialized = false;

  /**
   * 初始化GeoIP服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 初始化数据库读取器（数据库下载已在middleware中处理）
      await geoIPReader.initialize();
      this.initialized = true;
      console.log("GeoIP服务初始化完成");
    } catch (error) {
      throw new GeoIPError(
        `GeoIP服务初始化失败: ${
          error instanceof Error ? error.message : "未知错误"
        }`,
        "DB_NOT_FOUND"
      );
    }
  }

  /**
   * 查询IP地理位置信息
   */
  async queryIPInfo(ip: string): Promise<IPInfo> {
    // 确保服务已初始化
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // 1. 检查缓存
      const cached = globalIPCache.get(ip);
      if (cached) {
        return cached;
      }

      // 2. 处理私有IP
      if (isPrivateIP(ip)) {
        const privateIPInfo = this.createPrivateIPInfo(ip);
        globalIPCache.set(ip, privateIPInfo);
        return privateIPInfo;
      }

      // 3. 查询数据库
      const rawResults = await geoIPReader.queryIP(ip);

      // 4. 合并数据源
      const mergedResult = await DataMerger.merge(ip, rawResults);

      // 5. 缓存结果
      globalIPCache.set(ip, mergedResult);

      return mergedResult;
    } catch (error) {
      console.error("IP查询失败:", error);

      // 如果查询失败，返回基础信息
      if (error instanceof GeoIPError) {
        throw error;
      }

      throw new GeoIPError(
        `IP查询失败: ${error instanceof Error ? error.message : "未知错误"}`,
        "QUERY_FAILED"
      );
    }
  }

  /**
   * 创建私有IP的信息
   */
  private createPrivateIPInfo(ip: string): IPInfo {
    const ipVersion = detectIPVersion(ip);

    return {
      ip,
      country: "私有网络",
      countryCode: "PRIVATE",
      city: "本地网络",
      location: {
        latitude: 0,
        longitude: 0,
        accuracy_radius: 0,
      },
      accuracy: "high",
      source: "MaxMind",
      ipVersion: ipVersion as "IPv4" | "IPv6",
      isp: "私有网络",
      timezone: "UTC",
    };
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return globalIPCache.getStats();
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): number {
    return globalIPCache.cleanupExpired();
  }

  /**
   * 预热缓存
   */
  async warmupCache(commonIPs: string[]): Promise<void> {
    await globalIPCache.warmup(commonIPs, (ip) => this.queryIPInfo(ip));
  }

  /**
   * 获取热点IP
   */
  getHotIPs(limit?: number) {
    return globalIPCache.getHotIPs(limit);
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    geoIPReader.destroy();
    globalIPCache.clear();
    this.initialized = false;
  }
}

// 全局服务实例
export const geoIPService = new GeoIPService();
