# 极简IP查询工具

一个基于Next.js 14的现代化IP地址查询工具，支持IPv4/IPv6双栈，提供精确的地理位置和网络信息查询。

## ✨ 核心特性

- 🎯 **高精度定位** - 结合MaxMind和GeoCN数据库，提供最准确的位置信息
- ⚡ **极速响应** - 优化的查询算法，响应时间控制在100毫秒以内  
- 🔄 **双栈支持** - 完整支持IPv4和IPv6地址查询与自动检测
- 🌐 **多域名架构** - 支持ip.domain.com、ip4.domain.com、ip6.domain.com
- 🎨 **极简设计** - 基于功能性极简主义的优雅界面
- 📱 **响应式** - 完美适配桌面端和移动端设备

## 🚀 技术栈

- **前端框架**: Next.js 14 (App Router)
- **状态管理**: Zustand
- **样式系统**: Tailwind CSS v4
- **动画引擎**: Framer Motion
- **数据源**: MaxMind GeoLite2 + GeoCN
- **字体**: Inter + JetBrains Mono
- **类型安全**: TypeScript

## 📦 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

项目将在 http://localhost:3000 启动

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 🏗️ 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/query/         # IP查询API
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页面
├── components/            # React组件
│   ├── ip-query-form.tsx  # 查询表单
│   ├── ip-info-card.tsx   # 信息展示卡片
│   └── version-switcher.tsx # 版本切换器
├── lib/                   # 工具库
│   ├── store.ts           # Zustand状态管理
│   ├── ip-detection.ts    # IP检测工具
│   └── utils.ts           # 通用工具函数
├── middleware.ts          # Next.js中间件
└── public/               # 静态资源
```

## 🎨 设计系统

### 颜色方案
- **主色调**: 蓝色 (#3B82F6) - IPv4标识
- **次色调**: 紫色 (#9333EA) - IPv6标识  
- **成功色**: 绿色 (#22C55E) - 查询成功
- **警告色**: 琥珀色 (#F59E0B) - 注意提示
- **错误色**: 红色 (#EF4444) - 错误状态

### 字体系统
- **无衬线**: Inter - 用于界面文本
- **等宽字体**: JetBrains Mono - 用于IP地址显示

### 间距系统
基于16px基础单位的黄金比例间距系统

## 🔧 功能特性

### 已实现功能 ✅

1. **核心查询功能**
   - IPv4/IPv6地址查询
   - 自动客户端IP检测
   - 实时输入验证

2. **用户界面**
   - 极简查询表单
   - 详细信息展示卡片
   - 版本切换器
   - 响应式设计

3. **状态管理**
   - Zustand状态管理
   - 查询历史记录
   - 错误处理

4. **路由与中间件**
   - 多域名支持
   - 版本强制切换
   - 安全头设置

5. **动画与交互**
   - Framer Motion动画
   - 微交互设计
   - 加载状态

### 待实现功能 📋

1. **数据库集成**
   - MaxMind GeoLite2数据库
   - GeoCN高精度中国数据库
   - 离线查询能力

2. **地图组件**
   - OpenStreetMap集成
   - 位置标记显示
   - 交互式地图

3. **高级功能**
   - 批量IP查询
   - 查询结果导出
   - API密钥管理

4. **性能优化**
   - 查询缓存系统
   - CDN优化
   - 服务端渲染

## 🔮 多域名架构

支持通过不同子域名强制指定IP版本：

- `ip.domain.com` - 自动检测最佳版本
- `ip4.domain.com` - 强制使用IPv4查询
- `ip6.domain.com` - 强制使用IPv6查询

## 📱 API 接口

### 查询IP信息

```http
POST /api/query
Content-Type: application/json

{
  "ip": "8.8.8.8"  // 可选，不提供则查询客户端IP
}
```

### 响应格式

```json
{
  "ip": "8.8.8.8",
  "country": "美国",
  "countryCode": "US",
  "city": "Mountain View",
  "location": {
    "latitude": 37.4056,
    "longitude": -122.0775,
    "accuracy_radius": 50
  },
  "isp": "Google LLC",
  "ipVersion": "IPv4",
  "source": "MaxMind"
}
```

## 🎯 设计理念

基于**功能性极简主义**的设计哲学：

1. **数据优先** - 让IP信息成为视觉焦点
2. **渐进式披露** - 从核心信息开始逐步展示详情
3. **精致个人感** - 手工打磨的精细用户体验
4. **响应式优雅** - 在所有设备上保持一致美学

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目！

---

**注意**: 当前版本使用模拟数据进行演示，实际部署时需要集成真实的IP地理位置数据库。

## 🐳 Docker 部署与自动化构建

### 一键构建与推送（GitHub Actions）

本项目已集成 GitHub Actions 自动构建与推送 Docker 镜像到 GitHub Container Registry（ghcr.io）。

- 推送到 master 分支将自动触发构建与推送。
- 镜像地址格式：`ghcr.io/<your-namespace>/<repo>:latest`
- 需在仓库 Settings → Secrets 配置 `GHCR_TOKEN`（拥有写入 ghcr.io 权限的 Personal Access Token）。

### 手动本地构建与运行

```bash
# 构建镜像
pnpm build
# 或直接用 Docker 多阶段构建

docker build -t ipinfo:latest .

# 运行容器
# 如需挂载自定义 MMDB 数据库，可用 -v 参数

docker run -d -p 3000:3000 --name ipinfo \
  -e NODE_ENV=production \
  ipinfo:latest
```

### 生产部署注意事项
- 镜像基于 Next.js Standalone 模式，体积极小，仅包含必要依赖。
- 支持 SSR/API 路由，兼容 MMDB 数据库文件。
- 如需图片优化，建议在 Dockerfile 中安装 sharp。
- 运行时可通过环境变量注入数据库、API 密钥等配置。
- 默认监听 3000 端口。

### 目录说明
- `.next/standalone`：Next.js 生产运行时主目录
- `.next/static`：静态资源
- `public/`：公开静态文件
- `lib/data/`：地理库数据（如 MMDB 文件）
