'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import { useIPQueryStore } from '@/lib/store';
import IPQueryForm from '@/components/ip-query-form';
import IPInfoCard from '@/components/ip-info-card';
import VersionSwitcher from '@/components/version-switcher';

export default function Home() {
  const { ipData, isLoading, error, executeQuery } = useIPQueryStore();

  // 页面加载时自动检测客户端IP
  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* 主内容区域 - 垂直居中 */}
        <div className="flex-1 flex flex-col justify-center py-8">
          {/* 版本切换器 */}
          <motion.section 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="px-6 mb-8"
          >
            <VersionSwitcher />
          </motion.section>

          {/* 查询表单 */}
          <motion.section 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="px-6 mb-8"
          >
            <IPQueryForm />
          </motion.section>

          {/* 加载状态 */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </motion.div>
              <p className="text-gray-600">正在查询中...</p>
            </motion.div>
          )}

          {/* 错误状态 */}
          {error && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto px-6"
            >
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </motion.div>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            </motion.div>
          )}

          {/* IP信息展示 */}
          {ipData && !isLoading && (
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="px-6 w-full"
            >
              <IPInfoCard ipData={ipData} />
            </motion.section>
          )}

          {/* 占位内容（当没有数据时） */}
          {!ipData && !isLoading && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 px-6"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ 
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6"
              >
                <Search className="w-10 h-10 text-gray-400" />
              </motion.div>
              <p className="text-gray-600 text-center max-w-md">
                输入IP地址进行查询，或留空查看当前IP信息
              </p>
            </motion.div>
          )}
        </div>

        {/* 页脚 */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center py-6 px-6 mt-auto"
        >
          <div className="text-xs text-gray-400">
            <p>© 2024 专注于提供精确的IP地理位置信息</p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
