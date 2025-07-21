'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10">
        {/* 头部 */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pt-12 pb-6 text-center"
        >
          <p className="text-lg text-gray-800 max-w-2xl mx-auto px-6 font-medium">
            精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情
          </p>
        </motion.header>

        {/* 版本切换器 */}
        <section className="px-6 mb-6">
          <VersionSwitcher />
        </section>

        {/* 查询表单 */}
        <section className="px-6 mb-10">
          <IPQueryForm />
        </section>

        {/* 加载状态 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-3"
            />
            <p className="text-gray-600">正在查询...</p>
          </motion.div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto px-6 mb-12"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-red-800 mb-2">查询失败</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </motion.div>
        )}

        {/* IP信息展示 */}
        {ipData && !isLoading && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="px-6 mb-16"
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
            <div className="text-5xl mb-3">🌐</div>
            <p className="text-gray-600 text-center max-w-md">
              输入IP地址进行查询，或留空查看当前IP信息
            </p>
          </motion.div>
        )}

        {/* 页脚 */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center py-8 px-6"
        >
          <div className="text-sm text-gray-500">
            <p>© 2024 专注于提供精确的IP地理位置信息</p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
