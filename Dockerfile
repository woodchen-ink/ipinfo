# --- 构建阶段 ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- 运行阶段 ---
FROM node:20-alpine AS runner
WORKDIR /app
# 可选：如有图片优化需求，安装 sharp
# RUN apk add --no-cache --virtual .gyp python3 make g++ && pnpm add sharp && apk del .gyp
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 可选：复制 MMDB 数据文件（如有）
COPY --from=builder /app/lib/data ./lib/data
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"] 