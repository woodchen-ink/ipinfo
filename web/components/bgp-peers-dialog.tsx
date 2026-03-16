'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { fetchBGPPeers, ProcessedBGPData, BGPPeer } from '@/lib/bgp-api';
import BGPNetworkChart from '@/components/bgp-network-chart';
import { Loader2, AlertCircle, Network, Globe, Hash, Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface BGPPeersDialogProps {
  asn: number;
  asnName?: string;
  isOpen: boolean;
  onClose: () => void;
}

type ViewType = 'upstream' | 'downstream' | 'all';

export default function BGPPeersDialog({
  asn,
  asnName,
  isOpen,
  onClose
}: BGPPeersDialogProps) {
  const [bgpData, setBgpData] = useState<ProcessedBGPData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('all');

  const fetchBGPData = useCallback(async () => {
    if (!asn) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchBGPPeers(asn);
      setBgpData(data);

      toast.success("BGP 数据获取成功", {
        description: `找到 ${data.allPeers.length} 个邻居关系`,
        duration: 1000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'BGP 数据获取失败';
      setError(errorMessage);

      toast.error("BGP 数据获取失败", {
        description: errorMessage,
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [asn]);

  useEffect(() => {
    if (isOpen && asn) {
      fetchBGPData();
    }
  }, [isOpen, asn, fetchBGPData]);

  useEffect(() => {
    if (!isOpen) {
      setBgpData(null);
      setError(null);
    }
  }, [isOpen]);

  const handleRetry = () => {
    fetchBGPData();
  };

  const getDisplayPeers = (data: ProcessedBGPData): BGPPeer[] => {
    switch (viewType) {
      case 'upstream': return data.upstreams;
      case 'downstream': return data.downstreams;
      default: return data.allPeers;
    }
  };

  const getPeerTypeLabel = (type: string) => {
    switch (type) {
      case 'left': return '上游';
      case 'right': return '下游';
      default: return '不确定';
    }
  };

  const getPeerTypeColor = (type: string) => {
    switch (type) {
      case 'left': return 'bg-blue-500';
      case 'right': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] overflow-hidden bg-white/98 backdrop-blur-sm sm:!max-w-7xl flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center space-x-2">
            <Network className="w-5 h-5 text-blue-500" />
            <span>BGP 邻居关系</span>
          </DialogTitle>
          <DialogDescription>
            AS{asn} {asnName && `(${asnName})`} 的 BGP 邻居连接关系图 (数据来源: RIPEstat)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* 加载状态 */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-[rgb(var(--color-text-primary))]">
                  正在获取 BGP 数据...
                </p>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
                  请稍候，这可能需要几秒钟时间
                </p>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-[rgb(var(--color-text-primary))]">
                  数据获取失败
                </p>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] max-w-md">
                  {error}
                </p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-sm font-medium"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 数据展示 */}
          {bgpData && !isLoading && !error && (
            <div className="space-y-6">
              {/* 统计信息 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[rgb(var(--color-surface))] rounded-lg p-4 border border-[rgb(var(--color-border))] transition-colors duration-300">
                  <div className="flex items-center space-x-2">
                    <Hash className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">目标 ASN</span>
                  </div>
                  <p className="text-lg font-bold text-[rgb(var(--color-text-primary))] mt-1">
                    AS{bgpData.centerAsn}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-text-muted))] truncate">
                    {bgpData.centerName}
                  </p>
                </div>

                <div className="bg-[rgb(var(--color-surface))] rounded-lg p-4 border border-[rgb(var(--color-border))] transition-colors duration-300">
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">上游</span>
                  </div>
                  <p className="text-lg font-bold text-[rgb(var(--color-text-primary))] mt-1">
                    {bgpData.upstreams.length}
                  </p>
                </div>

                <div className="bg-[rgb(var(--color-surface))] rounded-lg p-4 border border-[rgb(var(--color-border))] transition-colors duration-300">
                  <div className="flex items-center space-x-2">
                    <ArrowDownRight className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">下游</span>
                  </div>
                  <p className="text-lg font-bold text-[rgb(var(--color-text-primary))] mt-1">
                    {bgpData.downstreams.length}
                  </p>
                </div>

                <div className="bg-[rgb(var(--color-surface))] rounded-lg p-4 border border-[rgb(var(--color-border))] transition-colors duration-300">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">总邻居数</span>
                  </div>
                  <p className="text-lg font-bold text-[rgb(var(--color-text-primary))] mt-1">
                    {bgpData.allPeers.length}
                  </p>
                </div>
              </div>

              {/* 网络关系图 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-5 h-5 text-green-500" />
                    <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                      网络拓扑图
                    </h3>
                  </div>

                  {/* 视图切换 */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">显示:</span>
                    <div className="flex bg-[rgb(var(--color-surface-hover))] rounded-lg p-1 border border-[rgb(var(--color-border))]">
                      <button
                        onClick={() => setViewType('upstream')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200 ${
                          viewType === 'upstream'
                            ? 'bg-blue-500 text-white'
                            : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                        }`}
                      >
                        上游
                      </button>
                      <button
                        onClick={() => setViewType('downstream')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200 ${
                          viewType === 'downstream'
                            ? 'bg-orange-500 text-white'
                            : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                        }`}
                      >
                        下游
                      </button>
                      <button
                        onClick={() => setViewType('all')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200 ${
                          viewType === 'all'
                            ? 'bg-emerald-500 text-white'
                            : 'text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                        }`}
                      >
                        全部
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[rgb(var(--color-surface))] rounded-lg p-4 border border-[rgb(var(--color-border))] transition-colors duration-300">
                  <BGPNetworkChart
                    data={bgpData}
                    viewType={viewType}
                    className="min-h-[400px]"
                  />
                </div>

                <div className="text-xs text-[rgb(var(--color-text-muted))] space-y-1">
                  <p>* 上游 (left): 该 ASN 从其接收路由的提供者</p>
                  <p>* 下游 (right): 从该 ASN 接收路由的客户</p>
                  <p>* 节点大小表示观测到的路径数量，鼠标悬停查看详情</p>
                </div>
              </div>

              {/* 邻居节点列表 */}
              {bgpData.allPeers.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[rgb(var(--color-text-primary))]">
                      邻居节点列表
                    </h3>
                    <span className="text-sm text-[rgb(var(--color-text-secondary))]">
                      {viewType === 'upstream' ? `上游: ${bgpData.upstreams.length} 个` :
                       viewType === 'downstream' ? `下游: ${bgpData.downstreams.length} 个` :
                       `共 ${bgpData.allPeers.length} 个`}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {getDisplayPeers(bgpData).map((peer) => (
                      <div
                        key={`${peer.asn}-${peer.type}`}
                        className="flex items-center justify-between p-3 bg-[rgb(var(--color-surface-hover))] rounded-lg border border-[rgb(var(--color-border))] transition-colors duration-300"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getPeerTypeColor(peer.type)}`}></div>
                          <span className="font-mono text-sm font-medium text-[rgb(var(--color-text-primary))]">
                            AS{peer.asn}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text-secondary))] border border-[rgb(var(--color-border))]">
                            {getPeerTypeLabel(peer.type)}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-[rgb(var(--color-text-muted))]">
                          <span>路径: {peer.power}</span>
                          {peer.v4Peer > 0 && <span>v4: {peer.v4Peer}</span>}
                          {peer.v6Peer > 0 && <span>v6: {peer.v6Peer}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
