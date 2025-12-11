# Build stage - Backend
FROM golang:1.22-alpine AS backend-builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go mod files
COPY server/go.mod server/go.sum ./
RUN go mod download

# Copy source code
COPY server/ ./

# Build binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static" -s -w' -o vpanel-server ./cmd/server

# Build stage - Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy package files
COPY web/package*.json ./
RUN npm ci

# Copy source code
COPY web/ ./

# Build frontend
RUN npm run build

# Final stage
FROM alpine:3.19

LABEL maintainer="VPanel Team <team@vpanel.io>"
LABEL description="VPanel - Enterprise Server Management Platform"

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    docker-cli \
    docker-cli-compose \
    nginx \
    openssh-client \
    && rm -rf /var/cache/apk/*

WORKDIR /opt/vpanel

# Create necessary directories
RUN mkdir -p /opt/vpanel/data \
    /opt/vpanel/logs \
    /opt/vpanel/plugins \
    /opt/vpanel/backups \
    /opt/vpanel/web

# Copy backend binary
COPY --from=backend-builder /build/vpanel-server /opt/vpanel/

# Copy frontend assets
COPY --from=frontend-builder /build/dist /opt/vpanel/web/

# Copy default config
COPY deploy/docker/config.yaml /opt/vpanel/config.yaml

# Set permissions
RUN chmod +x /opt/vpanel/vpanel-server

# Environment variables
ENV VPANEL_CONFIG=/opt/vpanel/config.yaml
ENV VPANEL_PORT=8080
ENV VPANEL_MODE=release
ENV TZ=UTC

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start server
CMD ["/opt/vpanel/vpanel-server"]

