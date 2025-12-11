# 快速开始

本指南将帮助你在 5 分钟内完成 VPanel 的安装和配置。

## 前置要求

- Linux 服务器 (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- 至少 512MB 内存
- 至少 1GB 可用磁盘空间
- Root 权限或 sudo 权限

## 一键安装

执行以下命令即可完成安装：

```bash
curl -sSL https://vpanel.zsoft.cc/install.sh | bash
```

安装脚本会自动：

1. 检测系统环境
2. 下载最新版本
3. 配置 systemd 服务
4. 启动 VPanel

## 访问面板

安装完成后，打开浏览器访问：

```
http://your-server-ip:8080
```

默认管理员账号：

- **用户名**: `admin`
- **密码**: `admin123`

::: warning 安全提示
首次登录后请立即修改默认密码！
:::

## 首次配置

### 1. 修改密码

登录后，点击右上角头像 → 个人设置 → 修改密码。

### 2. 配置安全设置

进入 **设置 → 系统** 页面：

- 修改面板端口（可选）
- 配置 HTTPS（推荐）
- 开启两步验证（推荐）

### 3. 添加服务器

如果需要管理远程服务器，在目标服务器上安装 Agent：

```bash
curl -sSL https://vpanel.zsoft.cc/install-agent.sh | bash -s -- \
  --server https://your-vpanel-server:8080 \
  --token YOUR_TOKEN
```

Token 可以在 **设置 → 系统 → Agent 管理** 中生成。

## 开始使用

现在你可以开始使用 VPanel 的各项功能了：

| 功能 | 说明 |
|------|------|
| [Docker](/guide/docker) | 管理容器、镜像、网络 |
| [Nginx](/guide/nginx) | 配置网站、SSL 证书 |
| [数据库](/guide/database) | 管理 MySQL、PostgreSQL |
| [文件](/guide/files) | 在线文件管理 |
| [终端](/guide/terminal) | Web SSH 终端 |

## 常见问题

### 端口被占用

```bash
# 检查端口占用
sudo lsof -i :8080

# 修改配置文件
sudo vim /opt/vpanel/config.yaml
# 修改 port: 8080 为其他端口

# 重启服务
sudo systemctl restart vpanel
```

### 无法访问面板

1. 检查服务状态：`sudo systemctl status vpanel`
2. 检查防火墙：`sudo ufw status` 或 `sudo firewall-cmd --list-all`
3. 检查日志：`sudo journalctl -u vpanel -f`

### 忘记密码

```bash
# 重置管理员密码
sudo vpanel reset-password admin
```

## 下一步

- [详细安装指南](/guide/installation) - 了解更多安装选项
- [Docker 管理](/guide/docker) - 开始管理容器
- [插件开发](/guide/plugin-dev) - 开发自定义插件
