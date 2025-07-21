import { create } from "zustand";
import { toast } from "sonner";

// IP信息接口定义
export interface IPInfo {
  ip: string;
  country: string;
  countryCode: string;
  province?: string;
  provinceCode?: string;
  city?: string;
  cityCode?: string;
  district?: string;
  districtCode?: string;
  isp?: string;
  net?: string;
  // 新增字段，匹配Python版本的输出结构
  regions?: string[];
  regions_short?: string[];
  type?: string;
  as?: {
    number?: number;
    name?: string;
    info?: string;
  };
  addr?: string;
  registered_country?: {
    code: string;
    name: string;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy_radius?: number;
  };
  timezone?: string;
  postal?: string;
  accuracy: "high" | "medium" | "low";
  source: "MaxMind" | "GeoCN" | "MeiTuan";
  ipVersion: "IPv4" | "IPv6";
  // 美团特有字段
  meituan?: {
    areaName?: string; // 区域名称，如"王府井/东单"
    detail?: string; // 详细地址，如"正义路甲4号-B座"
    cityPinyin?: string; // 城市拼音
    openCityName?: string; // 开放城市名
    isForeign?: boolean; // 是否为境外
    dpCityId?: number; // 美团城市ID
    area?: number; // 区域编号
    parentArea?: number; // 父区域编号
    fromwhere?: string; // 数据来源标识
    adcode?: string; // 行政区划代码
  };
}

// 状态管理接口
interface IPQueryState {
  // 数据状态
  currentQuery: string;
  ipData: IPInfo | null;
  queryHistory: IPInfo[];

  // UI状态
  isLoading: boolean;
  error: string | null;
  isAutoDetected: boolean;

  // 动作
  setQuery: (query: string) => void;
  executeQuery: (ip?: string) => Promise<void>;
  clearError: () => void;
  addToHistory: (data: IPInfo) => void;
  clearHistory: () => void;
}

// 创建store
export const useIPQueryStore = create<IPQueryState>((set, get) => ({
  // 初始状态
  currentQuery: "",
  ipData: null,
  queryHistory: [],
  isLoading: false,
  error: null,
  isAutoDetected: false,

  // 设置查询内容
  setQuery: (query: string) => set({ currentQuery: query }),

  // 执行IP查询
  executeQuery: async (ip?: string) => {
    set({ isLoading: true, error: null });

    try {
      const queryIP = ip || get().currentQuery;
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ip: queryIP }),
      });

      if (!response.ok) {
        throw new Error(`查询失败: ${response.statusText}`);
      }

      const result: IPInfo = await response.json();

      set({
        ipData: result,
        isLoading: false,
        isAutoDetected: !ip,
        currentQuery: result.ip,
      });

      // 显示成功提示
      toast.success(`查询成功`, {
        description: `IP: ${result.ip} - ${result.country}${
          result.city ? ` · ${result.city}` : ""
        }`,
        duration: 3000,
      });

      // 添加到历史记录
      get().addToHistory(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "查询失败";

      set({
        error: errorMessage,
        isLoading: false,
      });

      // 显示错误提示
      toast.error("查询失败", {
        description: errorMessage,
        duration: 4000,
      });
    }
  },

  // 清除错误
  clearError: () => set({ error: null }),

  // 添加到历史记录
  addToHistory: (data: IPInfo) => {
    const history = get().queryHistory;
    const exists = history.some((item) => item.ip === data.ip);

    if (!exists) {
      set({
        queryHistory: [data, ...history].slice(0, 10), // 只保留最近10条
      });
    }
  },

  // 清空历史记录
  clearHistory: () => set({ queryHistory: [] }),
}));
