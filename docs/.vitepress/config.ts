import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'VPanel',
  description: '新一代智能服务器运维管理平台',
  lang: 'zh-CN',
  
  // 部署在 /docs/ 子路径下
  base: '/docs/',
  
  // 忽略死链接，允许文档逐步完善
  ignoreDeadLinks: true,
  
  head: [
    ['link', { rel: 'icon', href: '/docs/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' },
      { text: '下载', link: '/download' },
      { text: '更新日志', link: '/changelog' },
      {
        text: '相关链接',
        items: [
          { text: 'GitHub', link: 'https://github.com/zsoft-vpanel/vpanel' },
          { text: 'VCloud', link: 'https://vcloud.zsoft.cc' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装部署', link: '/guide/installation' },
          ]
        },
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zsoft-vpanel/vpanel' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 VPanel Team'
    },

    search: {
      provider: 'local'
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    lastUpdated: {
      text: '最后更新于',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
  }
})
