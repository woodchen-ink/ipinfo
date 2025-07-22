import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config, { isServer }) => {
    // 服务端配置
    if (isServer) {
      // 外部化MMDB相关的库，避免打包问题
      config.externals.push({
        "mmdb-lib": "commonjs mmdb-lib",
      });
    } else {
      // 客户端配置
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
      };
    }

    // 处理.mmdb文件
    config.module.rules.push({
      test: /\.mmdb$/,
      type: "asset/resource",
      generator: {
        filename: "static/data/[name].[hash][ext]",
      },
    });

    return config;
  },

  // 优化大文件处理
  experimental: {
    largePageDataBytes: 128 * 100000, // 128MB，支持大型MMDB文件
  },

  // 静态文件配置
  async headers() {
    return [
      {
        source: "/api/query",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=300", // 缓存5分钟
          },
        ],
      },
    ];
  },

  // 域名配置（支持多域名路由）
  async rewrites() {
    return [
      {
        source: "/:path*",
        destination: "/:path*",
      },
    ];
  },
};

export default nextConfig;

