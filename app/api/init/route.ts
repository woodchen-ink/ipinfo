import { NextRequest, NextResponse } from "next/server";
import { startupCheckService } from "@/lib/geoip/startup-check";

// GET请求：检查初始化状态
export async function GET() {
  try {
    const status = startupCheckService.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        isReady: status.isReady,
        isChecking: status.isChecking,
        isDownloading: status.isDownloading,
        databases: status.databases,
        error: status.error,
      },
    });
  } catch (error) {
    console.error("获取初始化状态失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

// POST请求：执行数据库初始化
export async function POST(request: NextRequest) {
  try {
    // 验证授权码
    const initApiKey = process.env.INIT_API_KEY;
    if (!initApiKey || initApiKey === 'your-secret-init-key') {
      return NextResponse.json(
        {
          success: false,
          error: "未设置有效的初始化授权码",
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    let providedKey = '';
    if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7);
    } else if (apiKey) {
      providedKey = apiKey;
    }

    if (!providedKey || providedKey !== initApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "授权码无效或缺失",
        },
        { status: 401 }
      );
    }
    // 检查是否已经初始化
    if (startupCheckService.isInitialized()) {
      return NextResponse.json({
        success: true,
        message: "数据库已初始化",
        data: {
          isReady: true,
          databases: startupCheckService.getDatabaseStatus(),
        },
      });
    }

    // 执行数据库初始化
    await startupCheckService.performStartupCheck();

    const status = startupCheckService.getStatus();

    return NextResponse.json({
      success: true,
      message: "数据库初始化完成",
      data: {
        isReady: status.isReady,
        databases: status.databases,
        error: status.error,
      },
    });
  } catch (error) {
    console.error("数据库初始化失败:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
