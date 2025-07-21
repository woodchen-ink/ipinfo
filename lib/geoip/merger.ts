import {
  RawQueryResult,
  MaxMindCityResult,
  MaxMindASNResult,
  GeoCNResult,
  GeoIPError,
  Names,
  CHINESE_ISP_ASN_MAP,
  CHINESE_PROVINCES,
  SPECIAL_REGIONS_MAP,
  LANGUAGE_PRIORITY,
} from "./types";
import { IPInfo } from "../store";
import { detectIPVersion } from "../ip-detection";
import { globalGeocodeService } from "./geocode";

/**
 * 数据源合并器
 * 参考Python版本实现的智能IP信息合并系统
 */
export class DataMerger {
  /**
   * 主要合并方法 - 相当于Python的get_ip_info函数
   */
  static async merge(ip: string, results: RawQueryResult[]): Promise<IPInfo> {
    if (results.length === 0) {
      throw new GeoIPError("没有可用的查询结果进行合并", "MERGE_FAILED");
    }

    // 首先从MaxMind获取基础信息
    const maxmindResult = results.find(
      (r) => r.sourceInfo.source === "maxmind"
    );
    if (!maxmindResult) {
      throw new GeoIPError("缺少MaxMind数据源", "MERGE_FAILED");
    }

    // 使用MaxMind数据作为基础
    const ipInfo = this.getMaxMindInfo(ip, maxmindResult);

    // 如果是中国IP且有注册国信息为中国，则使用GeoCN补充数据
    if (
      ipInfo.country &&
      ipInfo.countryCode === "CN" &&
      (!ipInfo.registered_country || ipInfo.registered_country.code === "CN")
    ) {
      const geocnResult = results.find((r) => r.sourceInfo.source === "geocn");
      if (geocnResult) {
        await this.supplementWithGeoCN(ipInfo, geocnResult);
      }
    }

    return ipInfo;
  }

  /**
   * 获取MaxMind信息 - 相当于Python的get_maxmind函数
   */
  private static getMaxMindInfo(ip: string, result: RawQueryResult): IPInfo {
    const cityData = result.cityData as MaxMindCityResult;
    const asnData = result.asnData as MaxMindASNResult;
    const ipVersion = detectIPVersion(ip);

    const ipInfo: IPInfo = {
      ip,
      country: "",
      countryCode: "",
      location: {
        latitude: 0,
        longitude: 0,
      },
      accuracy: "low",
      source: "MaxMind",
      ipVersion: ipVersion as "IPv4" | "IPv6",
    };

    // 处理ASN信息
    if (asnData) {
      const asNumber = asnData.autonomousSystemNumber;
      const asName = asnData.autonomousSystemOrganization;

      ipInfo.as = {
        number: asNumber,
        name: asName,
      };

      // 检查是否有中文ISP映射
      const chineseISP = this.getASInfo(asNumber);
      if (chineseISP) {
        ipInfo.as.info = chineseISP;
      }
    }

    // 处理地理位置信息
    if (cityData?.location) {
      ipInfo.location = {
        latitude: cityData.location.latitude || 0,
        longitude: cityData.location.longitude || 0,
        accuracy_radius: cityData.location.accuracyRadius,
      };
    }

    // 处理国家信息
    if (cityData?.country) {
      const countryCode = cityData.country.isoCode || "";
      const countryName = this.getCountryName(cityData.country);

      ipInfo.country = countryName;
      ipInfo.countryCode = countryCode;
    }

    // 处理注册国家信息
    if (cityData?.registeredCountry) {
      const registeredCountryCode = cityData.registeredCountry.isoCode || "";
      const registeredCountryName = this.getCountryName(
        cityData.registeredCountry
      );

      ipInfo.registered_country = {
        code: registeredCountryCode,
        name: registeredCountryName,
      };
    }

    // 处理区域信息（省市区）
    const regions = this.extractRegions(cityData);
    if (regions.length > 0) {
      ipInfo.regions = regions;
    }

    // 计算准确性
    ipInfo.accuracy = this.calculateAccuracy(cityData, false);

    return ipInfo;
  }

