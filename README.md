# LifeDB v2

一个基于云端的生命记忆管理系统，将思想、记忆和时刻映射为宇宙中的节点，打造属于您的数字宇宙。

## 项目简介

LifeDB v2 是一个创新的个人知识管理系统，它采用宇宙隐喻来组织和管理您的数字生活。通过将记忆、思想和经历表示为宇宙中的节点和星座，您可以以一种全新的方式可视化和探索您的个人历史。

## 项目结构

```
v2/
├── test/
│   ├── static/
│   │   ├── admin/          # 管理后台前端
│   │   └── web/            # Web 展示前端
│   └── ...
└── ...
```

## 子项目

### 1. Admin 管理后台

宇宙生命管理系统 - 一个赛博朋克风格的宇宙管理界面，用于管理生命时刻、星系和宇宙统计。

- **位置**: [`test/static/admin`](test/static/admin)
- **技术栈**: React 19, TypeScript, Vite, React Router
- **功能**: 用户认证、节点管理、时刻创建、宇宙可视化

### 2. Web 前端

混沌生命宇宙 - 一个 3D 模拟的 Web 界面，将思想和记忆映射为宇宙节点，提供沉浸式的宇宙可视化体验。

- **位置**: [`test/static/web`](test/static/web)
- **技术栈**: React 19, TypeScript, Vite, Three.js, React Three Fiber, D3.js
- **功能**: 3D 宇宙可视化、节点交互、时间旅行、统计分析

## 快速开始

### 环境要求

- Node.js (推荐 v18+)
- npm 或 yarn

### 安装步骤

#### Admin 管理后台

```bash
cd test/static/admin
npm install
npm run dev
```

#### Web 前端

```bash
cd test/static/web
npm install
npm run dev
```

## 技术栈

### 共同技术

- **React 19** - 最新版本的前端框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Vite** - 快速的开发构建工具
- **Lucide React** - 现代化的图标库
- **Recharts** - 数据可视化图表库

### Web 前端特有

- **Three.js** - 3D 图形库
- **React Three Fiber** - React 的 Three.js 渲染器
- **React Three Drei** - Three.js 的工具集
- **D3.js** - 数据驱动的文档操作

## 核心功能

- 🌌 **宇宙可视化**: 3D 展示您的数字宇宙
- 🧠 **节点系统**: 将思想和记忆表示为宇宙节点
- 🔗 **连接网络**: 展现节点之间的关联关系
- ⏰ **时间旅行**: 探索不同时间点的宇宙状态
- 📊 **统计分析**: 了解您的数字生活模式
- 🎨 **赛博朋克美学**: 沉浸式视觉体验

## 开发

### 可用脚本

在每个子项目中：

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 项目亮点

1. **创新的隐喻系统**: 使用宇宙学概念组织个人数据
2. **沉浸式 3D 体验**: 基于 Three.js 的实时渲染
3. **时间维度**: 支持时间旅行功能，回顾历史数据
4. **响应式设计**: 适配不同设备和屏幕尺寸
5. **类型安全**: 全面使用 TypeScript

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
