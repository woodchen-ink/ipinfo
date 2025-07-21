"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// 检测系统主题偏好
const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

// 从localStorage获取保存的主题
const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("theme") as Theme;
    return stored || "system";
  } catch {
    return "system";
  }
};

// 解析最终主题
const resolveTheme = (theme: Theme): "light" | "dark" => {
  return theme === "system" ? getSystemTheme() : theme;
};

export const useTheme = (): ThemeContextValue => {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // 应用主题到DOM
  const applyTheme = (newResolvedTheme: "light" | "dark") => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newResolvedTheme);
    setResolvedTheme(newResolvedTheme);
  };

  // 设置主题
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    // 保存到localStorage
    try {
      localStorage.setItem("theme", newTheme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }

    // 应用解析后的主题
    const newResolvedTheme = resolveTheme(newTheme);
    applyTheme(newResolvedTheme);
  };

  // 切换主题（在light和dark之间切换）
  const toggleTheme = () => {
    const currentResolved = resolveTheme(theme);
    const newTheme = currentResolved === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  // 初始化主题
  useEffect(() => {
    const storedTheme = getStoredTheme();
    setThemeState(storedTheme);

    const initialResolvedTheme = resolveTheme(storedTheme);
    applyTheme(initialResolvedTheme);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      applyTheme(newSystemTheme);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
};

// 主题切换动画的CSS类
export const themeTransition = "transition-colors duration-300 ease-in-out";
