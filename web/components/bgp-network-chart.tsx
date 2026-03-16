'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { ProcessedBGPData, BGPPeer } from '@/lib/bgp-api';
import { Globe, ZoomIn, ZoomOut, RotateCcw, Download, ArrowUpRight, ArrowDownRight, HelpCircle } from 'lucide-react';
import { toast } from "sonner";

interface NetworkNode {
  id: string;
  asn: number;
  isCenter: boolean;
  peerType: 'origin' | 'upstream' | 'downstream' | 'uncertain';
  tier: 'origin' | 'tier1' | 'tier2' | 'tier3';
  power: number;
  v4Peer: number;
  v6Peer: number;
  x: number;
  y: number;
  color: string;
  label?: string;
}

interface NetworkLink {
  source: string;
  target: string;
  sourceNode: NetworkNode;
  targetNode: NetworkNode;
  type: 'upstream' | 'downstream' | 'uncertain';
}

interface BGPNetworkChartProps {
  data: ProcessedBGPData;
  viewType?: 'upstream' | 'downstream' | 'all';
  width?: number;
  height?: number;
  className?: string;
}

export default function BGPNetworkChart({
  data,
  viewType = 'all',
  width = 1000,
  height = 600,
  className = ''
}: BGPNetworkChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);

  // ASN层级分类常量
  const TIER1_ASNS = useMemo(() => [174, 209, 286, 701, 1239, 1299, 2914, 3257, 3320, 3356, 3491, 5511, 6453, 6461, 6830, 7018, 12956], []);
  const TIER2_ASNS = useMemo(() => [2497, 6939, 9370, 17676, 25820, 59105, 137409, 215871], []);

  const getASNTier = useCallback((asn: number) => {
    if (TIER1_ASNS.includes(asn)) return { tier: 'tier1' as const, label: 'Tier 1 ISP', color: '#3b82f6' };
    if (TIER2_ASNS.includes(asn)) return { tier: 'tier2' as const, label: 'Tier 2 ISP', color: '#f97316' };
    return { tier: 'tier3' as const, label: 'Network', color: '#8b5cf6' };
  }, [TIER1_ASNS, TIER2_ASNS]);

  const processData = useCallback(() => {
    if (!data) return { nodes: [], links: [] };

    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];

    // Center node
    const centerNode: NetworkNode = {
      id: `as${data.centerAsn}`,
      asn: data.centerAsn,
      isCenter: true,
      peerType: 'origin',
      tier: 'origin',
      power: 0,
      v4Peer: 0,
      v6Peer: 0,
      x: width / 2,
      y: height / 2,
      color: '#22c55e',
      label: data.centerName || `AS${data.centerAsn}`
    };
    nodes.push(centerNode);

    // Filter peers based on viewType, limit to top 30 by power for readability
    const maxPeers = 30;

    const addPeers = (peers: BGPPeer[], peerType: 'upstream' | 'downstream' | 'uncertain', angleStart: number, angleEnd: number) => {
      const limitedPeers = peers.slice(0, maxPeers);
      const angleStep = limitedPeers.length > 1 ? (angleEnd - angleStart) / (limitedPeers.length - 1) : 0;
      const radius = 220;

      limitedPeers.forEach((peer, index) => {
        const tierInfo = getASNTier(peer.asn);
        const angle = limitedPeers.length === 1
          ? (angleStart + angleEnd) / 2
          : angleStart + index * angleStep;
        const rad = (angle * Math.PI) / 180;

        const node: NetworkNode = {
          id: `as${peer.asn}`,
          asn: peer.asn,
          isCenter: false,
          peerType,
          tier: tierInfo.tier,
          power: peer.power,
          v4Peer: peer.v4Peer,
          v6Peer: peer.v6Peer,
          x: width / 2 + Math.cos(rad) * radius,
          y: height / 2 + Math.sin(rad) * radius,
          color: peerType === 'upstream' ? '#3b82f6' : peerType === 'downstream' ? '#f97316' : '#6b7280',
          label: tierInfo.label
        };
        nodes.push(node);

        links.push({
          source: centerNode.id,
          target: node.id,
          sourceNode: centerNode,
          targetNode: node,
          type: peerType
        });
      });
    };

    if (viewType === 'upstream' || viewType === 'all') {
      const angleRange = viewType === 'all' ? { start: 150, end: 210 } : { start: 120, end: 240 };
      addPeers(data.upstreams, 'upstream', angleRange.start, angleRange.end);
    }

    if (viewType === 'downstream' || viewType === 'all') {
      const angleRange = viewType === 'all' ? { start: -30, end: 30 } : { start: -60, end: 60 };
      addPeers(data.downstreams, 'downstream', angleRange.start, angleRange.end);
    }

    if (viewType === 'all' && data.uncertain.length > 0) {
      addPeers(data.uncertain.slice(0, 15), 'uncertain', 60, 120);
    }

    return { nodes, links };
  }, [data, viewType, width, height, getASNTier]);

  // Draw chart
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { nodes, links } = processData();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        setTransform(event.transform);
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    const g = svg.append("g");

    // Arrow markers
    const defs = g.append("defs");

    ['upstream', 'downstream', 'uncertain'].forEach((type) => {
      const color = type === 'upstream' ? '#3b82f6' : type === 'downstream' ? '#f97316' : '#6b7280';
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    // Draw links
    g.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => d.sourceNode.x)
      .attr("y1", d => d.sourceNode.y)
      .attr("x2", d => d.targetNode.x)
      .attr("y2", d => d.targetNode.y)
      .attr("stroke", d => d.type === 'upstream' ? '#3b82f6' : d.type === 'downstream' ? '#f97316' : '#6b7280')
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.type === 'uncertain' ? "4,4" : "none")
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", d => `url(#arrow-${d.type})`);

    // Draw nodes
    const nodeGroups = g.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        setSelectedNode(d);
      });

    // Node circles
    nodeGroups.append("circle")
      .attr("r", d => d.isCenter ? 30 : Math.max(12, Math.min(20, 8 + Math.log2(d.power + 1) * 2)))
      .attr("fill", d => d.color)
      .attr("stroke", "rgb(var(--color-surface))")
      .attr("stroke-width", 2)
      .attr("fill-opacity", 0.9);

    // ASN text
    nodeGroups.append("text")
      .attr("y", d => d.isCenter ? -2 : 0)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", d => d.isCenter ? "11px" : "9px")
      .attr("font-weight", "bold")
      .text(d => d.isCenter ? `AS${d.asn}` : `${d.asn}`);

    // Center node name (second line)
    nodeGroups.filter(d => d.isCenter)
      .append("text")
      .attr("y", 12)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "white")
      .attr("font-size", "8px")
      .text(d => {
        const name = d.label || '';
        return name.length > 16 ? name.substring(0, 16) + '...' : name;
      });

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'bgp-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgb(var(--color-surface))')
      .style('color', 'rgb(var(--color-text-primary))')
      .style('border', '1px solid rgb(var(--color-border))')
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    nodeGroups
      .on('mouseover', (_, d) => {
        const typeLabel = d.peerType === 'upstream' ? '上游' : d.peerType === 'downstream' ? '下游' : d.peerType === 'uncertain' ? '不确定' : '目标';
        tooltip
          .style('visibility', 'visible')
          .html(
            `<div><strong>AS${d.asn}</strong></div>` +
            `<div>类型: ${typeLabel}</div>` +
            (d.power > 0 ? `<div>路径数: ${d.power}</div>` : '') +
            (d.v4Peer > 0 ? `<div>IPv4 观测: ${d.v4Peer}</div>` : '') +
            (d.v6Peer > 0 ? `<div>IPv6 观测: ${d.v6Peer}</div>` : '') +
            (d.label ? `<div>层级: ${d.label}</div>` : '')
          );
      })
      .on('mousemove', (event) => {
        tooltip
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    // Apply current transform
    g.attr("transform", transform.toString());

    return () => {
      d3.select('body').selectAll('.bgp-tooltip').remove();
    };
  }, [data, viewType, transform, processData, width, height]);

  // Controls
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current!);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.2
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current!);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.8
    );
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current!);
    svg.transition().duration(500).call(
      d3.zoom<SVGSVGElement, unknown>().transform,
      d3.zoomIdentity
    );
  };

  const handleExport = () => {
    try {
      const svgElement = svgRef.current;
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = width * 2;
      canvas.height = height * 2;
      ctx!.imageSmoothingEnabled = true;
      ctx!.imageSmoothingQuality = 'high';

      img.onload = () => {
        ctx!.drawImage(img, 0, 0, width * 2, height * 2);
        const link = document.createElement('a');
        link.download = `asn-${data.centerAsn}-topology.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
      };

      img.onerror = () => {
        toast.error("图片生成失败", { description: "请稍后重试", duration: 3000 });
      };

      const encodedSvg = btoa(unescape(encodeURIComponent(svgData)));
      img.src = 'data:image/svg+xml;base64,' + encodedSvg;
    } catch {
      toast.error("导出失败", { description: "请稍后重试", duration: 3000 });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full overflow-hidden border border-[rgb(var(--color-border))] rounded-lg bg-[rgb(var(--color-surface))] transition-colors duration-300">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ background: 'rgb(var(--color-surface))' }}
        />

        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {[
            { onClick: handleZoomIn, icon: <ZoomIn className="h-4 w-4" /> },
            { onClick: handleZoomOut, icon: <ZoomOut className="h-4 w-4" /> },
            { onClick: handleReset, icon: <RotateCcw className="h-4 w-4" /> },
            { onClick: handleExport, icon: <Download className="h-4 w-4" /> },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.onClick}
              className="w-10 h-10 bg-[rgb(var(--color-surface))]/90 backdrop-blur-sm border border-[rgb(var(--color-border))] rounded-md hover:bg-[rgb(var(--color-surface-hover))] transition-colors duration-200 flex items-center justify-center"
            >
              {btn.icon}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[rgb(var(--color-surface))]/95 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-[rgb(var(--color-border))] max-w-xs">
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1 text-[rgb(var(--color-text-primary))]">
            <Globe className="h-4 w-4" />
            图例
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-[rgb(var(--color-text-secondary))]">目标 ASN</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-[rgb(var(--color-text-secondary))]">上游 (Upstream)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500"></div>
              <span className="text-[rgb(var(--color-text-secondary))]">下游 (Downstream)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500"></div>
              <span className="text-[rgb(var(--color-text-secondary))]">不确定</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t text-xs text-[rgb(var(--color-text-muted))]">
            节点大小代表路径数量<br/>
            鼠标滚轮缩放，拖拽平移
          </div>
        </div>
      </div>

      {/* Selected node panel */}
      {selectedNode && !selectedNode.isCenter && (
        <div className="mt-4 p-4 bg-[rgb(var(--color-surface-hover))] border border-[rgb(var(--color-border))] rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">
              AS{selectedNode.asn}
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="h-6 w-6 text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-[rgb(var(--color-text-secondary))]">
            <div>类型: {selectedNode.peerType === 'upstream' ? '上游' : selectedNode.peerType === 'downstream' ? '下游' : '不确定'}</div>
            <div>路径数: {selectedNode.power}</div>
            <div>IPv4 观测: {selectedNode.v4Peer}</div>
            <div>IPv6 观测: {selectedNode.v6Peer}</div>
          </div>
        </div>
      )}
    </div>
  );
}
