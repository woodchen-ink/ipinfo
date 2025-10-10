/**
 * 内存限速服务
 * 基于 IP 地址的请求频率限制
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
  firstRequestTime: number;
}

interface RateLimitConfig {
  windowMs: number; // 时间窗口（毫秒）
  maxRequests: number; // 最大请求数
}

class RateLimiter {
  private records: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanup();
  }

  /**
   * 检查是否超过限速
   * @param key 限速键（通常是 IP 地址）
   * @returns 是否允许请求及剩余信息
   */
  checkLimit(key: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    total: number;
  } {
    const now = Date.now();
    let record = this.records.get(key);

    // 如果没有记录或已过期，创建新记录
    if (!record || now >= record.resetTime) {
      record = {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequestTime: now,
      };
      this.records.set(key, record);

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: record.resetTime,
        total: this.config.maxRequests,
      };
    }

    // 更新计数
    record.count++;

    // 检查是否超限
    const allowed = record.count <= this.config.maxRequests;

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - record.count),
      resetTime: record.resetTime,
      total: this.config.maxRequests,
    };
  }

  /**
   * 重置指定键的限速记录
   */
  reset(key: string): void {
    this.records.delete(key);
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      if (now >= record.resetTime) {
        this.records.delete(key);
      }
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    // 每分钟清理一次过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // 确保 Node.js 进程可以正常退出
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * 停止清理定时器
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 获取当前限速统计
   */
  getStats(): {
    totalRecords: number;
    activeRecords: number;
    config: RateLimitConfig;
  } {
    const now = Date.now();
    let activeRecords = 0;

    for (const record of this.records.values()) {
      if (now < record.resetTime) {
        activeRecords++;
      }
    }

    return {
      totalRecords: this.records.size,
      activeRecords,
      config: this.config,
    };
  }
}

// 不同 API 端点的限速配置
export const rateLimitConfigs = {
  // 查询 API：每分钟 60 次
  query: new RateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 60,
  }),

  // BGP API：每分钟 20 次（因为会调用外部API）
  bgp: new RateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 20,
  }),

  // 代理检测 API：每分钟 10 次（因为会并发请求多个服务）
  proxyDetection: new RateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 10,
  }),

  // 默认限速：每分钟 100 次
  default: new RateLimiter({
    windowMs: 60 * 1000, // 1分钟
    maxRequests: 100,
  }),
};

/**
 * 根据路径获取对应的限速器
 */
export function getRateLimiter(path: string): RateLimiter {
  if (path.startsWith("/api/query")) {
    return rateLimitConfigs.query;
  }
  if (path.startsWith("/api/bgp")) {
    return rateLimitConfigs.bgp;
  }
  if (path.startsWith("/api/proxy-detection")) {
    return rateLimitConfigs.proxyDetection;
  }
  return rateLimitConfigs.default;
}

/**
 * 获取所有限速器的统计信息
 */
export function getAllRateLimitStats() {
  return {
    query: rateLimitConfigs.query.getStats(),
    bgp: rateLimitConfigs.bgp.getStats(),
    proxyDetection: rateLimitConfigs.proxyDetection.getStats(),
    default: rateLimitConfigs.default.getStats(),
  };
}

export { RateLimiter };
export type { RateLimitConfig, RateLimitRecord };
