"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api-config";

/**
 * 数据库初始化组件
 * 在应用启动时静默调用初始化API
 */
export default function DatabaseInitializer() {
  useEffect(() => {
    // 静默初始化数据库
    const initializeDatabase = async () => {
      try {
        // 检查是否已经初始化
        const statusResponse = await fetch(`${API_BASE_URL}/api/init`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (statusResponse.ok) {
          const statusJson = await statusResponse.json();
          const statusData = statusJson.data ?? statusJson;

          // 如果已经就绪，不需要初始化
          if (statusData.isReady) {
            console.log("数据库已就绪");
            return;
          }
        }

        // 执行初始化
        const initResponse = await fetch(`${API_BASE_URL}/api/init`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (initResponse.ok) {
          const initJson = await initResponse.json();
          const initData = initJson.data ?? initJson;
          if (initData) {
            console.log("数据库初始化完成");
          } else {
            console.warn("数据库初始化失败:", initJson.msg);
          }
        } else {
          console.warn("数据库初始化请求失败");
        }
      } catch (error) {
        // 静默处理错误，不影响应用运行
        console.warn("数据库初始化出错:", error);
      }
    };

    // 延迟执行，避免阻塞页面加载
    const timer = setTimeout(initializeDatabase, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // 这个组件不渲染任何内容
  return null;
} 