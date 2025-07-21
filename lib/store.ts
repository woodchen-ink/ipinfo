import { create } from "zustand";

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
  location: {
    latitude: number;
    longitude: number;
    accuracy_radius?: number;
  };
  timezone?: string;
  postal?: string;
  accuracy: "high" | "medium" | "low";
  source: "MaxMind" | "GeoCN";
  ipVersion: "IPv4" | "IPv6";
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

      // 添加到历史记录
      get().addToHistory(result);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "查询失败",
        isLoading: false,
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
