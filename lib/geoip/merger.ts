import {
  RawQueryResult,
  MaxMindCityResult,
  MaxMindASNResult,
  GeoCNResult,
  GeoIPError,
  Names,
} from "./types";
import { IPInfo } from "../store";
import { detectIPVersion } from "../ip-detection";

/**
 * 数据源合并器
 * 智能合并MaxMind和GeoCN数据源的查询结果
 */
export class DataMerger {
  /**
   * 合并多个数据源的查询结果
   */
  static merge(ip: string, results: RawQueryResult[]): IPInfo {
    if (results.length === 0) {
      throw new GeoIPError("没有可用的查询结果进行合并", "MERGE_FAILED");
    }

    // 按数据质量排序（精度 * 完整性）
    const sortedResults = results.sort((a, b) => {
      const scoreA = a.sourceInfo.accuracy * a.sourceInfo.completeness;
      const scoreB = b.sourceInfo.accuracy * b.sourceInfo.completeness;
      return scoreB - scoreA;
    });

    // 获取IP版本
    const ipVersion = detectIPVersion(ip);

    // 中国IP优先使用GeoCN数据
    const isChineseIP = this.isChineseIP(ip);
    if (isChineseIP) {
      const geocnResult = sortedResults.find(
        (r) => r.sourceInfo.source === "geocn"
      );
      if (geocnResult) {
        return this.extractGeoCNData(ip, geocnResult, ipVersion);
      }
    }

    // 使用最高质量的数据源作为主要数据
    const primaryResult = sortedResults[0];

    if (primaryResult.sourceInfo.source === "geocn") {
      return this.extractGeoCNData(ip, primaryResult, ipVersion);
    } else {
      return this.extractMaxMindData(ip, primaryResult, ipVersion);
    }
  }

  /**
   * 检查是否为中国IP
   */
  private static isChineseIP(ip: string): boolean {
    // 基于常见的中国IP段进行初步判断
    // 这是一个简化的实现，实际应该基于查询结果判断
    const ipNum = this.ipToNumber(ip);

    // 一些常见的中国IP段（简化版本）
    const chineseRanges = [
      { start: this.ipToNumber("1.0.1.0"), end: this.ipToNumber("1.0.3.255") },
      {
        start: this.ipToNumber("14.0.0.0"),
        end: this.ipToNumber("14.255.255.255"),
      },
      {
        start: this.ipToNumber("27.0.0.0"),
        end: this.ipToNumber("27.255.255.255"),
      },
      {
        start: this.ipToNumber("36.0.0.0"),
        end: this.ipToNumber("36.255.255.255"),
      },
      {
        start: this.ipToNumber("39.0.0.0"),
        end: this.ipToNumber("39.255.255.255"),
      },
      {
        start: this.ipToNumber("42.0.0.0"),
        end: this.ipToNumber("42.255.255.255"),
      },
      {
        start: this.ipToNumber("49.0.0.0"),
        end: this.ipToNumber("49.255.255.255"),
      },
      {
        start: this.ipToNumber("58.0.0.0"),
        end: this.ipToNumber("58.255.255.255"),
      },
      {
        start: this.ipToNumber("60.0.0.0"),
        end: this.ipToNumber("60.255.255.255"),
      },
      {
        start: this.ipToNumber("61.0.0.0"),
        end: this.ipToNumber("61.255.255.255"),
      },
      {
        start: this.ipToNumber("112.0.0.0"),
        end: this.ipToNumber("112.255.255.255"),
      },
      {
        start: this.ipToNumber("113.0.0.0"),
        end: this.ipToNumber("113.255.255.255"),
      },
      {
        start: this.ipToNumber("114.0.0.0"),
        end: this.ipToNumber("114.255.255.255"),
      },
      {
        start: this.ipToNumber("115.0.0.0"),
        end: this.ipToNumber("115.255.255.255"),
      },
      {
        start: this.ipToNumber("116.0.0.0"),
        end: this.ipToNumber("116.255.255.255"),
      },
      {
        start: this.ipToNumber("117.0.0.0"),
        end: this.ipToNumber("117.255.255.255"),
      },
      {
        start: this.ipToNumber("118.0.0.0"),
        end: this.ipToNumber("118.255.255.255"),
      },
      {
        start: this.ipToNumber("119.0.0.0"),
        end: this.ipToNumber("119.255.255.255"),
      },
      {
        start: this.ipToNumber("120.0.0.0"),
        end: this.ipToNumber("120.255.255.255"),
      },
      {
        start: this.ipToNumber("121.0.0.0"),
        end: this.ipToNumber("121.255.255.255"),
      },
      {
        start: this.ipToNumber("122.0.0.0"),
        end: this.ipToNumber("122.255.255.255"),
      },
      {
        start: this.ipToNumber("123.0.0.0"),
        end: this.ipToNumber("123.255.255.255"),
      },
      {
        start: this.ipToNumber("124.0.0.0"),
        end: this.ipToNumber("124.255.255.255"),
      },
      {
        start: this.ipToNumber("125.0.0.0"),
        end: this.ipToNumber("125.255.255.255"),
      },
    ];

    return chineseRanges.some(
      (range) => ipNum >= range.start && ipNum <= range.end
    );
  }

