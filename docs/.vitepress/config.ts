import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'VPanel',
  description: '新一代智能服务器运维管理平台',
  lang: 'zh-CN',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'VPanel' }],
    ['meta', { name: 'og:url', content: 'https://vpanel.zsoft.cc' }],
    ['meta', { name: 'og:title', content: 'VPanel - 智能服务器运维管理平台' }],
    ['meta', { name: 'og:description', content: '新一代企业级服务器运维管理平台，支持 Docker、Nginx、数据库管理等' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '首页', link: '/' },
      { text: '文档', link: '/guide/' },
      { text: '下载', link: '/download' },
      { text: '更新日志', link: '/changelog' },
      {
        text: '社区',
        items: [
          { text: 'GitHub', link: 'https://github.com/zsoft-vpanel/vpanel' },
          { text: '问题反馈', link: 'https://github.com/zsoft-vpanel/vpanel/issues' },
          { text: '讨论区', link: 'https://github.com/zsoft-vpanel/vpanel/discussions' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          items: [
            { text: '简介', link: '/guide/' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '安装部署', link: '/guide/installation' },
          ]
        },
        {
          text: '功能指南',
          items: [
            { text: 'Docker 管理', link: '/guide/docker' },
            { text: 'Nginx 管理', link: '/guide/nginx' },
            { text: '数据库管理', link: '/guide/database' },
            { text: '文件管理', link: '/guide/files' },
            { text: '终端', link: '/guide/terminal' },
            { text: '计划任务', link: '/guide/cron' },
            { text: '防火墙', link: '/guide/firewall' },
          ]
        },
        {
          text: '高级',
          items: [
            { text: '插件开发', link: '/guide/plugin-dev' },
            { text: 'API 文档', link: '/guide/api' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zsoft-vpanel/vpanel' }
    ],

    footer: {
      message: '基于 Apache 2.0 许可发布',
      copyright: `Copyright © ${new Date().getFullYear()} VPanel Team`
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换'
            }
          }
        }
      }
    },

    editLink: {
      pattern: 'https://github.com/zsoft-vpanel/vpanel/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  }
})
