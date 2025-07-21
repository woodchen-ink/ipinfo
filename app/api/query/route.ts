import { NextRequest, NextResponse } from "next/server";
import {
  detectIPVersion,
  getClientIP,
  isValidIP,
  isPrivateIP,
} from "@/lib/ip-detection";
import { IPInfo } from "@/lib/store";

// 模拟IP查询函数（暂时使用示例数据，后续集成真实数据库）
async function queryIPInfo(ip: string): Promise<IPInfo> {
  const ipVersion = detectIPVersion(ip);

  if (ipVersion === "invalid") {
    throw new Error("无效的IP地址格式");
  }

  // 模拟查询延迟
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 检查是否为私有IP
  if (isPrivateIP(ip)) {
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
      ipVersion,
      isp: "私有网络",
      timezone: "UTC",
    };
  }

  // 模拟不同IP的查询结果
  const mockData: IPInfo = {
    ip,
    country: ipVersion === "IPv6" ? "美国" : "中国",
    countryCode: ipVersion === "IPv6" ? "US" : "CN",
    province: ipVersion === "IPv6" ? "California" : "广东省",
    provinceCode: ipVersion === "IPv6" ? "CA" : "GD",
    city: ipVersion === "IPv6" ? "San Francisco" : "深圳市",
    cityCode: ipVersion === "IPv6" ? "SF" : "SZ",
    district: ipVersion === "IPv6" ? undefined : "南山区",
    isp: ipVersion === "IPv6" ? "Google LLC" : "中国电信",
    net: ipVersion === "IPv6" ? "AS15169" : "AS4134",
    location: {
      latitude: ipVersion === "IPv6" ? 37.7749 : 22.5431,
      longitude: ipVersion === "IPv6" ? -122.4194 : 114.0579,
      accuracy_radius: ipVersion === "IPv6" ? 50 : 10,
    },
    timezone: ipVersion === "IPv6" ? "America/Los_Angeles" : "Asia/Shanghai",
    postal: ipVersion === "IPv6" ? "94102" : "518000",
    accuracy: ipVersion === "IPv6" ? "medium" : "high",
    source: ipVersion === "IPv6" ? "MaxMind" : "GeoCN",
    ipVersion,
  };

  return mockData;
}

// GET请求：获取客户端IP信息
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);

    if (!clientIP) {
      return NextResponse.json(
        { error: "无法获取客户端IP地址" },
        { status: 400 }
      );
    }

    const result = await queryIPInfo(clientIP);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300", // 缓存5分钟
      },
    });
  } catch (error) {
    console.error("IP查询错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}

// POST请求：查询指定IP信息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip } = body;

    // 如果没有提供IP，使用客户端IP
    const queryIP = ip || getClientIP(request);

    if (!queryIP) {
      return NextResponse.json(
        { error: "请提供有效的IP地址" },
        { status: 400 }
      );
    }

    // 验证IP格式
    if (!isValidIP(queryIP)) {
      return NextResponse.json({ error: "无效的IP地址格式" }, { status: 400 });
    }

    const result = await queryIPInfo(queryIP);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300", // 缓存5分钟
      },
    });
  } catch (error) {
    console.error("IP查询错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询失败" },
      { status: 500 }
    );
  }
}
