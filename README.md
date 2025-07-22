# IPInfo - 专业的IP地理位置查询工具

<div align="center">

![IPInfo Logo](https://img.shields.io/badge/IPInfo-专业IP查询-blue?style=for-the-badge)

一个基于 Next.js 构建的现代化IP地理位置查询应用，提供精确的IP地址信息、地理位置、BGP路由信息和网络拓扑分析。

[![Next.js](https://img.shields.io/badge/Next.js-15.4.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

</div>

## ✨ 功能特性

### 🌍 IP地理位置查询
- **精确定位**: 基于MaxMind GeoIP2数据库，提供城市级别的精确定位
- **多数据源融合**: 整合多个地理位置数据源，提高查询准确性
- **IPv4/IPv6支持**: 完整支持IPv4和IPv6地址查询
- **私有网络识别**: 自动识别并处理私有IP地址

### 🗺️ 交互式地图
- **实时地图显示**: 基于Leaflet的交互式地图展示IP位置
- **多图层支持**: 支持多种地图图层切换
- **响应式设计**: 适配各种屏幕尺寸的地图显示
- **位置标记**: 精确的地理位置标记和信息展示

### 🌐 BGP网络分析
- **ASN信息查询**: 详细的自治系统号码信息
- **BGP对等体分析**: 查看BGP邻居和路由信息
- **网络拓扑图**: 可视化网络连接关系
- **ISP信息**: 详细的互联网服务提供商信息

### 🎨 现代化界面
- **深色/浅色主题**: 支持主题切换，适应不同使用环境
- **流畅动画**: 基于Framer Motion的精美动画效果
- **响应式布局**: 完美适配桌面端和移动端
- **直观操作**: 简洁明了的用户界面设计

### ⚡ 性能优化
- **智能缓存**: 多层缓存机制，提升查询速度
- **数据预加载**: 常用IP数据预加载和热点数据缓存
- **懒加载**: 组件和地图的按需加载
- **CDN优化**: 静态资源CDN加速

## 🚀 快速开始

### 环境要求

- Node.js 20.x 或更高版本
- pnpm 包管理器
- Docker (可选，用于容器化部署)

### 本地开发

1. **克隆项目**
```bash
git clone <repository-url>
cd ipinfo
```

2. **安装依赖**
```bash
pnpm install
```

3. **启动开发服务器**
```bash
pnpm dev
```

4. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 🐳 Docker部署

### 使用Docker Compose (推荐)

1. **启动服务**
```bash
docker-compose up -d
```

2. **查看日志**
```bash
docker-compose logs -f
```

3. **停止服务**
```bash
docker-compose down
```

### 手动Docker构建

```bash
# 构建镜像
docker build -t ipinfo .

# 运行容器
docker run -d \
  --name ipinfo \
  -p 3000:3000 \
  -v ./data:/app/lib/data \
  ipinfo
```

## 📁 项目结构

```
ipinfo/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   │   ├── query/         # IP查询API
│   │   ├── bgp/           # BGP信息API
│   │   ├── meituan/       # 美团API代理
│   │   └── proxy-detection/ # 代理检测API
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局组件
│   └── page.tsx           # 首页组件
├── components/            # React组件
│   ├── ui/               # 基础UI组件
│   ├── ip-info-card.tsx  # IP信息卡片
│   ├── ip-query-form.tsx # IP查询表单
│   ├── ip-location-map.tsx # 地图组件
│   ├── bgp-network-chart.tsx # BGP网络图表
│   └── theme-toggle.tsx  # 主题切换
├── lib/                  # 核心库文件
│   ├── geoip/           # GeoIP服务
│   │   ├── reader.ts    # 数据库读取器
│   │   ├── cache.ts     # 缓存管理
│   │   ├── merger.ts    # 数据合并
│   │   └── index.ts     # 服务入口
│   ├── data/            # 数据文件
│   │   ├── GeoLite2-City.mmdb
│   │   ├── GeoLite2-ASN.mmdb
│   │   └── GeoCN.mmdb
│   ├── store.ts         # 状态管理
│   ├── ip-detection.ts  # IP检测工具
│   └── utils.ts         # 工具函数
├── public/              # 静态资源
├── Dockerfile           # Docker配置
├── docker-compose.yml   # Docker Compose配置
└── package.json         # 项目配置
```

## 🔧 配置说明

### 环境变量

创建 `.env.local` 文件配置环境变量：

```env
# 应用配置
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 缓存配置
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# API配置
API_RATE_LIMIT=100
API_TIMEOUT=5000
```

### 数据库文件

项目使用MaxMind GeoIP2数据库文件：

- `GeoLite2-City.mmdb`: 城市级地理位置数据
- `GeoLite2-ASN.mmdb`: ASN和ISP信息数据
- `GeoCN.mmdb`: 中国地区增强数据

数据库文件存放在 `lib/data/` 目录中，支持自动下载和更新。

## 🛠️ 技术栈

### 前端技术
- **Next.js 15.4.2**: React全栈框架
- **React 19.1.0**: 用户界面库
- **TypeScript 5.x**: 类型安全的JavaScript
- **Tailwind CSS 4.x**: 原子化CSS框架
- **Framer Motion**: 动画库
- **Zustand**: 轻量级状态管理

### 地图和可视化
- **Leaflet**: 开源地图库
- **React Leaflet**: React Leaflet组件
- **D3.js**: 数据可视化库
- **Lucide React**: 图标库

### 后端和数据
- **MaxMind GeoIP2**: IP地理位置数据库
- **mmdb-lib**: MMDB数据库读取库
- **Node Cache**: 内存缓存
- **BGP API**: BGP路由信息查询

### 开发工具
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Docker**: 容器化部署
- **pnpm**: 包管理器

## 📊 API接口

### IP查询接口

#### GET /api/query
获取客户端IP信息

**响应示例:**
```json
{
  "ip": "8.8.8.8",
  "country": "美国",
  "countryCode": "US",
  "city": "芒廷维尤",
  "location": {
    "latitude": 37.4056,
    "longitude": -122.0775,
    "accuracy_radius": 1000
  },
  "isp": "Google LLC",
  "asn": 15169,
  "timezone": "America/Los_Angeles",
  "ipVersion": "IPv4"
}
```

#### POST /api/query
查询指定IP信息

**请求体:**
```json
{
  "ip": "8.8.8.8"
}
```

### BGP信息接口

#### GET /api/bgp/[asn]
获取指定ASN的BGP信息

**响应示例:**
```json
{
  "asn": 15169,
  "name": "Google LLC",
  "country": "US",
  "peers": [...],
  "prefixes": [...]
}
```

## 🔍 使用说明

### 基本查询
1. 打开应用首页
2. 在搜索框中输入IP地址（留空则查询当前IP）
3. 点击查询按钮或按回车键
4. 查看详细的IP信息和地图位置

### 高级功能
- **BGP分析**: 点击ASN信息查看BGP对等体和路由信息
- **网络拓扑**: 查看IP所属网络的拓扑结构
- **历史查询**: 查看最近的查询历史
- **数据导出**: 导出查询结果为JSON格式

### 主题切换
点击右上角的主题切换按钮，在深色和浅色主题间切换。

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范
- 使用TypeScript编写代码
- 遵循ESLint和Prettier配置
- 编写单元测试
- 更新相关文档

## 📝 更新日志

### v0.1.0 (2024-12-XX)
- 🎉 初始版本发布
- ✨ 基础IP查询功能
- 🗺️ 交互式地图展示
- 🌐 BGP网络分析
- 🎨 现代化UI设计
- 🐳 Docker容器化支持

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [MaxMind](https://www.maxmind.com/) - 提供GeoIP2数据库
- [Next.js](https://nextjs.org/) - 优秀的React框架
- [Leaflet](https://leafletjs.com/) - 开源地图库
- [Tailwind CSS](https://tailwindcss.com/) - 实用的CSS框架

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](../../issues)
- 发起 [Discussion](../../discussions)

---

<div align="center">

**[⬆ 回到顶部](#ipinfo---专业的ip地理位置查询工具)**

Made with ❤️ by IPInfo Team

</div>