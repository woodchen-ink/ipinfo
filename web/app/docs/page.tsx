"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Code2, Globe, MessageCircle, Menu, X, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme-toggle";

// 定义内容区域类型
type SectionType = 'url-query' | 'api-usage' | 'rate-limit' | 'feedback';

interface Section {
  id: SectionType;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export default function DocsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionType>('url-query');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // 检测屏幕尺寸
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // 内容区域配置
  const sections: Section[] = [
    {
      id: 'url-query',
      title: 'URL 直接查询',
      icon: Globe,
      content: (
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>您可以通过拼接URL的方式直接查询指定IP地址，支持IPv4和IPv6：</p>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 font-mono text-sm">
            <div className="space-y-2">
              <div>
                <span className="text-gray-500 dark:text-gray-400">IPv4 示例：</span>
                <br />
                <span className="text-blue-600 dark:text-blue-400">https://ipinfo.czl.net/8.8.8.8</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">IPv6 示例：</span>
                <br />
                <span className="text-blue-600 dark:text-blue-400">https://ipinfo.czl.net/2001:4860:4860::8888</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 提示：这种方式非常适合书签收藏或直接分享特定IP的查询结果
          </p>
        </div>
      )
    },
    {
      id: 'api-usage',
      title: 'API 接口使用',
      icon: Code2,
      content: (
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>提供RESTful API接口供开发者集成使用：</p>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3 text-lg">获取当前访问者IP信息</h3>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 font-mono text-sm">
                <div className="mb-2">
                  <span className="inline-block bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs font-medium mr-2">
                    GET
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">/api/query</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">查询指定IP信息</h3>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 font-mono text-sm">
                <div className="mb-3">
                  <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium mr-2">
                    POST
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">/api/query</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400 mb-2">请求体：</div>
                <div className="bg-gray-100 dark:bg-slate-600 rounded p-3">
                  {`{
  "ip": "8.8.8.8"
}`}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">响应格式</h3>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 font-mono text-sm">
                <div className="bg-gray-100 dark:bg-slate-600 rounded p-3 text-xs overflow-x-auto">
                  {`{
  "success": true,
  "data": {
    "ip": "8.8.8.8",
    "country": "美国",
    "country_code": "US",
    "region": "加利福尼亚州",
    "city": "山景城",
    "latitude": 37.4056,
    "longitude": -122.0775,
    "timezone": "America/Los_Angeles",
    "isp": "Google LLC",
    "organization": "Google Public DNS",
    "asn": 15169,
    "as_name": "GOOGLE"
  }
}`}
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 提示：API支持CORS跨域请求，可在前端直接调用
          </p>
        </div>
      )
    },
    {
      id: 'rate-limit',
      title: 'API 限速说明',
      icon: Shield,
      content: (
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>为保障服务稳定性和公平性，我们对 API 接口实施了基于 IP 的请求频率限制：</p>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-5 border border-blue-200/50 dark:border-blue-700/50">
              <h3 className="font-semibold mb-3 flex items-center text-blue-900 dark:text-blue-100">
                <Shield className="w-5 h-5 mr-2" />
                限速配置（每分钟）
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                  <span className="font-mono text-blue-600 dark:text-blue-400">/api/query</span>
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full font-medium">
                    60 次/分钟
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                  <span className="font-mono text-green-600 dark:text-green-400">/api/bgp/*</span>
                  <span className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-3 py-1 rounded-full font-medium">
                    20 次/分钟
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                  <span className="font-mono text-purple-600 dark:text-purple-400">/api/proxy-detection</span>
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full font-medium">
                    10 次/分钟
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white/50 dark:bg-slate-800/50 rounded">
                  <span className="font-mono text-gray-600 dark:text-gray-400">其他接口</span>
                  <span className="bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
                    100 次/分钟
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">响应头信息</h3>
              <p className="mb-3">API 响应会包含以下限速相关的 HTTP 头：</p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 font-mono text-sm space-y-2">
                <div>
                  <span className="text-blue-600 dark:text-blue-400">X-RateLimit-Limit</span>
                  <span className="text-gray-500 dark:text-gray-400"> - 限制总数</span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400">X-RateLimit-Remaining</span>
                  <span className="text-gray-500 dark:text-gray-400"> - 剩余请求次数</span>
                </div>
                <div>
                  <span className="text-blue-600 dark:text-blue-400">X-RateLimit-Reset</span>
                  <span className="text-gray-500 dark:text-gray-400"> - 限制重置时间</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">超过限制时</h3>
              <p className="mb-3">当请求超过限制时，将返回 HTTP 429 状态码：</p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 font-mono text-sm">
                <div className="mb-3">
                  <span className="inline-block bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs font-medium mr-2">
                    429 Too Many Requests
                  </span>
                </div>
                <div className="bg-gray-100 dark:bg-slate-600 rounded p-3 text-xs overflow-x-auto">
                  {`{
  "error": "请求过于频繁，请稍后重试",
  "message": "Rate limit exceeded. Please try again in 46 seconds.",
  "retryAfter": 46
}`}
                </div>
                <div className="mt-3 text-gray-600 dark:text-gray-400">
                  额外的响应头：
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400">Retry-After</span>
                    <span className="text-gray-500 dark:text-gray-400"> - 建议等待的秒数</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200/50 dark:border-amber-700/50">
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center">
              💡 使用建议
            </h4>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• 请合理控制请求频率，避免触发限速</li>
              <li>• 建议实现请求重试机制，遵循 Retry-After 提示</li>
              <li>• 可通过响应头实时监控剩余请求次数</li>
              <li>• 限速基于客户端 IP 地址，每个 IP 独立计算</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'feedback',
      title: '问题反馈',
      icon: MessageCircle,
      content: (
        <div className="space-y-4 text-gray-700 dark:text-gray-300">
          <p>如果您在使用过程中遇到问题或有改进建议，欢迎反馈：</p>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-purple-200/50 dark:border-purple-700/50">
            <a
              href="https://www.sunai.net/t/topic/946"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-3 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <div>
                <div className="font-medium">前往论坛留言反馈</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">点击访问论坛页面</div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">↗</span>
            </a>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            我们会认真对待每一个反馈，持续优化用户体验
          </p>
          
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">反馈建议</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• 请详细描述遇到的问题或建议</li>
              <li>• 如有错误，请提供具体的IP地址或操作步骤</li>
              <li>• 欢迎提出功能改进建议</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-64 h-64 bg-blue-400/20 dark:bg-blue-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
        <div className="absolute bottom-1/4 -left-32 w-64 h-64 bg-purple-400/20 dark:bg-purple-500/10 rounded-full blur-3xl transition-colors duration-500"></div>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 min-h-screen">
        {/* 顶部导航 */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-between items-center px-4 md:px-6 py-3 md:py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">返回</span>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              使用说明
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <ThemeToggle />
          </div>
        </motion.header>

        {/* 主布局 */}
        <div className="flex">
          {/* 侧边栏 */}
          <AnimatePresence>
            {(sidebarOpen || isDesktop) && (
              <motion.aside
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed md:sticky top-[73px] left-0 z-40 w-64 h-[calc(100vh-73px)] bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto"
              >
                <nav className="p-4 space-y-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => {
                          setActiveSection(section.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                          activeSection === section.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-700/50'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">{section.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* 遮罩层（移动端） */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* 主内容区域 */}
          <main className="flex-1 min-h-[calc(100vh-73px)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-4xl mx-auto px-4 md:px-6 py-8"
            >
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
                
                {/* 动态内容区域 */}
                <AnimatePresence mode="wait">
                  {sections.map((section) => (
                    activeSection === section.id && (
                      <motion.div
                        key={section.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center space-x-3 mb-6">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            section.id === 'url-query' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            section.id === 'api-usage' ? 'bg-green-100 dark:bg-green-900/30' :
                            section.id === 'rate-limit' ? 'bg-cyan-100 dark:bg-cyan-900/30' :
                            'bg-purple-100 dark:bg-purple-900/30'
                          }`}>
                            <section.icon className={`w-6 h-6 ${
                              section.id === 'url-query' ? 'text-blue-600 dark:text-blue-400' :
                              section.id === 'api-usage' ? 'text-green-600 dark:text-green-400' :
                              section.id === 'rate-limit' ? 'text-cyan-600 dark:text-cyan-400' :
                              'text-purple-600 dark:text-purple-400'
                            }`} />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {section.title}
                          </h2>
                        </div>
                        {section.content}
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>

              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}