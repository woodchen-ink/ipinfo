'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Globe, 
  Wifi, 
  Clock, 
  Building, 
  Shield,
  Copy,
  CheckCircle
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
                  <span className="text-sm text-gray-600">
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
              <div className="pl-7 space-y-2">
                <p className="text-lg font-medium text-gray-800">
                  {formatLocation()}
                </p>
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
                <Building className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">网络信息</h3>
              </div>
              <div className="pl-7 space-y-2">
                {ipData.isp && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">运营商</span>
                    <span className="font-medium text-gray-800">{ipData.isp}</span>
                  </div>
                )}
                {ipData.net && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">ASN</span>
                    <span className="font-mono text-sm text-gray-800">{ipData.net}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">精度</span>
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${ipData.accuracy === 'high' ? 'bg-green-100 text-green-700' :
                      ipData.accuracy === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'}
                  `}>
                    {ipData.accuracy === 'high' ? '高精度' :
                     ipData.accuracy === 'medium' ? '中等精度' : '低精度'}
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
                <h3 className="font-semibold text-gray-900">其他信息</h3>
              </div>
              <div className="pl-7 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">国家代码</span>
                  <span className="font-mono text-sm text-gray-800">{ipData.countryCode}</span>
                </div>
                {ipData.provinceCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">省份代码</span>
                    <span className="font-mono text-sm text-gray-800">{ipData.provinceCode}</span>
                  </div>
                )}
                {ipData.cityCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">城市代码</span>
                    <span className="font-mono text-sm text-gray-800">{ipData.cityCode}</span>
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
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
          <div className="text-center">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">地图组件将在后续版本中集成</p>
            <p className="text-sm text-gray-500 mt-1">
              位置: {ipData.location.latitude.toFixed(4)}°, {ipData.location.longitude.toFixed(4)}°
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 