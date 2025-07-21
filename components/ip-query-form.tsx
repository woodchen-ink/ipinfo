'use client';

import React, { useState } from 'react';
import ReactCountryFlag from "react-country-flag";
import { Search, Globe, Wifi, Sparkles, Zap, Target } from 'lucide-react';
import { useIPQueryStore } from '@/lib/store';
import { detectIPVersion, isValidIP } from '@/lib/ip-detection';
import { motion } from 'framer-motion';

export default function IPQueryForm() {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const { setQuery, executeQuery, isLoading, error, clearError } = useIPQueryStore();

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setValidationError('');
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedValue = inputValue.trim();
    
    // 如果输入为空，查询当前客户端IP
    if (!trimmedValue) {
      setQuery('');
      await executeQuery();
      return;
    }
    
    // 验证IP格式
    if (!isValidIP(trimmedValue)) {
      setValidationError('请输入有效的IPv4或IPv6地址');
      return;
    }
    
    setQuery(trimmedValue);
    await executeQuery(trimmedValue);
  };

  const getIPVersionIcon = (ip: string) => {
    if (!ip) return <Globe className="w-5 h-5" />;
    
    const version = detectIPVersion(ip);
    if (version === 'IPv4') return <Wifi className="w-5 h-5 text-blue-500" />;
    if (version === 'IPv6') return <Wifi className="w-5 h-5 text-purple-500" />;
    return <Globe className="w-5 h-5 text-gray-400" />;
  };

  // 安全的国旗组件
  const SafeCountryFlag = ({ countryCode, style }: { countryCode: string, style?: React.CSSProperties }) => {
    try {
      return (
        <ReactCountryFlag 
          countryCode={countryCode} 
          svg 
          style={style}
        />
      );
    } catch (error) {
      return (
        <div 
          className="bg-gray-200 rounded flex items-center justify-center"
          style={style}
        >
          <Globe className="w-2 h-2 text-gray-500" />
        </div>
      );
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="输入IP地址查询，或留空查询当前IP"
            className={`
              w-full px-8 py-5 pl-14 pr-20 text-xl font-mono
              bg-[rgb(var(--color-glass-background))] backdrop-blur-sm
              border-2 rounded-2xl shadow-lg
              transition-all duration-300
              focus:outline-none focus:ring-0 focus:shadow-xl
              text-[rgb(var(--color-text-primary))]
              placeholder:text-[rgb(var(--color-text-muted))]
              ${validationError || error 
                ? 'border-red-300 dark:border-red-600 focus:border-red-500 dark:focus:border-red-400' 
                : 'border-[rgb(var(--color-border))] focus:border-blue-400 dark:focus:border-blue-500'
              }
            `}
            disabled={isLoading}
          />
          
          {/* IP版本指示器 */}
          <div className="absolute left-5 top-1/2 transform -translate-y-1/2">
            {getIPVersionIcon(inputValue)}
          </div>
          
          {/* 提交按钮 */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              absolute right-3 top-1/2 transform -translate-y-1/2
              px-5 py-3 rounded-xl
              transition-all duration-200
              ${isLoading
                ? 'bg-[rgb(var(--color-text-muted))] cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'
              }
              text-white font-medium
            `}
          >
            {isLoading ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Search className="w-6 h-6" />
            )}
          </motion.button>
        </div>
        
        {/* 错误提示 */}
        {(validationError || error) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-red-500 dark:text-red-400 text-sm font-medium transition-colors duration-300"
          >
            {validationError || error}
          </motion.div>
        )}
        
        {/* IP版本提示 */}
        {inputValue && isValidIP(inputValue) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm text-[rgb(var(--color-text-secondary))]"
          >
            检测到: {detectIPVersion(inputValue)} 地址
          </motion.div>
        )}
      </form>
      
      {/* 快捷操作 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex flex-wrap gap-3 justify-center"
      >
        <motion.button
          onClick={() => handleInputChange('')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-800/30 dark:hover:to-purple-800/30 rounded-full transition-all duration-200 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-border-light))]"
        >
          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-[rgb(var(--color-text-secondary))] font-medium">查询我的IP</span>
        </motion.button>
        <motion.button
          onClick={() => handleInputChange('8.8.8.8')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-4 py-2.5 text-sm bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-full transition-all duration-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
        >
          <div className="flex items-center space-x-1.5">
            <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <SafeCountryFlag 
              countryCode="US" 
              style={{
                width: '1em',
                height: '1em',
                borderRadius: '1px'
              }}
            />
          </div>
          <span className="text-[rgb(var(--color-text-secondary))] font-medium">示例IPv4</span>
        </motion.button>
        <motion.button
          onClick={() => handleInputChange('2001:4860:4860::8888')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center space-x-2 px-4 py-2.5 text-sm bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-800/30 rounded-full transition-all duration-200 border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600"
        >
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <SafeCountryFlag 
              countryCode="US" 
              style={{
                width: '1em',
                height: '1em',
                borderRadius: '1px'
              }}
            />
          </div>
          <span className="text-[rgb(var(--color-text-secondary))] font-medium">示例IPv6</span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
} 