"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { IPInfo } from "@/lib/store";
import { isValidIP, detectIPVersion } from "@/lib/ip-detection";
import IPInfoCard from "@/components/ip-info-card";
import IPLocationMap from "@/components/ip-location-map";
import SimpleIPQueryForm from "@/components/simple-ip-query-form";
import ThemeToggle from "@/components/theme-toggle";

export default function IPPage() {
  const params = useParams();
  const router = useRouter();
  const [ipInfo, setIPInfo] = useState<IPInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  // 从URL参数中获取IP地址，支持IPv6的特殊编码
  const getIPFromParams = useCallback((): string | null => {
    if (!params.ip) return null;
    
    let rawIP = Array.isArray(params.ip) ? params.ip.join("/") : params.ip;
    
    // 处理IPv6地址的URL编码问题
    // 浏览器会将 :: 编码为 %3A%3A，需要解码
    rawIP = decodeURIComponent(rawIP);
    
    // 处理IPv6地址中可能被替换的字符
    // 某些情况下，:: 可能被编码或替换
    if (rawIP.includes("%3A")) {
      rawIP = rawIP.replace(/%3A/g, ":");
    }
    
    return rawIP;
  }, [params.ip]);

  const queryIP = async (ip: string) => {
    if (!isValidIP(ip)) {
      setError("无效的IP地址格式");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "查询失败");
      }

      const data = await response.json();
      setIPInfo(data);
    } catch (err) {
      console.error("IP查询失败:", err);
      setError(err instanceof Error ? err.message : "查询失败");
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuery = (newIP: string) => {
    // 当用户在表单中输入新IP时，更新URL
    if (isValidIP(newIP)) {
      // 对IPv6地址进行URL编码
      const encodedIP = detectIPVersion(newIP) === "IPv6" 
        ? encodeURIComponent(newIP) 
        : newIP;
      router.push(`/${encodedIP}`);
    }
  };

  useEffect(() => {
    const ip = getIPFromParams();
    
    if (!ip) {
      // 如果没有IP参数，重定向到首页
      router.push("/");
      return;
    }

    // 验证IP格式
    if (!isValidIP(ip)) {
      setError(`无效的IP地址格式: ${ip}`);
      setLoading(false);
      return;
    }

    // 查询IP信息
    queryIP(ip);
  }, [params.ip, getIPFromParams, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-64 h-64 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
          <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <header className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4">
            <div className="flex-1">
              <button
                onClick={() => router.push("/")}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                IP查询工具 by CZL
              </button>
            </div>
            <div className="flex-1 flex justify-end">
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4 mx-auto transition-colors duration-300">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-600 dark:text-gray-400">正在查询IP信息...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-64 h-64 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
          <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <header className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4">
            <div className="flex-1">
              <button
                onClick={() => router.push("/")}
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                IP查询工具 by CZL
              </button>
            </div>
            <div className="flex-1 flex justify-end">
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">查询失败</div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentIP = getIPFromParams();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-64 h-64 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 顶部导航区域 */}
        <header className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4">
          <div className="flex-1">
            <button
              onClick={() => router.push("/")}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              IP查询工具 by CZL
            </button>
          </div>
          <div className="flex-1 flex justify-end">
            <ThemeToggle />
          </div>
        </header>

        {/* 主内容区域 */}
        <div className="flex-1 px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* 查询表单 - 显示当前查询的IP */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                IP地理位置查询
              </h1>
              <SimpleIPQueryForm 
                onQuery={handleNewQuery} 
                defaultValue={currentIP || ""}
                placeholder="输入IP地址或留空查询当前IP"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                当前查询: <span className="font-mono text-blue-600 dark:text-blue-400">{currentIP}</span>
              </p>
            </div>

            {ipInfo && (
              <>
                {/* IP信息卡片 */}
                <IPInfoCard ipData={ipInfo} />

                {/* 地图显示 */}
                {ipInfo.location && ipInfo.location.latitude !== 0 && ipInfo.location.longitude !== 0 && (
                  <IPLocationMap ipData={ipInfo} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}