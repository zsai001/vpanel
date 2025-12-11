#!/bin/bash
set -e

# VPanel Installation Script
# Usage: curl -sSL https://vpanel.zsoft.cc/install.sh | bash

VERSION="${VPANEL_VERSION:-latest}"
INSTALL_DIR="${VPANEL_INSTALL_DIR:-/opt/vpanel}"
DATA_DIR="${VPANEL_DATA_DIR:-/opt/vpanel/data}"
PORT="${VPANEL_PORT:-8080}"
GITHUB_REPO="zsoft-vpanel/vpanel"
BASE_URL="https://vpanel.zsoft.cc"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║   ██╗   ██╗██████╗  █████╗ ███╗   ██╗███████╗██╗         ║"
    echo "║   ██║   ██║██╔══██╗██╔══██╗████╗  ██║██╔════╝██║         ║"
    echo "║   ██║   ██║██████╔╝███████║██╔██╗ ██║█████╗  ██║         ║"
    echo "║   ╚██╗ ██╔╝██╔═══╝ ██╔══██║██║╚██╗██║██╔══╝  ██║         ║"
    echo "║    ╚████╔╝ ██║     ██║  ██║██║ ╚████║███████╗███████╗    ║"
    echo "║     ╚═══╝  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝    ║"
    echo "║                                                           ║"
    echo "║           智能服务器运维管理平台                          ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行"
        log_info "请使用: sudo bash install.sh"
        exit 1
    fi
}

check_system() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "无法检测操作系统"
        exit 1
    fi

    source /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID

    log_info "检测到系统: $PRETTY_NAME"

    case $OS in
        ubuntu|debian|centos|rocky|almalinux|fedora)
            ;;
        *)
            log_warn "未经测试的系统: $OS，可能会遇到问题"
            ;;
    esac
}

get_arch() {
    ARCH=$(uname -m)
    case $ARCH in
        x86_64|amd64)
            ARCH="amd64"
            ;;
        aarch64|arm64)
            ARCH="arm64"
            ;;
        *)
            log_error "不支持的架构: $ARCH"
            exit 1
            ;;
    esac
    log_info "检测到架构: $ARCH"
}

get_latest_version() {
    if [[ "$VERSION" == "latest" ]]; then
        log_info "获取最新版本..."
        VERSION=$(curl -sSL "https://api.github.com/repos/${GITHUB_REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
        if [[ -z "$VERSION" ]]; then
            log_error "无法获取最新版本"
            exit 1
        fi
    fi
    log_info "安装版本: $VERSION"
}

download_and_extract() {
    local DOWNLOAD_URL="https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/vpanel-${VERSION}-linux-${ARCH}.tar.gz"
    local TMP_DIR=$(mktemp -d)
    local TMP_FILE="${TMP_DIR}/vpanel.tar.gz"

    log_info "下载 VPanel..."
    log_info "下载地址: $DOWNLOAD_URL"

    if command -v wget &> /dev/null; then
        wget -q --show-progress -O "$TMP_FILE" "$DOWNLOAD_URL" || {
            log_error "下载失败"
            exit 1
        }
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$TMP_FILE" "$DOWNLOAD_URL" || {
            log_error "下载失败"
            exit 1
        }
    else
        log_error "需要 wget 或 curl"
        exit 1
    fi

    log_info "解压文件..."
    tar -xzf "$TMP_FILE" -C "$TMP_DIR"

    # Create directories
    mkdir -p "$INSTALL_DIR" "$DATA_DIR"

    # Copy files
    cp -r "$TMP_DIR"/vpanel-*/. "$INSTALL_DIR/"
    chmod +x "$INSTALL_DIR/vpanel-server"
    chmod +x "$INSTALL_DIR/vpanel-agent" 2>/dev/null || true

    # Cleanup
    rm -rf "$TMP_DIR"

    log_info "文件已安装到: $INSTALL_DIR"
}

create_config() {
    local CONFIG_FILE="$INSTALL_DIR/config.yaml"
    
    if [[ -f "$CONFIG_FILE" ]]; then
        log_warn "配置文件已存在，跳过创建"
        return
    fi

    log_info "创建配置文件..."
    
    # Generate random secret key
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | sha256sum | cut -d' ' -f1)

    cat > "$CONFIG_FILE" << EOF
# VPanel Configuration
server:
  host: 0.0.0.0
  port: ${PORT}

database:
  driver: sqlite
  dsn: ${DATA_DIR}/vpanel.db

log:
  level: info
  format: json
  output: ${DATA_DIR}/logs/vpanel.log

security:
  secret_key: ${SECRET_KEY}
  jwt_expire: 24h

features:
  docker: true
  nginx: true
  database: true
  terminal: true
  file_manager: true
EOF

    chmod 600 "$CONFIG_FILE"
    log_info "配置文件已创建: $CONFIG_FILE"
}

create_systemd_service() {
    log_info "创建 systemd 服务..."

    cat > /etc/systemd/system/vpanel.service << EOF
[Unit]
Description=VPanel Server
Documentation=https://vpanel.zsoft.cc
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${INSTALL_DIR}/vpanel-server -c ${INSTALL_DIR}/config.yaml
Restart=on-failure
RestartSec=5
LimitNOFILE=65535

# Security
NoNewPrivileges=false
ProtectSystem=false

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    log_info "systemd 服务已创建"
}

