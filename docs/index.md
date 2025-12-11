---
layout: home

hero:
  name: VPanel
  text: 新一代智能服务器运维管理平台
  tagline: 开源、高效、安全的企业级服务器管理解决方案，让运维更简单
  image:
    src: /logo.svg
    alt: VPanel
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/
    - theme: alt
      text: 下载安装
      link: /download
    - theme: alt
      text: GitHub
      link: https://github.com/zsoft-vpanel/vpanel

features:
  - icon: 🐳
    title: Docker 容器管理
    details: 完整的 Docker 生命周期管理，支持容器、镜像、网络、卷和 Compose 编排
  - icon: 🌐
    title: Nginx 可视化管理
    details: 站点配置可视化，SSL 证书自动申请，反向代理一键配置
  - icon: 🗄️
    title: 多数据库支持
    details: 支持 MySQL、PostgreSQL、Redis、MongoDB 等主流数据库的管理和备份
  - icon: 📁
    title: 在线文件管理
    details: Web 文件管理器，支持在线编辑、权限管理、压缩解压等
  - icon: 💻
    title: Web 终端
    details: 浏览器内 SSH 终端，多会话支持，命令历史记录
  - icon: ⏰
    title: 计划任务
    details: Cron 任务可视化管理，任务日志和执行历史
  - icon: 🔒
    title: 安全防护
    details: 防火墙管理、Fail2Ban 集成、SSH 密钥管理、安全审计日志
  - icon: 🔌
    title: 插件生态
    details: 强大的插件系统，官方插件市场，自定义扩展开发
  - icon: 📊
    title: 实时监控
    details: 服务器性能实时监控，多节点管理，告警通知
---

<style>
.stats-section {
  max-width: 1152px;
  margin: 64px auto;
  padding: 0 24px;
}

.stats-title {
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 48px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-card {
  text-align: center;
  padding: 32px 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  color: var(--vp-c-text-2);
  margin-top: 8px;
  font-size: 1rem;
}

.cta-section {
  text-align: center;
  padding: 64px 24px;
  background: var(--vp-c-bg-soft);
  margin-top: 64px;
}

.cta-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.cta-desc {
  color: var(--vp-c-text-2);
  margin-bottom: 32px;
  font-size: 1.1rem;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.cta-btn.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
}

.cta-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
}

.cta-btn.secondary {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.cta-btn.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>

<div class="stats-section">
  <h2 class="stats-title">为什么选择 VPanel</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-number">100%</div>
      <div class="stat-label">开源免费</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">5min</div>
      <div class="stat-label">快速部署</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">10+</div>
      <div class="stat-label">核心功能</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">∞</div>
      <div class="stat-label">插件扩展</div>
    </div>
  </div>
</div>

<div class="cta-section">
  <h2 class="cta-title">准备好开始了吗？</h2>
  <p class="cta-desc">只需一条命令，即可完成安装部署</p>
  <div class="cta-buttons">
    <a href="/download" class="cta-btn primary">
      📦 下载安装
    </a>
    <a href="/guide/" class="cta-btn secondary">
      📖 阅读文档
    </a>
  </div>
</div>
