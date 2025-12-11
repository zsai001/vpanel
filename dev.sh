#!/bin/bash

# VPanel 本地开发脚本
# 用法: ./dev.sh [命令]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 版本信息
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME=$(date -u '+%Y-%m-%d_%H:%M:%S')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

LDFLAGS="-s -w -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 构建 server
build_server() {
    log_info "Building server..."
    cd panel && CGO_ENABLED=1 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server ./cmd/server
    cd ..
    log_success "Server built: bin/vpanel-server"
}

# 构建 web 前端
build_web() {
    log_info "Building web frontend..."
    cd web && npm install && npm run build
    cd ..
    log_success "Web frontend built: web/dist/"
}

# 构建所有组件
build_all() {
    build_server
    build_web
}

# 开发模式 - 启动 server
dev_server() {
    log_info "Starting server in development mode..."
    cd panel && go run ./cmd/server
}

# 开发模式 - 启动 web
dev_web() {
    log_info "Starting web frontend in development mode..."
    cd web && npm run dev
}

# 开发模式 - 同时启动 server 和 web
dev() {
    log_info "Starting development servers..."
    # 启动 server 在后台
    (cd panel && go run ./cmd/server) &
    SERVER_PID=$!
    
    # 启动 web
    (cd web && npm run dev) &
    WEB_PID=$!
    
    # 捕获 SIGINT/SIGTERM 信号，清理子进程
    trap "kill $SERVER_PID $WEB_PID 2>/dev/null; exit" SIGINT SIGTERM
    
    wait
}

# 构建 docs (官网)
build_docs() {
    log_info "Building docs..."
    cd docs && npm install && npm run build
    cd ..
    log_success "Docs built: docs/.vitepress/dist/"
}

# 开发模式 - docs
dev_docs() {
    log_info "Starting docs in development mode..."
    cd docs && npm run dev
}

# 运行测试
test() {
    log_info "Running tests..."
    cd panel && go test -v ./...
    cd ..
    log_success "Tests completed"
}

# 测试覆盖率
test_coverage() {
    log_info "Running tests with coverage..."
    cd panel && go test -coverprofile=coverage.out ./...
    cd panel && go tool cover -html=coverage.out -o coverage.html
    cd ..
    log_success "Coverage report: panel/coverage.html"
}

# 代码检查
lint() {
    log_info "Linting Go code..."
    cd panel && golangci-lint run
    cd ..
    log_info "Linting TypeScript..."
    cd web && npm run lint
    cd ..
    log_success "Linting completed"
}

# 清理构建产物
clean() {
    log_info "Cleaning build artifacts..."
    rm -rf bin/
    rm -rf web/dist/
    rm -rf docs/.vitepress/dist/
    rm -rf docs/.vitepress/cache/
    rm -rf panel/coverage.*
    log_success "Cleaned"
}

# 安装依赖
deps() {
    log_info "Installing dependencies..."
    cd panel && go mod download
    cd ..
    cd web && npm install
    cd ..
    cd docs && npm install
    cd ..
    log_success "Dependencies installed"
}

# 代码生成
generate() {
    log_info "Generating code..."
    cd panel && go generate ./...
    cd ..
    log_success "Code generation completed"
}

# Docker 相关
docker_build() {
    log_info "Building Docker image..."
    docker build -t vpanel/vpanel:${VERSION} -f deploy/docker/Dockerfile .
    docker tag vpanel/vpanel:${VERSION} vpanel/vpanel:latest
    log_success "Docker image built: vpanel/vpanel:${VERSION}"
}

docker_run() {
    log_info "Starting with Docker Compose..."
    docker-compose -f deploy/docker/docker-compose.yml up -d
    log_success "Docker containers started"
}

docker_stop() {
    log_info "Stopping Docker containers..."
    docker-compose -f deploy/docker/docker-compose.yml down
    log_success "Docker containers stopped"
}

# 跨平台构建
build_linux() {
    log_info "Building for Linux..."
    cd panel && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-linux-amd64 ./cmd/server
    cd ..
    log_success "Linux build completed"
}

build_darwin() {
    log_info "Building for macOS..."
    cd panel && GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-darwin-amd64 ./cmd/server
    cd panel && GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-darwin-arm64 ./cmd/server
    cd ..
    log_success "macOS build completed"
}

build_windows() {
    log_info "Building for Windows..."
    cd panel && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-windows-amd64.exe ./cmd/server
    cd ..
    log_success "Windows build completed"
}

build_platforms() {
    build_linux
    build_darwin
    build_windows
}

# 帮助信息
show_help() {
    echo "VPanel 本地开发脚本"
    echo ""
    echo "用法: ./dev.sh [命令]"
    echo ""
    echo "开发命令:"
    echo "  dev           同时启动 server 和 web 开发服务器"
    echo "  dev:server    启动 server 开发服务器"
    echo "  dev:web       启动 web 开发服务器"
    echo "  dev:docs      启动文档开发服务器"
    echo ""
    echo "构建命令:"
    echo "  build         构建所有组件"
    echo "  build:server  仅构建 server"
    echo "  build:web     仅构建 web 前端"
    echo "  build:docs    构建文档站点"
    echo "  build:all     构建所有平台版本"
    echo ""
    echo "测试命令:"
    echo "  test          运行测试"
    echo "  test:cov      运行测试并生成覆盖率报告"
    echo "  lint          运行代码检查"
    echo ""
    echo "Docker 命令:"
    echo "  docker:build  构建 Docker 镜像"
    echo "  docker:run    使用 Docker Compose 启动"
    echo "  docker:stop   停止 Docker 容器"
    echo ""
    echo "其他命令:"
    echo "  deps          安装依赖"
    echo "  generate      运行代码生成"
    echo "  clean         清理构建产物"
    echo "  help          显示此帮助信息"
}

# 主入口
case "${1:-help}" in
    dev)
        dev
        ;;
    dev:server)
        dev_server
        ;;
    dev:web)
        dev_web
        ;;
    dev:docs)
        dev_docs
        ;;
    build)
        build_all
        ;;
    build:server)
        build_server
        ;;
    build:web)
        build_web
        ;;
    build:docs)
        build_docs
        ;;
    build:all)
        build_platforms
        ;;
    build:linux)
        build_linux
        ;;
    build:darwin)
        build_darwin
        ;;
    build:windows)
        build_windows
        ;;
    test)
        test
        ;;
    test:cov)
        test_coverage
        ;;
    lint)
        lint
        ;;
    docker:build)
        docker_build
        ;;
    docker:run)
        docker_run
        ;;
    docker:stop)
        docker_stop
        ;;
    deps)
        deps
        ;;
    generate)
        generate
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
