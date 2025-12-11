# 更新日志

本页面记录 VPanel 的版本更新历史。

遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

---

## v1.0.1 <Badge type="tip" text="最新" /> {#v1.0.1}

<div class="changelog-meta">
  <span class="date">📅 2025-12-11</span>
</div>

### 🔧 维护更新

- 测试发布流程
- 文档更新

---

## v1.0.0 {#v1.0.0}

<div class="changelog-meta">
  <span class="date">📅 2024-12-11</span>
</div>

### 🎉 首个正式版本发布

VPanel 1.0.0 正式发布！这是一个功能完整的企业级服务器运维管理平台。

### ✨ 新功能

- **Docker 管理**
  - 容器生命周期管理（创建、启动、停止、删除）
  - 镜像管理（拉取、构建、删除）
  - 网络和卷管理
  - Docker Compose 编排支持
  - 容器日志实时查看
  - 容器终端 (exec)

- **Nginx 管理**
  - 站点可视化配置
  - SSL 证书自动申请 (Let's Encrypt)
  - 反向代理配置
  - 访问日志实时分析

- **数据库管理**
  - MySQL/MariaDB 支持
  - PostgreSQL 支持
  - 数据库备份与恢复
  - 用户权限管理

- **文件管理**
  - Web 文件管理器
  - 在线代码编辑
  - 文件上传下载
  - 压缩/解压功能

- **终端**
  - Web SSH 终端
  - 多会话支持
  - 命令历史记录

- **计划任务**
  - Cron 可视化管理
  - 任务执行日志
  - 执行历史记录

- **防火墙**
  - 防火墙规则管理
  - IP 黑白名单
  - 端口管理

- **插件系统**
  - 插件动态加载/卸载
  - 官方插件市场
  - 插件开发 SDK

- **系统设置**
  - 用户管理
  - 角色权限管理
  - 团队管理
  - 系统配置

### 🔒 安全

- JWT 认证
- RBAC 权限控制
- 操作审计日志
- 敏感数据加密存储

---

## v0.9.0-beta {#v0.9.0-beta}

<div class="changelog-meta">
  <span class="date">📅 2024-11-15</span>
</div>

### 🧪 公开测试版

- 完成核心功能开发
- 开放公开测试
- 收集用户反馈

### ✨ 新功能

- 基础 Docker 管理功能
- Nginx 站点管理
- 文件管理器
- Web 终端

### 🐛 修复

- 修复容器日志显示问题
- 修复文件上传大小限制
- 优化终端响应速度

---

## v0.1.0-alpha {#v0.1.0-alpha}

<div class="changelog-meta">
  <span class="date">📅 2024-10-01</span>
</div>

### 🚀 项目启动

- 项目初始化
- 基础架构搭建
- 核心模块设计

---

<style>
.changelog-meta {
  margin: 8px 0 24px;
  color: var(--vp-c-text-3);
  font-size: 14px;
}

.changelog-meta .date {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

h2[id^="v"] {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 48px;
}

h2[id^="v"]:first-of-type {
  border-top: none;
  margin-top: 0;
}
</style>

