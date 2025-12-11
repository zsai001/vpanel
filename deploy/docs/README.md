# VPanel 官网部署

## 部署步骤

### 1. 准备服务器目录

```bash
# 创建部署目录
mkdir -p /opt/vpanel-docs/html

# 上传配置文件
cd /opt/vpanel-docs
# 上传 docker-compose.yml 和 nginx.conf
```

### 2. 启动容器

```bash
cd /opt/vpanel-docs
docker compose up -d
```

### 3. 配置外部 Nginx

将 `nginx-external.conf` 内容添加到你的 Nginx 站点配置中，修改 SSL 证书路径后重载 Nginx：

```bash
# 测试配置
nginx -t

# 重载
nginx -s reload
```

### 4. 配置 GitHub Actions Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret Name | 说明 |
|-------------|------|
| `DEPLOY_HOST` | 服务器 IP 或域名 |
| `DEPLOY_USER` | SSH 用户名 |
| `DEPLOY_KEY` | SSH 私钥 |
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 (可选) |
| `DOCKERHUB_TOKEN` | Docker Hub Token (可选) |

### 5. 触发部署

推送 tag 触发自动构建和部署：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 目录结构

```
/opt/vpanel-docs/
├── docker-compose.yml    # Docker Compose 配置
├── nginx.conf            # 内部 Nginx 配置
└── html/                 # 静态文件 (由 CI 自动更新)
    ├── index.html
    ├── assets/
    └── ...
```

## 手动更新

如需手动更新网站内容：

```bash
# 下载最新 docs
curl -L https://github.com/vstaff/vpanel/releases/latest/download/vpanel-docs.tar.gz -o docs.tar.gz

# 解压到 html 目录
rm -rf /opt/vpanel-docs/html/*
tar -xzf docs.tar.gz -C /opt/vpanel-docs/html/

# 重启容器 (可选)
cd /opt/vpanel-docs
docker compose restart
```

## 常见问题

### 查看日志

```bash
docker compose logs -f
```

### 重启服务

```bash
docker compose restart
```

### 停止服务

```bash
docker compose down
```
