"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { isValidIP, checkPrivateIP, detectIPVersion } from "@/lib/ip-detection";
import { toast } from "sonner";

interface IPQueryFormProps {
  onQuery?: (ip: string) => void;
  defaultValue?: string;
  placeholder?: string;
}

export default function IPQueryForm({ 
  onQuery, 
  defaultValue = "", 
  placeholder = "输入IP地址或留空查询当前IP" 
}: IPQueryFormProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedValue = inputValue.trim();

    // 如果输入为空，返回首页查询当前IP
    if (!trimmedValue) {
      router.push("/");
      return;
    }

    // 验证IP格式
    if (!isValidIP(trimmedValue)) {
      toast.error("IP地址格式错误", {
        description: "请输入有效的IPv4或IPv6地址格式",
        duration: 3000,
      });
      return;
    }

    // 检查是否为私有或不可达IP地址
    const privateCheck = checkPrivateIP(trimmedValue);
    if (privateCheck.isPrivate) {
      toast.warning(privateCheck.message, {
        description: privateCheck.description,
        duration: 5000,
      });
      return;
    }

    // 如果有自定义处理函数，调用它
    if (onQuery) {
      onQuery(trimmedValue);
      return;
    }

    // 导航到基于路径的IP查询页面
    const encodedIP = detectIPVersion(trimmedValue) === "IPv6" 
      ? encodeURIComponent(trimmedValue) 
      : trimmedValue;
    router.push(`/${encodedIP}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
      >
        <Search className="w-4 h-4" />
        查询
      </button>
    </form>
  );
}