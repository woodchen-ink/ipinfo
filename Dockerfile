### Stage 1: Build Go backend ###
FROM golang:1.24-alpine AS server-builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/ipinfo-server ./cmd/server

### Stage 2: Build Next.js frontend (SSG) ###
FROM node:22-alpine AS web-builder
WORKDIR /app

COPY web/package.json web/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY web/ .

# API requests go to same origin, nginx will proxy /api to backend
ENV NEXT_PUBLIC_API_URL=""

RUN pnpm build

### Stage 3: Runtime - nginx + Go binary ###
FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata nginx && \
    adduser -D -g '' appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app

# Copy Go binary
COPY --from=server-builder /app/ipinfo-server .

# Copy frontend static files
COPY --from=web-builder /app/out /usr/share/nginx/html

# Copy nginx config and startup script
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

VOLUME ["/app/data"]

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["/app/start.sh"]
