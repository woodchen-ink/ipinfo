"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Home, FileText, MessageCircle } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const navLinks = [
    {
      href: "/",
      label: "首页",
      icon: Home,
    },
    {
      href: "/docs",
      label: "使用说明",
      icon: FileText,
    },
    {
      href: "https://www.sunai.net/t/topic/946",
      label: "问题反馈",
      icon: MessageCircle,
      external: true,
    },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* 导航链接 */}
          <nav className="flex items-center space-x-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const linkContent = (
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{link.label}</span>
                  {link.external && (
                    <span className="text-xs text-gray-400">↗</span>
                  )}
                </div>
              );

              return (
                <div key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {linkContent}
                    </a>
                  ) : (
                    <Link href={link.href}>
                      {linkContent}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 版权信息 */}
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center md:text-right">
            <p>© {currentYear} 专注于提供精确的IP地理位置信息</p>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}