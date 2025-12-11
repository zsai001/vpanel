import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Language resources
const resources = {
  en: {
    translation: {
      // Common
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        loading: 'Loading...',
        noData: 'No data available',
        confirm: 'Confirm',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info',
      },
      // Auth
      auth: {
        login: 'Login',
        logout: 'Logout',
        username: 'Username',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        signIn: 'Sign In',
        signOut: 'Sign Out',
      },
      // Navigation
      nav: {
        dashboard: 'Dashboard',
        docker: 'Docker',
        containers: 'Containers',
        images: 'Images',
        networks: 'Networks',
        volumes: 'Volumes',
        compose: 'Compose',
        nginx: 'Nginx',
        sites: 'Sites',
        certificates: 'Certificates',
        database: 'Database',
        servers: 'Servers',
        backups: 'Backups',
        files: 'Files',
        terminal: 'Terminal',
        cron: 'Cron Jobs',
        firewall: 'Firewall',
        software: 'Software',
        plugins: 'Plugins',
        market: 'Market',
        nodes: 'Nodes',
        settings: 'Settings',
        users: 'Users',
        logs: 'Logs',
      },
      // Dashboard
      dashboard: {
        title: 'Dashboard',
        subtitle: 'Overview of your server infrastructure',
        totalNodes: 'Total Nodes',
        containers: 'Containers',
        websites: 'Websites',
        databases: 'Databases',
        cpuUsage: 'CPU Usage',
        memoryUsage: 'Memory Usage',
        diskUsage: 'Disk Usage',
        recentAlerts: 'Recent Alerts',
        recentActivity: 'Recent Activity',
      },
    },
  },
  zh: {
    translation: {
      // Common
      common: {
        save: '保存',
        cancel: '取消',
        delete: '删除',
        edit: '编辑',
        create: '创建',
        search: '搜索',
        loading: '加载中...',
        noData: '暂无数据',
        confirm: '确认',
        success: '成功',
        error: '错误',
        warning: '警告',
        info: '信息',
      },
      // Auth
      auth: {
        login: '登录',
        logout: '退出',
        username: '用户名',
        password: '密码',
        rememberMe: '记住我',
        forgotPassword: '忘记密码?',
        signIn: '登录',
        signOut: '退出登录',
      },
      // Navigation
      nav: {
        dashboard: '仪表盘',
        docker: 'Docker',
        containers: '容器',
        images: '镜像',
        networks: '网络',
        volumes: '存储卷',
        compose: 'Compose',
        nginx: 'Nginx',
        sites: '站点',
        certificates: '证书',
        database: '数据库',
        servers: '服务器',
        backups: '备份',
        files: '文件',
        terminal: '终端',
        cron: '计划任务',
        firewall: '防火墙',
        software: '软件',
        plugins: '插件',
        market: '应用市场',
        nodes: '节点',
        settings: '设置',
        users: '用户',
        logs: '日志',
      },
      // Dashboard
      dashboard: {
        title: '仪表盘',
        subtitle: '服务器基础设施概览',
        totalNodes: '节点总数',
        containers: '容器',
        websites: '网站',
        databases: '数据库',
        cpuUsage: 'CPU 使用率',
        memoryUsage: '内存使用率',
        diskUsage: '磁盘使用率',
        recentAlerts: '最近告警',
        recentActivity: '最近活动',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;

