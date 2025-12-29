#!/bin/bash

# VPanel 本地开发脚本 (Plugin Architecture)
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
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

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

# 打印构建信息（分支和commit）
print_build_info() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  编译分支: ${GREEN}${GIT_BRANCH}${NC}"
    echo -e "${BLUE}  Commit:   ${GREEN}${GIT_COMMIT}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# 构建 server (from core with plugins)
build_server() {
    log_info "Building server (plugin architecture)..."
    mkdir -p bin
    cd core && CGO_ENABLED=1 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server ./cmd/server
    cd ..
    log_success "Server built: bin/vpanel-server"
    print_build_info
}

# 构建 web 前端
build_web() {
    log_info "Building web frontend..."
    
    # 设置构建时的环境变量
    export VITE_APP_VERSION="${VERSION}"
    export VITE_GIT_COMMIT="${GIT_COMMIT}"
    export VITE_GIT_BRANCH="${GIT_BRANCH}"
    export VITE_BUILD_TIME="${BUILD_TIME}"
    
    cd web && npm install && npm run build
    cd ..
    log_success "Web frontend built: web/dist/"
    print_build_info
}

# 构建所有组件
build_all() {
    build_server
    build_web
    print_build_info
}

# 清理端口占用
cleanup_port() {
    local port=$1
    if [ -z "$port" ]; then
        port=8080
    fi
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        log_info "Killing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
    fi
}

# 开发模式 - 启动 server
dev_server() {
    cleanup_port 8080
    log_info "Starting server in development mode (plugin architecture)..."
    cd core && VPANEL_CONFIG=../config.yaml go run ./cmd/server
}

# 开发模式 - 启动 web
dev_web() {
    cleanup_port 3000
    log_info "Starting web frontend in development mode..."
    cd web && npm run dev
}

# 开发模式 - 同时启动 server 和 web
dev() {
    cleanup_port 8080
    cleanup_port 3000
    log_info "Starting development servers..."
    # 启动 server 在后台
    (cd core && VPANEL_CONFIG=../config.yaml go run ./cmd/server) &
    SERVER_PID=$!
    
    # 启动 web
    (cd web && npm run dev) &
    WEB_PID=$!
    
    # 捕获 SIGINT/SIGTERM 信号，清理子进程
    trap "kill $SERVER_PID $WEB_PID 2>/dev/null; cleanup_port 8080; cleanup_port 3000; exit" SIGINT SIGTERM
    
    wait
}

# 构建 docs (官网)
build_docs() {
    log_info "Building docs..."
    cd docs && npm install && npm run build
    cd ..
    log_success "Docs built: docs/.vitepress/dist/"
    print_build_info
}

# 开发模式 - docs
dev_docs() {
    log_info "Starting docs in development mode..."
    cd docs && npm run dev
}

# 运行后端测试
test_server() {
    log_info "Running server tests..."
    cd core && go test -v ./...
    cd ..
    cd plugins && go test -v ./...
    cd ..
    log_success "Server tests completed"
}

# 运行前端测试
test_web() {
    log_info "Running web tests..."
    cd web && npm run test
    cd ..
    log_success "Web tests completed"
}

# 运行所有测试
test() {
    test_server
    test_web
    log_success "All tests completed"
}

# 测试覆盖率
test_coverage() {
    log_info "Running tests with coverage..."
    cd core && go test -coverprofile=coverage.out ./...
    cd core && go tool cover -html=coverage.out -o coverage.html
    cd ..
    cd plugins && go test -coverprofile=coverage.out ./...
    cd plugins && go tool cover -html=coverage.out -o coverage.html
    cd ..
    cd web && npm run test:cov
    cd ..
    log_success "Coverage reports generated"
}

# 代码检查
lint() {
    log_info "Linting Go code..."
    cd core && golangci-lint run
    cd ..
    cd plugins && golangci-lint run
    cd ..
    log_info "Linting TypeScript..."
    cd web && npm run lint
    cd ..
    log_info "Type checking TypeScript..."
    cd web && npm run typecheck
    cd ..
    log_success "Linting completed"
}

# 类型检查
typecheck() {
    log_info "Type checking TypeScript..."
    cd web && npm run typecheck
    cd ..
    log_success "Type check completed"
}

# 清理构建产物
clean() {
    log_info "Cleaning build artifacts..."
    rm -rf bin/
    rm -rf web/dist/
    rm -rf docs/.vitepress/dist/
    rm -rf docs/.vitepress/cache/
    rm -rf core/coverage.*
    rm -rf plugins/coverage.*
    log_success "Cleaned"
}

# 安装依赖
deps() {
    log_info "Installing dependencies..."
    cd sdk/go && go mod download
    cd ../..
    cd plugins && go mod download
    cd ..
    cd core && go mod download
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
    cd core && go generate ./...
    cd ..
    cd plugins && go generate ./...
    cd ..
    log_success "Code generation completed"
}

# 跨平台构建 (Pure Go, no CGO required)
build_linux() {
    log_info "Building for Linux..."
    mkdir -p bin
    cd core && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-linux-amd64 ./cmd/server
    cd ..
    log_success "Linux build completed"
    print_build_info
}

build_darwin() {
    log_info "Building for macOS..."
    mkdir -p bin
    cd core && GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-darwin-amd64 ./cmd/server
    cd core && GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-darwin-arm64 ./cmd/server
    cd ..
    log_success "macOS build completed"
    print_build_info
}

build_windows() {
    log_info "Building for Windows..."
    mkdir -p bin
    cd core && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags "${LDFLAGS}" -o ../bin/vpanel-server-windows-amd64.exe ./cmd/server
    cd ..
    log_success "Windows build completed"
    print_build_info
}

build_platforms() {
    build_linux
    build_darwin
    build_windows
    print_build_info
}

# 帮助信息
show_help() {
    echo "VPanel 本地开发脚本 (Plugin Architecture)"
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
    echo "  test          运行所有测试"
    echo "  test:server   仅运行后端测试"
    echo "  test:web      仅运行前端测试"
    echo "  test:cov      运行测试并生成覆盖率报告"
    echo "  lint          运行代码检查（包含类型检查）"
    echo "  typecheck     仅运行 TypeScript 类型检查"
    echo ""
    echo "其他命令:"
    echo "  deps          安装依赖"
    echo "  generate      运行代码生成"
    echo "  clean         清理构建产物"
    echo "  help          显示此帮助信息"
    echo ""
    echo "架构说明:"
    echo "  core/         核心模块 (auth, plugin manager)"
    echo "  plugins/      所有插件 (monitor, docker, nginx, etc.)"
    echo "  sdk/go/       Go SDK for plugins"
    echo "  web/          前端应用"
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
    test:server)
        test_server
        ;;
    test:web)
        test_web
        ;;
    test:cov)
        test_coverage
        ;;
    lint)
        lint
        ;;
    typecheck)
        typecheck
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
