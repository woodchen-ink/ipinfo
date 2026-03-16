### Build Stage ###
FROM golang:1.24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/ipinfo-server ./cmd/server

### Runtime Stage ###
FROM alpine:3.21
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -g '' appuser

COPY --from=builder /app/ipinfo-server .

RUN mkdir -p /app/data && \
    chown -R appuser:appuser /app

VOLUME ["/app/data"]

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["./ipinfo-server"]