  /**
   * 使用GeoCN数据补充信息 - 相当于Python的get_cn函数
   */
  private static async supplementWithGeoCN(
    ipInfo: IPInfo,
    result: RawQueryResult
  ): Promise<void> {
    const geocnData = result.cityData as GeoCNResult;

    if (!geocnData) return;

    // 处理区域信息
    const regions = this.deduplicateRegions([
      geocnData.province,
      geocnData.city,
      geocnData.district,
    ]);

    if (regions.length > 0) {
      ipInfo.regions = regions;

      // 生成简化的区域名称
      const regionsShort = this.deduplicateRegions([
        this.provinceMatch(geocnData.province || ""),
        geocnData.city?.replace("市", "") || "",
        geocnData.district || "",
      ]);

      if (regionsShort.length > 0) {
        ipInfo.regions_short = regionsShort;
      }
    }

    // 处理坐标信息 - 优先使用GeoCN原始坐标，缺失时调用地理编码服务
    try {
      const hasOriginalCoordinates =
        geocnData.lat &&
        geocnData.lng &&
        geocnData.lat !== 0 &&
        geocnData.lng !== 0;

      const coordinates = await globalGeocodeService.getCoordinates(
        geocnData.lat,
        geocnData.lng,
        geocnData.province,
        geocnData.city,
        geocnData.district
      );

      if (coordinates) {
        ipInfo.location = {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy_radius: coordinates.source === "geocn" ? 1 : 10, // GeoCN原始坐标精度更高
        };

        // 根据坐标来源调整精度
        if (coordinates.source === "geocn") {
          ipInfo.accuracy = "high";
        } else if (coordinates.source === "nominatim") {
          ipInfo.accuracy =
            ipInfo.accuracy === "low" ? "medium" : ipInfo.accuracy;
        }
      }
    } catch (error) {
      console.warn(
        "获取坐标信息失败:",
        error instanceof Error ? error.message : error
      );
    }

    // 补充省市区字段
    ipInfo.province = geocnData.province;
    ipInfo.city = geocnData.city;
    ipInfo.district = geocnData.district;

    // 补充ISP信息
    if (!ipInfo.as) {
      ipInfo.as = {};
    }
    if (geocnData.isp) {
      ipInfo.as.info = geocnData.isp;
    }

    // 补充网络类型
    if (geocnData.type) {
      ipInfo.type = geocnData.type;
    }

    // 更新数据源标识
    ipInfo.source = "GeoCN";

    // GeoCN对中国IP通常有更高精度
    ipInfo.accuracy = "high";
  }

  /**
   * 获取ASN信息 - 相当于Python的get_as_info函数
   */
  private static getASInfo(asnNumber?: number): string | undefined {
    if (!asnNumber) return undefined;
    return CHINESE_ISP_ASN_MAP[asnNumber];
  }

  /**
   * 获取本地化名称 - 相当于Python的get_des函数
   */
  private static getLocalizedName(names?: Names): string {
    if (!names) return "";

    for (const lang of LANGUAGE_PRIORITY) {
      if (names[lang as keyof Names]) {
        return names[lang as keyof Names] || "";
      }
    }

    return names.en || "";
  }

  /**
   * 获取国家名称 - 相当于Python的get_country函数
   */
  private static getCountryName(countryData: { names?: Names }): string {
    const countryName = this.getLocalizedName(countryData.names);

    // 处理特别行政区
    if (SPECIAL_REGIONS_MAP[countryName]) {
      return SPECIAL_REGIONS_MAP[countryName];
    }

    return countryName;
  }

  /**
   * 省份匹配 - 相当于Python的province_match函数
   */
  private static provinceMatch(provinceName: string): string {
    for (const province of CHINESE_PROVINCES) {
      if (provinceName.includes(province)) {
        return province;
      }
    }
    return "";
  }

  /**
   * 去重处理 - 相当于Python的de_duplicate函数
   */
  private static deduplicateRegions(regions: (string | undefined)[]): string[] {
    // 过滤空值
    const filtered = regions.filter(Boolean) as string[];

    // 去重并保持顺序
    const result: string[] = [];
    filtered.forEach((region) => {
      if (!result.includes(region)) {
        result.push(region);
      }
    });

    return result;
  }

  /**
   * 提取区域信息
   */
  private static extractRegions(cityData?: MaxMindCityResult): string[] {
    if (!cityData) return [];

    const regions: string[] = [];

    // 添加行政区划信息
    if (cityData.subdivisions) {
      cityData.subdivisions.forEach((subdivision) => {
        const name = this.getLocalizedName(subdivision.names);
        if (name) regions.push(name);
      });
    }

    // 添加城市信息
    if (cityData.city) {
      const cityName = this.getLocalizedName(cityData.city.names);
      const countryName = cityData.country
        ? this.getLocalizedName(cityData.country.names)
        : "";

      // 如果城市名不在最后一个区域中且不在国家名中，则添加
      if (
        cityName &&
        (!regions.length || !regions[regions.length - 1].includes(cityName)) &&
        !countryName.includes(cityName)
      ) {
        regions.push(cityName);
      }
    }

    return this.deduplicateRegions(regions);
  }

  /**
   * 计算数据精度
   */
  private static calculateAccuracy(
    cityData?: MaxMindCityResult,
    hasGeocnCoordinates?: boolean
  ): "high" | "medium" | "low" {
    if (!cityData) return "low";

    let score = 0;

    // 位置信息 - 如果有GeoCN坐标补充，提升评分
    if (cityData.location?.latitude && cityData.location?.longitude) {
      score += hasGeocnCoordinates ? 3 : 2; // GeoCN坐标补充提升评分

      if (cityData.location.accuracyRadius) {
        if (cityData.location.accuracyRadius <= 10) score += 2;
        else if (cityData.location.accuracyRadius <= 50) score += 1;
      }
    }

    // 城市信息
    if (cityData.city?.names) score += 1;

    // 行政区信息
    if (cityData.subdivisions?.[0]?.names) score += 1;

    // GeoCN数据补充额外加分
    if (hasGeocnCoordinates) score += 1;

    if (score >= 6) return "high";
    if (score >= 3) return "medium";
    return "low";
  }

  /**
   * 计算网络地址 - 相当于Python的get_addr函数
   */
  private static getNetworkAddress(ip: string, prefixLength: number): string {
    // 这里需要实现IP网络地址计算
    // 简化实现，实际项目中可能需要更复杂的网络计算
    return `${ip}/${prefixLength}`;
  }
}

