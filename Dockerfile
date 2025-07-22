# ---- 构建阶段 ----
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # 只拷贝依赖文件，安装依赖
    COPY package.json pnpm-lock.yaml ./
    RUN npm install -g pnpm && pnpm install --frozen-lockfile
    
    # 拷贝全部源码（含 public、lib、.next.config.js/ts 等）
    COPY . .
    
    # 构建 nextjs 产物
    RUN pnpm build
    
    # 调试用（可选，排查产物问题时加）
    RUN echo "=== .next/ ===" && ls -lh /app/.next || true
    RUN echo "=== .next/standalone/ ===" && ls -lh /app/.next/standalone || true
    RUN echo "=== public/ ===" && ls -lh /app/public || true
    RUN echo "=== lib/data/ ===" && ls -lh /app/lib/data || true
    
    # ---- 运行阶段 ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    
    # 拷贝 standalone 产物和静态文件
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/lib/data ./lib/data
    
    EXPOSE 3000
    ENV NODE_ENV=production
    
    CMD ["node", "server.js"]
    