start_service() {
    log_info "启动 VPanel 服务..."
    systemctl enable vpanel
    systemctl start vpanel

    sleep 2

    if systemctl is-active --quiet vpanel; then
        log_info "VPanel 服务已启动"
    else
        log_error "VPanel 服务启动失败"
        log_info "查看日志: journalctl -u vpanel -f"
        exit 1
    fi
}

configure_firewall() {
    log_info "配置防火墙..."

    if command -v ufw &> /dev/null; then
        ufw allow ${PORT}/tcp 2>/dev/null || true
        log_info "已开放端口 ${PORT} (ufw)"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port=${PORT}/tcp 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        log_info "已开放端口 ${PORT} (firewalld)"
    else
        log_warn "未检测到防火墙，请手动开放端口 ${PORT}"
    fi
}

print_success() {
    local IP=$(curl -sSL https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    安装完成！                             ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  访问地址: ${BLUE}http://${IP}:${PORT}${NC}"
    echo ""
    echo -e "  默认账号: ${YELLOW}admin${NC}"
    echo -e "  默认密码: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "  ${RED}请立即登录并修改默认密码！${NC}"
    echo ""
    echo -e "  常用命令:"
    echo -e "    启动服务: ${BLUE}systemctl start vpanel${NC}"
    echo -e "    停止服务: ${BLUE}systemctl stop vpanel${NC}"
    echo -e "    重启服务: ${BLUE}systemctl restart vpanel${NC}"
    echo -e "    查看状态: ${BLUE}systemctl status vpanel${NC}"
    echo -e "    查看日志: ${BLUE}journalctl -u vpanel -f${NC}"
    echo ""
    echo -e "  安装目录: ${INSTALL_DIR}"
    echo -e "  数据目录: ${DATA_DIR}"
    echo -e "  配置文件: ${INSTALL_DIR}/config.yaml"
    echo ""
    echo -e "  官网文档: ${BLUE}https://vpanel.zsoft.cc${NC}"
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
}

do_upgrade() {
    log_info "升级 VPanel..."
    
    if [[ ! -d "$INSTALL_DIR" ]]; then
        log_error "VPanel 未安装，请先安装"
        exit 1
    fi

    systemctl stop vpanel 2>/dev/null || true

    download_and_extract

    systemctl start vpanel

    log_info "升级完成！"
}

do_uninstall() {
    log_warn "即将卸载 VPanel..."
    read -p "确认卸载？数据将保留在 ${DATA_DIR} [y/N]: " confirm
    
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        log_info "已取消卸载"
        exit 0
    fi

    log_info "停止服务..."
    systemctl stop vpanel 2>/dev/null || true
    systemctl disable vpanel 2>/dev/null || true
    rm -f /etc/systemd/system/vpanel.service
    systemctl daemon-reload

    log_info "删除程序文件..."
    rm -rf "$INSTALL_DIR/vpanel-server"
    rm -rf "$INSTALL_DIR/vpanel-agent"
    rm -rf "$INSTALL_DIR/web"

    log_info "卸载完成！"
    log_info "数据目录已保留: ${DATA_DIR}"
    log_info "如需完全删除，请手动执行: rm -rf ${INSTALL_DIR}"
}

show_help() {
    echo "VPanel 安装脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --install     安装 VPanel (默认)"
    echo "  --upgrade     升级 VPanel"
    echo "  --uninstall   卸载 VPanel"
    echo "  --help        显示帮助"
    echo ""
    echo "环境变量:"
    echo "  VPANEL_VERSION      指定版本 (默认: latest)"
    echo "  VPANEL_INSTALL_DIR  安装目录 (默认: /opt/vpanel)"
    echo "  VPANEL_DATA_DIR     数据目录 (默认: /opt/vpanel/data)"
    echo "  VPANEL_PORT         服务端口 (默认: 8080)"
    echo ""
    echo "示例:"
    echo "  # 安装最新版本"
    echo "  curl -sSL https://vpanel.zsoft.cc/install.sh | bash"
    echo ""
    echo "  # 安装指定版本"
    echo "  VPANEL_VERSION=v1.0.0 curl -sSL https://vpanel.zsoft.cc/install.sh | bash"
    echo ""
    echo "  # 指定端口安装"
    echo "  VPANEL_PORT=9090 curl -sSL https://vpanel.zsoft.cc/install.sh | bash"
}

main() {
    local ACTION="install"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --install)
                ACTION="install"
                shift
                ;;
            --upgrade)
                ACTION="upgrade"
                shift
                ;;
            --uninstall)
                ACTION="uninstall"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_banner

    case $ACTION in
        install)
            check_root
            check_system
            get_arch
            get_latest_version
            download_and_extract
            create_config
            create_systemd_service
            start_service
            configure_firewall
            print_success
            ;;
        upgrade)
            check_root
            get_arch
            get_latest_version
            do_upgrade
            ;;
        uninstall)
            check_root
            do_uninstall
            ;;
    esac
}

main "$@"
