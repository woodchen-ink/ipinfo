import { NextRequest, NextResponse } from "next/server";

// BGP API 响应类型
interface BGPPeer {
  asn: number;
  name: string;
  description: string;
  country_code: string;
}

interface BGPPeersResponse {
  status: string;
  status_message: string;
  data: {
    ipv4_peers: BGPPeer[];
    ipv6_peers: BGPPeer[];
  };
  "@meta": {
    time_zone: string;
    api_version: number;
    execution_time: string;
  };
}

// GET请求：代理BGP API查询
export async function GET(
  request: NextRequest,
  { params }: { params: { asn: string } }
) {
  try {
    const { asn } = params;

    // 验证 ASN 格式
    const asnNumber = parseInt(asn, 10);
    if (isNaN(asnNumber) || asnNumber <= 0 || asnNumber > 4294967295) {
      return NextResponse.json({ error: "无效的 ASN 编号" }, { status: 400 });
    }

    // 调用 BGP API
    const bgpApiUrl = `https://api.bgpview.io/asn/${asnNumber}/peers`;

    const response = await fetch(bgpApiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      // 添加超时控制
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      console.error(
        `BGP API 请求失败: ${response.status} ${response.statusText}`
      );

      if (response.status === 404) {
        return NextResponse.json(
          { error: "未找到该 ASN 的信息" },
          { status: 404 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: "请求过于频繁，请稍后重试" },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "BGP 服务暂时不可用" },
        { status: 503 }
      );
    }

    const data: BGPPeersResponse = await response.json();

    // 验证响应数据格式
    if (!data || data.status !== "ok") {
      console.error("BGP API 返回错误:", data?.status_message || "未知错误");
      return NextResponse.json(
        { error: data?.status_message || "BGP 数据格式错误" },
        { status: 500 }
      );
    }

    // 处理数据
    const processedData = {
      centerAsn: asnNumber,
      centerName: `AS${asnNumber}`,
      ipv4Peers: data.data.ipv4_peers || [],
      ipv6Peers: data.data.ipv6_peers || [],
      allPeers: [
        ...(data.data.ipv4_peers || []),
        ...(data.data.ipv6_peers || []),
      ],
    };

    // 去重处理
    const uniquePeers = new Map<number, BGPPeer>();
    processedData.allPeers.forEach((peer) => {
      uniquePeers.set(peer.asn, peer);
    });
    processedData.allPeers = Array.from(uniquePeers.values());

    return NextResponse.json(processedData, {
      headers: {
        // 缓存 30 分钟
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
        // 允许跨域（虽然在这里不是必需的，但为了完整性）
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("BGP 代理查询错误:", error);

    // 处理不同类型的错误
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json(
          { error: "请求超时，请稍后重试" },
          { status: 408 }
        );
      }

      if (error.message.includes("fetch")) {
        return NextResponse.json(
          { error: "网络连接错误，请检查网络连接" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "BGP 查询失败，请稍后重试" },
      { status: 500 }
    );
  }
}
