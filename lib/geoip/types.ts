import type { City, Asn } from "@maxmind/geoip2-node";
import type { Names } from "@maxmind/geoip2-node/dist/src/records";

// MaxMind City查询结果类型（基于@maxmind/geoip2-node的City类型）
export type MaxMindCityResult = City;

// MaxMind ASN查询结果类型（基于@maxmind/geoip2-node的Asn类型）
export type MaxMindASNResult = Asn;

// 重新导出Names类型供其他模块使用
export type { Names };

// GeoCN数据库查询结果
export interface GeoCNResult {
  country?: string;
  province?: string;
  city?: string;
  district?: string;
  isp?: string;
  type?: string;
  desc?: string;
  lat?: number;
  lng?: number;
}

// 数据源信息
export interface DataSourceInfo {
  source: "maxmind" | "geocn";
  accuracy: number;
  completeness: number;
  timestamp: number;
}

// 原始查询结果包装
export interface RawQueryResult {
  sourceInfo: DataSourceInfo;
  cityData?: City | GeoCNResult;
  asnData?: Asn;
}

// 缓存条目
export interface CacheEntry {
  data: import("../store").IPInfo;
  timestamp: number;
  hits: number;
  ttl: number;
}

// 查询配置
export interface QueryConfig {
  enableCache: boolean;
  maxCacheSize: number;
  defaultTTL: number;
  preferredSource: "auto" | "maxmind" | "geocn";
  fallbackEnabled: boolean;
}

// 错误类型
export class GeoIPError extends Error {
  constructor(
    message: string,
    public code:
      | "DB_NOT_FOUND"
      | "INVALID_IP"
      | "QUERY_FAILED"
      | "MERGE_FAILED",
    public source?: string
  ) {
    super(message);
    this.name = "GeoIPError";
  }
}

