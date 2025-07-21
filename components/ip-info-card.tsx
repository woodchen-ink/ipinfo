'use client';

import React from 'react';
import { motion } from 'framer-motion';
import ReactCountryFlag from "react-country-flag";
import { 
  MapPin, 
  Globe, 
  Wifi, 
  Clock, 
  Building, 
  Shield,
  Copy,
  CheckCircle,
  Server,
  Network,
  Router,
  MapIcon,
  Zap,
  Eye,
  Hash,
  Flag
} from 'lucide-react';
import { IPInfo } from '@/lib/store';
import { useState, useEffect } from 'react';

interface IPInfoCardProps {
  ipData: IPInfo;
}

export default function IPInfoCard({ ipData }: IPInfoCardProps) {
  const [copied, setCopied] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update current time only on client side to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      if (ipData.timezone) {
        setCurrentTime(new Date().toLocaleString('zh-CN', {
          timeZone: ipData.timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }));
      }
    };

    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, [ipData.timezone]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 检查是否为有效的国家代码
  const isValidCountryCode = (code: string) => {
    return code && 
           code.length === 2 && 
           code !== 'XX' && 
           code !== '--' && 
           code.toUpperCase() !== 'PRIVATE' &&
           code.toUpperCase() !== 'ZZ' &&
           code !== '**';
  };

  // 检查是否为私有IP
  const isPrivateIP = (ip: string) => {
    // 私有IPv4地址范围
    const privateIPv4Ranges = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^127\./,
      /^169\.254\./
    ];

    // 私有IPv6地址
    const privateIPv6Ranges = [
      /^::1$/,
      /^fc[0-9a-f]{2}:/i,
      /^fd[0-9a-f]{2}:/i,
      /^fe80:/i
    ];

    return privateIPv4Ranges.some(range => range.test(ip)) || 
           privateIPv6Ranges.some(range => range.test(ip));
  };

  // 国旗组件，带有错误处理
  const CountryFlagWithFallback = ({ countryCode, style, className = '' }: { 
    countryCode: string, 
    style?: React.CSSProperties, 
    className?: string 
  }) => {
    const isPrivate = isPrivateIP(ipData.ip);
    
    if (!isValidCountryCode(countryCode) || isPrivate) {
      return (
        <div 
          className={`bg-gradient-to-br from-gray-100 to-gray-200 rounded flex items-center justify-center ${className}`}
          style={style}
          title={isPrivate ? "私有地址" : "未知地区"}
        >
          {isPrivate ? (
            <Shield className="w-3 h-3 text-gray-600" />
          ) : (
            <Globe className="w-3 h-3 text-gray-500" />
          )}
        </div>
      );
    }
    
    try {
      return (
        <ReactCountryFlag 
          countryCode={countryCode.toUpperCase()} 
          svg 
          style={style}
          className={className}
          title={ipData.country}
        />
      );
    } catch (error) {
      return (
        <div 
          className={`bg-gray-200 rounded flex items-center justify-center ${className}`}
          style={style}
          title="国旗加载失败"
        >
          <Globe className="w-3 h-3 text-gray-500" />
        </div>
      );
    }
  };

  const formatLocation = () => {
    const parts = [ipData.country];
    if (ipData.province) parts.push(ipData.province);
    if (ipData.city) parts.push(ipData.city);
    if (ipData.district) parts.push(ipData.district);
    return parts.join(' · ');
  };

  const getVersionColor = (version: string) => {
    return version === 'IPv4' ? 'text-blue-500' : 'text-purple-500';
  };

  const getVersionBg = (version: string) => {
    return version === 'IPv4' ? 'bg-blue-50' : 'bg-purple-50';
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-4xl mx-auto"
    >
      {/* 主IP展示卡片 */}
      <motion.div 
        variants={itemVariants}
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
      >
        {/* 头部 - IP地址 */}
        <div className={`px-8 py-6 ${getVersionBg(ipData.ipVersion)} border-b border-gray-100`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl ${getVersionBg(ipData.ipVersion)} border`}>
                <Wifi className={`w-6 h-6 ${getVersionColor(ipData.ipVersion)}`} />
              </div>
              <div>
                <h1 className="text-3xl font-mono font-bold text-gray-900 mb-1">
                  {ipData.ip}
                </h1>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVersionColor(ipData.ipVersion)} bg-white`}>
                    {ipData.ipVersion}
                  </span>
                  <div className="flex items-center space-x-2">
                    <CountryFlagWithFallback 
                      countryCode={ipData.countryCode} 
                      style={{
                        width: '1.2em',
                        height: '1.2em',
                        borderRadius: '2px'
                      }}
                    />
                    <span className="text-sm text-gray-600">
                      {isPrivateIP(ipData.ip) ? '本地网络' : ipData.country}
                    </span>
                    {isPrivateIP(ipData.ip) && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        私有
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    数据源: {ipData.source}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(ipData.ip, 'ip')}
              className="p-2 rounded-xl hover:bg-white/50 transition-colors"
            >
              {copied === 'ip' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* 详细信息网格 */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 地理位置 */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">地理位置</h3>
              </div>
              <div className="pl-7 space-y-3">
                <div className="flex items-center space-x-3">
                  <CountryFlagWithFallback 
                    countryCode={ipData.countryCode} 
                    style={{
                      width: '2em',
                      height: '2em',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <p className="text-lg font-medium text-gray-800">
                    {formatLocation()}
                  </p>
                </div>
                {ipData.postal && (
                  <p className="text-sm text-gray-600">
                    邮编: {ipData.postal}
                  </p>
                )}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>纬度: {ipData.location.latitude.toFixed(4)}°</p>
                  <p>经度: {ipData.location.longitude.toFixed(4)}°</p>
                  {ipData.location.accuracy_radius && (
                    <p>精度半径: ~{ipData.location.accuracy_radius}km</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 网络信息 */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">网络信息</h3>
              </div>
              <div className="pl-7 space-y-3">
                {ipData.isp && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Router className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">运营商</span>
                    </div>
                    <span className="font-medium text-gray-800">{ipData.isp}</span>
                  </div>
                )}
                {ipData.net && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">ASN</span>
                    </div>
                    <span className="font-mono text-sm text-gray-800">{ipData.net}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">精度</span>
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1
                    ${ipData.accuracy === 'high' ? 'bg-green-100 text-green-700' :
                      ipData.accuracy === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'}
                  `}>
                    <Zap className="w-3 h-3" />
                    <span>
                      {ipData.accuracy === 'high' ? '高精度' :
                       ipData.accuracy === 'medium' ? '中等精度' : '低精度'}
                    </span>
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 时区信息 */}
            {ipData.timezone && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">时区信息</h3>
                </div>
                <div className="pl-7 space-y-2">
                  <p className="font-mono text-gray-800">{ipData.timezone}</p>
                  {currentTime && (
                    <p className="text-sm text-gray-600">
                      当地时间: {currentTime}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* 其他信息 */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">区域代码</h3>
              </div>
              <div className="pl-7 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Flag className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">国家代码</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CountryFlagWithFallback 
                      countryCode={ipData.countryCode} 
                      style={{
                        width: '1.2em',
                        height: '1.2em',
                        borderRadius: '2px'
                      }}
                    />
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">{ipData.countryCode}</span>
                  </div>
                </div>
                {ipData.provinceCode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">省份代码</span>
                    </div>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">{ipData.provinceCode}</span>
                  </div>
                )}
                {ipData.cityCode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">城市代码</span>
                    </div>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">{ipData.cityCode}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 地图占位符 */}
      <motion.div 
        variants={itemVariants}
        className="mt-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-6"
      >
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl relative overflow-hidden">
          {/* 装饰性网格背景 */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }} />
          </div>
          
          <div className="text-center relative z-10">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: 0.3
              }}
              className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <MapPin className="w-10 h-10 text-green-600" />
            </motion.div>
            <p className="text-gray-600 font-medium mb-2">地图组件将在后续版本中集成</p>
            <div className="inline-flex items-center space-x-2 bg-white/80 px-3 py-1.5 rounded-full text-sm text-gray-500">
              <Globe className="w-4 h-4" />
              <span>
                {ipData.location.latitude.toFixed(4)}°, {ipData.location.longitude.toFixed(4)}°
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 