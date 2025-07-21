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
  Network,
  Router,
  MapIcon,
  Zap,
  Eye,
  Hash,
  Flag,
  Building2,
  Server,
  Layers
} from 'lucide-react';
import { IPInfo } from '@/lib/store';
import { useState, useEffect } from 'react';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import LazyIPMap from '@/components/lazy-ip-map';
import { toast } from "sonner";

interface IPInfoCardProps {
  ipData: IPInfo;
}

export default function IPInfoCard({ ipData }: IPInfoCardProps) {
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
      toast.success("复制成功", {
        description: `${type}: ${text}`,
        duration: 2000,
      });
    } catch (err) {
      console.error('复制失败:', err);
      toast.error("复制失败", {
        description: "无法访问剪贴板，请手动复制",
        duration: 3000,
      });
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
      /^169\.254\./,
      /^0\.0\.0\.0$/,
      /^255\.255\.255\.255$/,
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
    } catch {
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

  // 格式化区域信息
  const formatRegions = () => {
    if (ipData.regions) {
      return ipData.regions.join(' · ');
    }
    return formatLocation();
  };

  // 格式化简化区域信息
  const formatRegionsShort = () => {
    if (ipData.regions_short) {
      return ipData.regions_short.join(' · ');
    }
    return null;
  };

  const getVersionColor = (version: string) => {
    return version === 'IPv4' ? 'text-blue-500' : 'text-purple-500';
  };

  const getVersionBg = (version: string) => {
    return version === 'IPv4' ? 'bg-blue-50 dark:bg-blue-950/50' : 'bg-purple-50 dark:bg-purple-950/50';
  };

  // 获取数据源颜色
  const getSourceColor = (source: string) => {
    return source === 'MaxMind' ? 'text-blue-600' : 'text-green-600';
  };

  const getSourceBg = (source: string) => {
    return source === 'MaxMind' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30';
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
        className="bg-[rgb(var(--color-glass-background))] backdrop-blur-sm rounded-3xl shadow-xl border border-[rgb(var(--color-border))] overflow-hidden transition-colors duration-300"
      >
        {/* 头部 - IP地址 */}
        <div className={`px-8 py-6 ${getVersionBg(ipData.ipVersion)} border-b border-[rgb(var(--color-border))] transition-colors duration-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl ${getVersionBg(ipData.ipVersion)} border border-[rgb(var(--color-border))] transition-colors duration-300`}>
                <Wifi className={`w-6 h-6 ${getVersionColor(ipData.ipVersion)}`} />
              </div>
              
              <div>
                <div className="mb-1">
                  <TextGenerateEffect 
                    words={ipData.ip}
                    className="text-3xl font-mono font-bold text-[rgb(var(--color-text-primary))]"
                    duration={0.3}
                  />
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVersionColor(ipData.ipVersion)} bg-[rgb(var(--color-surface))] dark:bg-[rgb(var(--color-surface-hover))] transition-colors duration-300`}>
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
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">
                      {isPrivateIP(ipData.ip) ? '本地网络' : ipData.country}
                    </span>
                    {isPrivateIP(ipData.ip) && (
                      <span className="text-xs text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-surface-hover))] px-2 py-0.5 rounded-full transition-colors duration-300">
                        私有
                      </span>
                    )}
                  </div>
                  <span className={`text-sm px-2 py-0.5 rounded-full transition-colors duration-300 ${getSourceBg(ipData.source)} ${getSourceColor(ipData.source)}`}>
                    {ipData.source}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => copyToClipboard(ipData.ip, 'IP地址')}
              className="p-2 rounded-xl hover:bg-[rgb(var(--color-surface-hover))] transition-colors duration-200"
            >
              <Copy className="w-5 h-5 text-[rgb(var(--color-text-muted))]" />
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
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">地理位置</h3>
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
                  <div>
                    <p className="text-lg font-medium text-[rgb(var(--color-text-primary))]">
                      {formatRegions()}
                    </p>
                    {formatRegionsShort() && (
                      <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                        简称: {formatRegionsShort()}
                      </p>
                    )}
                  </div>
                </div>
                {ipData.postal && (
                  <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                    邮编: {ipData.postal}
                  </p>
                )}
                <div className="text-sm text-[rgb(var(--color-text-muted))] space-y-1">
                  <p>纬度: {ipData.location.latitude.toFixed(4)}°</p>
                  <p>经度: {ipData.location.longitude.toFixed(4)}°</p>
                  {ipData.location.accuracy_radius && (
                    <p>精度半径: ~{ipData.location.accuracy_radius}km</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* 网络信息 - 增强ASN展示 */}
            <motion.div variants={itemVariants} className="space-y-3">
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">网络信息</h3>
              </div>
              <div className="pl-7 space-y-3">
                {/* ASN编号 */}
                {ipData.as?.number && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">ASN编号</span>
                    </div>
                    <span className="font-mono text-sm bg-[rgb(var(--color-surface-hover))] px-2 py-1 rounded text-[rgb(var(--color-text-primary))] transition-colors duration-300">
                      AS{ipData.as.number}
                    </span>
                  </div>
                )}
                
                {/* ASN组织 */}
                {ipData.as?.name && (
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">ASN组织</span>
                    </div>
                    <span className="font-medium text-right text-[rgb(var(--color-text-primary))] max-w-xs break-words">
                      {ipData.as.name}
                    </span>
                  </div>
                )}

                {/* 中文ISP信息 */}
                {ipData.as?.info && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Router className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">运营商</span>
                    </div>
                    <span className="font-medium text-[rgb(var(--color-text-primary))]">{ipData.as.info}</span>
                  </div>
                )}

                {/* 传统ISP字段 */}
                {ipData.isp && !ipData.as?.info && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Router className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">运营商</span>
                    </div>
                    <span className="font-medium text-[rgb(var(--color-text-primary))]">{ipData.isp}</span>
                  </div>
                )}

                {/* 网络类型 */}
                {ipData.type && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">网络类型</span>
                    </div>
                    <span className="font-medium text-[rgb(var(--color-text-primary))]">{ipData.type}</span>
                  </div>
                )}

                {/* 网络地址 */}
                {ipData.net && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">网络段</span>
                    </div>
                    <span className="font-mono text-sm text-[rgb(var(--color-text-primary))]">{ipData.net}</span>
                  </div>
                )}
                
                {/* 数据精度 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                    <span className="text-[rgb(var(--color-text-secondary))]">精度</span>
                  </div>
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 transition-colors duration-300
                    ${ipData.accuracy === 'high' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      ipData.accuracy === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}
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
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">时区信息</h3>
                </div>
                <div className="pl-7 space-y-2">
                  <p className="font-mono text-[rgb(var(--color-text-primary))]">{ipData.timezone}</p>
                  {currentTime && (
                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                      当地时间: {currentTime}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* 注册国家信息 */}
            {ipData.registered_country && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[rgb(var(--color-text-muted))]" />
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">注册信息</h3>
                </div>
                <div className="pl-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Flag className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">注册国家</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CountryFlagWithFallback 
                        countryCode={ipData.registered_country.code} 
                        style={{
                          width: '1.2em',
                          height: '1.2em',
                          borderRadius: '2px'
                        }}
                      />
                      <span className="font-medium text-[rgb(var(--color-text-primary))]">
                        {ipData.registered_country.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapIcon className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">注册代码</span>
                    </div>
                    <span className="font-mono text-sm bg-[rgb(var(--color-surface-hover))] px-2 py-1 rounded text-[rgb(var(--color-text-primary))] transition-colors duration-300">
                      {ipData.registered_country.code}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 其他区域代码信息 */}
            {(ipData.countryCode || ipData.provinceCode || ipData.cityCode) && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[rgb(var(--color-text-muted))]" />
                  <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">区域代码</h3>
                </div>
                <div className="pl-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Flag className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                      <span className="text-[rgb(var(--color-text-secondary))]">国家代码</span>
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
                      <span className="font-mono text-sm bg-[rgb(var(--color-surface-hover))] px-2 py-1 rounded text-[rgb(var(--color-text-primary))] transition-colors duration-300">{ipData.countryCode}</span>
                    </div>
                  </div>
                  
                  {ipData.provinceCode && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapIcon className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                        <span className="text-[rgb(var(--color-text-secondary))]">省份代码</span>
                      </div>
                      <span className="font-mono text-sm bg-[rgb(var(--color-surface-hover))] px-2 py-1 rounded text-[rgb(var(--color-text-primary))] transition-colors duration-300">{ipData.provinceCode}</span>
                    </div>
                  )}
                  {ipData.cityCode && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-[rgb(var(--color-text-muted))]" />
                        <span className="text-[rgb(var(--color-text-secondary))]">城市代码</span>
                      </div>
                      <span className="font-mono text-sm bg-[rgb(var(--color-surface-hover))] px-2 py-1 rounded text-[rgb(var(--color-text-primary))] transition-colors duration-300">{ipData.cityCode}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* 地图组件 */}
      <motion.div
        variants={itemVariants}
        className="mt-6"
      >
        <LazyIPMap ipData={ipData} />
      </motion.div>
    </motion.div>
  );
} 