  /**
   * 将IP地址转换为数字（仅支持IPv4）
   */
  private static ipToNumber(ip: string): number {
    const parts = ip.split(".");
    if (parts.length !== 4) return 0;

    return (
      (parseInt(parts[0]) << 24) +
      (parseInt(parts[1]) << 16) +
      (parseInt(parts[2]) << 8) +
      parseInt(parts[3])
    );
  }

  /**
   * 从GeoCN数据提取标准化的IP信息
   */
  private static extractGeoCNData(
    ip: string,
    result: RawQueryResult,
    ipVersion: string
  ): IPInfo {
    const data = result.cityData as GeoCNResult;

    return {
      ip,
      country: data.country || "中国",
      countryCode: "CN",
      province: data.province,
      city: data.city,
      district: data.district,
      isp: data.isp,
      net: data.type,
      location: {
        latitude: data.lat || 0,
        longitude: data.lng || 0,
        accuracy_radius: 10, // GeoCN通常有较高的精度
      },
      timezone: "Asia/Shanghai",
      accuracy: "high",
      source: "GeoCN",
      ipVersion: ipVersion as "IPv4" | "IPv6",
    };
  }

  /**
   * 从MaxMind数据提取标准化的IP信息
   */
  private static extractMaxMindData(
    ip: string,
    result: RawQueryResult,
    ipVersion: string
  ): IPInfo {
    const cityData = result.cityData as MaxMindCityResult;
    const asnData = result.asnData as MaxMindASNResult;

    // 获取中文名称，如果没有则使用英文
    const getLocalizedName = (names?: Names) => {
      if (!names) return undefined;
      return names["zh-CN"] || names["en"];
    };

    return {
      ip,
      country: getLocalizedName(cityData.country?.names) || "",
      countryCode: cityData.country?.isoCode || "",
      province: getLocalizedName(cityData.subdivisions?.[0]?.names),
      provinceCode: cityData.subdivisions?.[0]?.isoCode,
      city: getLocalizedName(cityData.city?.names),
      location: {
        latitude: cityData.location?.latitude || 0,
        longitude: cityData.location?.longitude || 0,
        accuracy_radius: cityData.location?.accuracyRadius,
      },
      timezone: cityData.location?.timeZone,
      postal: cityData.postal?.code,
      isp: asnData?.autonomousSystemOrganization,
      net: asnData?.autonomousSystemNumber
        ? `AS${asnData.autonomousSystemNumber}`
        : undefined,
      accuracy: this.calculateAccuracy(cityData),
      source: "MaxMind",
      ipVersion: ipVersion as "IPv4" | "IPv6",
    };
  }

  /**
   * 计算MaxMind数据的精度等级
   */
  private static calculateAccuracy(
    data: MaxMindCityResult
  ): "high" | "medium" | "low" {
    let score = 0;

    // 有详细位置信息
    if (data.location?.latitude && data.location?.longitude) {
      score += 2;

      // 精度半径越小，分数越高
      if (data.location.accuracyRadius) {
        if (data.location.accuracyRadius <= 10) score += 2;
        else if (data.location.accuracyRadius <= 50) score += 1;
      }
    }

    // 有城市信息
    if (data.city?.names) score += 1;

    // 有行政区信息
    if (data.subdivisions?.[0]?.names) score += 1;

    if (score >= 5) return "high";
    if (score >= 3) return "medium";
    return "low";
  }

  /**
   * 补充数据（将次要数据源的信息补充到主要数据中）
   */
  private static supplementData(
    primary: IPInfo,
    secondary: RawQueryResult
  ): void {
    // 如果主要数据缺少某些字段，可以从次要数据源补充
    if (secondary.sourceInfo.source === "maxmind" && secondary.asnData) {
      const asnData = secondary.asnData as MaxMindASNResult;
      if (!primary.isp && asnData.autonomousSystemOrganization) {
        primary.isp = asnData.autonomousSystemOrganization;
      }
      if (!primary.net && asnData.autonomousSystemNumber) {
        primary.net = `AS${asnData.autonomousSystemNumber}`;
      }
    }

    // 补充时区信息
    if (!primary.timezone && secondary.sourceInfo.source === "maxmind") {
      const cityData = secondary.cityData as MaxMindCityResult;
      if (cityData.location?.timeZone) {
        primary.timezone = cityData.location.timeZone;
      }
    }
  }
}

