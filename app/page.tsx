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
          className="pt-16 pb-8 text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            极简 <span className="text-blue-500">IP</span> 查询
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto px-6">
            精确查询IPv4/IPv6地址的地理位置、运营商信息和网络详情
          </p>
        </motion.header>

        {/* 版本切换器 */}
        <section className="px-6 mb-8">
          <VersionSwitcher />
        </section>

        {/* 查询表单 */}
        <section className="px-6 mb-12">
          <IPQueryForm />
        </section>

        {/* 加载状态 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"
            />
            <p className="text-gray-600 text-lg">正在查询IP信息...</p>
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
            className="flex flex-col items-center justify-center py-16 px-6"
          >
            <div className="text-8xl mb-6">🌐</div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              欢迎使用IP地址查询工具
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              输入任意IPv4或IPv6地址进行查询，或者直接查看您当前的IP信息
            </p>
          </motion.div>
        )}

        {/* 页脚 */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center py-12 px-6"
        >
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-gray-100">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                功能特性
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
                <div className="text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <h5 className="font-medium text-gray-800 mb-1">高精度定位</h5>
                  <p>结合MaxMind和GeoCN数据库，提供最准确的位置信息</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">⚡</div>
                  <h5 className="font-medium text-gray-800 mb-1">极速响应</h5>
                  <p>优化的查询算法，响应时间控制在100毫秒以内</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-2">🔄</div>
                  <h5 className="font-medium text-gray-800 mb-1">双栈支持</h5>
                  <p>完整支持IPv4和IPv6地址查询与自动检测</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 text-sm text-gray-500">
              <p>© 2024 极简IP查询工具 · 专注于提供精确的IP地理位置信息</p>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
