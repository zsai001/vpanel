# 下载安装

<div class="version-info">
  <span class="version-badge">最新版本: v1.0.0</span>
  <span class="release-date">发布日期: 2024-12-11</span>
</div>

## 一键安装 <Badge type="tip" text="推荐" />

使用官方安装脚本，自动检测系统环境并完成安装：

```bash
curl -sSL https://vpanel.zsoft.cc/install.sh | bash
```

指定版本安装：

```bash
VPANEL_VERSION=v1.0.0 curl -sSL https://vpanel.zsoft.cc/install.sh | bash
```

## Docker 安装

使用 Docker 快速部署：

```bash
docker run -d \
  --name vpanel \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v vpanel-data:/data \
  vpanel/vpanel:latest
```

使用 Docker Compose：

```yaml
version: '3.8'
services:
  vpanel:
    image: vpanel/vpanel:latest
    container_name: vpanel
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - vpanel-data:/data
    environment:
      - TZ=Asia/Shanghai

volumes:
  vpanel-data:
```

## 手动下载

选择适合您系统的版本：

### Linux

| 架构 | 下载链接 | 校验和 |
|------|----------|--------|
| x86_64 | [vpanel-linux-amd64.tar.gz](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-v1.0.0-linux-amd64.tar.gz) | [checksums.txt](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/checksums.txt) |
| ARM64 | [vpanel-linux-arm64.tar.gz](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-v1.0.0-linux-arm64.tar.gz) | [checksums.txt](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/checksums.txt) |

### Agent

| 系统 | 架构 | 下载链接 |
|------|------|----------|
| Linux | x86_64 | [vpanel-agent-linux-amd64.tar.gz](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-agent-v1.0.0-linux-amd64.tar.gz) |
| Linux | ARM64 | [vpanel-agent-linux-arm64.tar.gz](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-agent-v1.0.0-linux-arm64.tar.gz) |
| macOS | Intel | [vpanel-agent-darwin-amd64.tar.gz](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-agent-v1.0.0-darwin-amd64.tar.gz) |
| macOS | Apple Silicon | [vpanel-agent-darwin-arm64.tar.gz](https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-agent-v1.0.0-darwin-arm64.tar.gz) |

### 手动安装步骤

```bash
# 1. 下载并解压
tar -xzf vpanel-linux-amd64.tar.gz
cd vpanel

# 2. 安装
sudo ./install.sh

# 3. 启动服务
sudo systemctl start vpanel
sudo systemctl enable vpanel

# 4. 访问面板
echo "访问 http://your-server-ip:8080"
```

## Agent 安装

在需要管理的远程服务器上安装 Agent：

```bash
curl -sSL https://vpanel.zsoft.cc/install-agent.sh | bash -s -- \
  --server https://your-vpanel-server:8080 \
  --token YOUR_AGENT_TOKEN
```

## 系统要求

### 服务端

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 512 MB | 1 GB+ |
| 磁盘 | 1 GB | 10 GB+ |
| 系统 | Linux 64-bit | Ubuntu 20.04+, Debian 11+, CentOS 8+ |

### 支持的系统

- Ubuntu 18.04 / 20.04 / 22.04 / 24.04
- Debian 10 / 11 / 12
- CentOS 7 / 8 / 9
- Rocky Linux 8 / 9
- AlmaLinux 8 / 9
- Fedora 38+
- macOS 12+ (开发环境)

## 升级

### 自动升级

面板内置自动更新检查，在 **设置 > 系统** 中可以一键升级。

### 手动升级

```bash
# 使用安装脚本升级
curl -sSL https://vpanel.zsoft.cc/install.sh | bash -s -- --upgrade

# 或 Docker
docker pull vpanel/vpanel:latest
docker compose up -d
```

## 卸载

```bash
# 使用卸载脚本
curl -sSL https://vpanel.zsoft.cc/install.sh | bash -s -- --uninstall

# 或手动卸载
sudo systemctl stop vpanel
sudo systemctl disable vpanel
sudo rm -rf /opt/vpanel
sudo rm /etc/systemd/system/vpanel.service
```

<style>
.version-info {
  display: flex;
  gap: 16px;
  align-items: center;
  margin: 24px 0;
  flex-wrap: wrap;
}

.version-badge {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.release-date {
  color: var(--vp-c-text-3);
  font-size: 14px;
}
</style>
