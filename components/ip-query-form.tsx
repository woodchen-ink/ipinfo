'use client';

import React, { useState } from 'react';
import { Search, Globe, Wifi } from 'lucide-react';
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
    if (!ip) return <Globe className="w-4 h-4" />;
    
    const version = detectIPVersion(ip);
    if (version === 'IPv4') return <Wifi className="w-4 h-4 text-blue-500" />;
    if (version === 'IPv6') return <Wifi className="w-4 h-4 text-purple-500" />;
    return <Globe className="w-4 h-4 text-gray-400" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="输入IP地址查询，或留空查询当前IP"
            className={`
              w-full px-6 py-4 pl-12 pr-16 text-lg font-mono
              bg-white/80 backdrop-blur-sm
              border-2 rounded-2xl
              transition-all duration-300
              focus:outline-none focus:ring-0
              ${validationError || error 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-gray-200 focus:border-blue-400'
              }
              placeholder-gray-400
            `}
            disabled={isLoading}
          />
          
          {/* IP版本指示器 */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            {getIPVersionIcon(inputValue)}
          </div>
          
          {/* 提交按钮 */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              absolute right-2 top-1/2 transform -translate-y-1/2
              px-4 py-2 rounded-xl
              transition-all duration-200
              ${isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
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
              <Search className="w-5 h-5" />
            )}
          </motion.button>
        </div>
        
        {/* 错误提示 */}
        {(validationError || error) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-red-500 text-sm font-medium"
          >
            {validationError || error}
          </motion.div>
        )}
        
        {/* IP版本提示 */}
        {inputValue && isValidIP(inputValue) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm text-gray-600"
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
        className="mt-6 flex flex-wrap gap-2 justify-center"
      >
        <button
          onClick={() => handleInputChange('')}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          查询我的IP
        </button>
        <button
          onClick={() => handleInputChange('8.8.8.8')}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          示例IPv4
        </button>
        <button
          onClick={() => handleInputChange('2001:4860:4860::8888')}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          示例IPv6
        </button>
      </motion.div>
    </motion.div>
  );
} 