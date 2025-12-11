# 自动部署配置

本文档说明如何配置 GitHub Actions 自动部署到远程服务器。

## 前置要求

1. 远程服务器需要：
   - Linux 系统（Ubuntu/Debian/CentOS）
   - SSH 访问权限
   - Docker 和 Docker Compose（推荐）或直接运行二进制文件
   - 开放端口：8080（API）、3000（Web）、4000（Docs）

2. GitHub 仓库需要配置 Secrets

## 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库：`Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret` 添加以下密钥：

### 必需配置

- **DEPLOY_HOST**: 远程服务器地址（例如：`192.168.1.100` 或 `example.com`）
- **DEPLOY_SSH_KEY**: SSH 私钥内容（用于认证）

### 可选配置

- **DEPLOY_USER**: SSH 用户名（默认：`root`）
- **DEPLOY_PORT**: SSH 端口（默认：`22`）
- **DEPLOY_DIR**: 部署目录（默认：`/opt/vcloud`）

## 生成 SSH 密钥

如果还没有 SSH 密钥，可以在本地生成：

```bash
# 生成 SSH 密钥对
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy

# 查看公钥（需要添加到远程服务器）
cat ~/.ssh/github_deploy.pub

# 查看私钥（需要添加到 GitHub Secrets）
cat ~/.ssh/github_deploy
```

## 配置远程服务器

### 1. 添加 SSH 公钥

将公钥添加到远程服务器的 `~/.ssh/authorized_keys`：

```bash
# 在远程服务器上执行
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "你的公钥内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. 安装 Docker（推荐）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. 创建部署目录

```bash
sudo mkdir -p /opt/vcloud
sudo chown $USER:$USER /opt/vcloud
```

## 部署流程

### 自动部署

当推送 tag 触发 Release 构建完成后，会自动触发部署：

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 手动触发部署

1. 进入 GitHub 仓库的 `Actions` 页面
2. 选择 `Deploy to Remote Server` 工作流
3. 点击 `Run workflow`
4. 输入版本号（例如：`v1.0.0`）
5. 点击 `Run workflow`

## 部署过程

部署工作流会执行以下步骤：

1. ✅ 下载指定版本的发布包
2. ✅ 解压并准备部署文件
3. ✅ 通过 SSH 同步文件到远程服务器
4. ✅ 在远程服务器执行部署脚本
5. ✅ 启动服务（优先使用 Docker Compose）
6. ✅ 验证部署状态

## 验证部署

部署完成后，可以通过以下方式验证：

```bash
# SSH 到远程服务器
ssh user@your-server.com

# 进入部署目录
cd /opt/vcloud

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 检查端口
netstat -tlnp | grep -E ':(8080|3000|4000)'
```

## 访问服务

部署成功后，可以通过以下地址访问：

- **API**: `http://your-server-ip:8080`
- **Web**: `http://your-server-ip:3000`
- **Docs**: `http://your-server-ip:4000`

## 管理服务

### 查看日志

```bash
cd /opt/vcloud
docker-compose logs -f
```

### 重启服务

```bash
cd /opt/vcloud
docker-compose restart
```

### 停止服务

```bash
cd /opt/vcloud
docker-compose down
```

### 更新服务

推送新版本 tag 即可自动更新：

```bash
git tag v1.0.1
git push origin v1.0.1
```

## 故障排查

### SSH 连接失败

1. 检查 `DEPLOY_HOST` 是否正确
2. 检查 `DEPLOY_SSH_KEY` 是否正确
3. 检查远程服务器防火墙是否开放 SSH 端口
4. 检查 SSH 密钥是否有正确的权限

### 部署失败

1. 查看 GitHub Actions 日志
2. 检查远程服务器磁盘空间
3. 检查 Docker 是否正常运行
4. 检查端口是否被占用

### 服务无法启动

1. SSH 到服务器查看日志：`docker-compose logs`
2. 检查配置文件：`cat /opt/vcloud/config.yaml`
3. 检查端口占用：`netstat -tlnp | grep -E ':(8080|3000|4000)'`

## 安全建议

1. ✅ 使用 SSH 密钥认证，不要使用密码
2. ✅ 限制 SSH 访问 IP（使用防火墙）
3. ✅ 定期更新 SSH 密钥
4. ✅ 使用非 root 用户部署（配置 `DEPLOY_USER`）
5. ✅ 配置 HTTPS 反向代理（使用 Nginx）
6. ✅ 定期备份数据目录：`/opt/vcloud/data`

