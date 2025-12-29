# GitHub Actions Workflows

## Deploy to Dev Server

当 `dev` 分支有 push 时，会自动构建并部署到服务器。

### 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. **SSH_PRIVATE_KEY**: 用于连接服务器的 SSH 私钥
   ```bash
   # 在服务器上生成密钥对（如果没有）
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy
   
   # 将私钥添加到 GitHub Secrets
   cat ~/.ssh/github_actions_deploy
   ```

2. **SSH_HOST**: 服务器 IP 地址或域名
   ```
   例如: 192.168.1.100 或 deploy.example.com
   ```

3. **SSH_USER**: SSH 用户名
   ```
   例如: root 或 deploy
   ```

4. **DEPLOY_PATH** (可选): 部署路径，默认为 `/opt/vpanel`
   ```
   例如: /opt/vpanel
   ```

### 服务器端配置

1. 将公钥添加到服务器的 `~/.ssh/authorized_keys`：
   ```bash
   cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/authorized_keys
   ```

2. 确保服务器上已安装并配置 systemd 服务（可通过 `scripts/install.sh` 安装）

3. 确保部署路径存在且用户有权限：
   ```bash
   sudo mkdir -p /opt/vpanel
   sudo chown $SSH_USER:$SSH_USER /opt/vpanel
   ```

### 部署流程

1. **构建后端**: 在 Linux amd64 平台上构建 Go 二进制文件
2. **构建前端**: 使用 npm 构建 React 前端应用
3. **打包**: 将所有文件打包成 tar.gz
4. **部署**: 通过 SSH 上传到服务器
5. **备份**: 自动备份当前版本
6. **更新**: 解压新版本并替换文件
7. **重启**: 重启 systemd 服务

### 手动触发

如果需要手动触发部署，可以：

1. 在 GitHub Actions 页面手动运行 workflow
2. 或者向 dev 分支 push 任意提交：
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push origin dev
   ```

