# 安装部署

本文档提供 VPanel 的详细安装指南，包括多种安装方式和配置选项。

## 安装方式

VPanel 支持多种安装方式：

| 方式 | 适用场景 | 难度 |
|------|----------|------|
| 一键安装 | 快速体验、生产环境 | ⭐ |
| Docker | 容器化部署 | ⭐ |
| Docker Compose | 完整环境部署 | ⭐⭐ |
| 手动安装 | 自定义需求 | ⭐⭐⭐ |
| 源码编译 | 开发调试 | ⭐⭐⭐⭐ |

## 一键安装

### 标准安装

```bash
curl -sSL https://vpanel.zsoft.cc/install.sh | bash
```

### 自定义安装

```bash
# 指定安装目录
VPANEL_INSTALL_DIR=/opt/vpanel curl -sSL https://vpanel.zsoft.cc/install.sh | bash

# 指定端口
VPANEL_PORT=9090 curl -sSL https://vpanel.zsoft.cc/install.sh | bash

# 指定版本
VPANEL_VERSION=v1.0.0 curl -sSL https://vpanel.zsoft.cc/install.sh | bash
```

### 离线安装

```bash
# 1. 在有网络的机器上下载安装包
wget https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-v1.0.0-linux-amd64.tar.gz

# 2. 传输到目标服务器
scp vpanel-linux-amd64.tar.gz user@server:/tmp/

# 3. 在目标服务器上安装
tar -xzf /tmp/vpanel-linux-amd64.tar.gz
cd vpanel && sudo ./install.sh
```

## Docker 安装

### 快速启动

```bash
docker run -d \
  --name vpanel \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v vpanel-data:/data \
  -e TZ=Asia/Shanghai \
  vpanel/vpanel:latest
```

### Docker Compose

创建 `docker-compose.yml`：

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
      - ./config.yaml:/app/config.yaml:ro
    environment:
      - TZ=Asia/Shanghai
      - VPANEL_SECRET_KEY=${SECRET_KEY:-your-secret-key}
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  vpanel-data:
```

启动：

```bash
docker-compose up -d
```

## 配置文件

配置文件位置：`/opt/vpanel/config.yaml` 或 `/data/config.yaml` (Docker)

```yaml
# 服务配置
server:
  host: 0.0.0.0
  port: 8080
  
# 数据库配置
database:
  driver: sqlite  # sqlite 或 postgres
  dsn: /data/vpanel.db
  
# 日志配置
log:
  level: info  # debug, info, warn, error
  format: json
  output: /data/logs/vpanel.log
  
# 安全配置
security:
  secret_key: your-secret-key-change-it
  jwt_expire: 24h
  
# 功能开关
features:
  docker: true
  nginx: true
  database: true
  terminal: true
  file_manager: true
```

## Systemd 服务

安装脚本会自动配置 systemd 服务，你也可以手动配置：

```ini
# /etc/systemd/system/vpanel.service
[Unit]
Description=VPanel Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vpanel
ExecStart=/opt/vpanel/vpanel server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

服务管理：

```bash
# 启动
sudo systemctl start vpanel

# 停止
sudo systemctl stop vpanel

# 重启
sudo systemctl restart vpanel

# 查看状态
sudo systemctl status vpanel

# 查看日志
sudo journalctl -u vpanel -f
```

## 反向代理

### Nginx

```nginx
server {
    listen 80;
    server_name panel.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name panel.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```caddyfile
panel.example.com {
    reverse_proxy localhost:8080
}
```

## 升级

### 自动升级

```bash
curl -sSL https://vpanel.zsoft.cc/install.sh | bash -s -- --upgrade
```

### Docker 升级

```bash
docker pull vpanel/vpanel:latest
docker-compose up -d
```

### 手动升级

```bash
# 1. 停止服务
sudo systemctl stop vpanel

# 2. 备份数据
sudo cp -r /opt/vpanel/data /opt/vpanel/data.bak

# 3. 下载新版本
wget https://github.com/zsoft-vpanel/vpanel/releases/latest/download/vpanel-v1.0.0-linux-amd64.tar.gz

# 4. 解压并替换
tar -xzf vpanel-linux-amd64.tar.gz
sudo cp vpanel/vpanel /opt/vpanel/

# 5. 启动服务
sudo systemctl start vpanel
```

## 卸载

```bash
# 一键卸载
curl -sSL https://vpanel.zsoft.cc/install.sh | bash -s -- --uninstall

# 手动卸载
sudo systemctl stop vpanel
sudo systemctl disable vpanel
sudo rm /etc/systemd/system/vpanel.service
sudo rm -rf /opt/vpanel
```

::: warning 注意
卸载不会删除数据目录，如需完全删除请手动删除 `/opt/vpanel/data`
:::
