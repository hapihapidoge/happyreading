# Happy Reading - 电子书阅读器

## 项目概述

一个基于 Web 的电子书阅读器，支持 EPUB 和 PDF 格式文件导入与阅读。

## 技术栈

- **前端框架**: React + TypeScript + Vite
- **PDF 解析**: pdfjs-dist
- **EPUB 解析**: 自定义解析器 (使用 jszip)
- **存储**: localforage (IndexedDB)
- **路由**: react-router-dom

## 项目结构

```
src/
├── components/
│   ├── EpubReader.tsx    # EPUB 阅读器组件
│   └── PdfReader.tsx     # PDF 阅读器组件
├── pages/
│   ├── ShelfPage.tsx     # 书架页面 (导入书籍)
│   └── ReaderPage.tsx    # 阅读器页面
├── utils/
│   ├── storage.ts        # IndexedDB 存储操作
│   └── epubParser.ts     # EPUB 文件解析
├── types/
│   └── index.ts          # 类型定义
├── styles/
│   └── index.css         # 全局样式 (深色护眼主题)
├── App.tsx               # 路由配置
└── main.tsx              # 入口文件
```

## 核心类型

```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  file: File;
  fileType: 'epub' | 'pdf';
  addedAt: number;
  lastReadAt?: number;
  progress?: number;
}

interface TocItem {
  label: string;
  href: string;
  subitems?: TocItem[];
}
```

## 功能特性

### 书架页面 (ShelfPage)
- 拖拽/点击上传 EPUB 或 PDF 文件
- 展示已导入书籍列表
- 点击书籍进入阅读器
- 数据持久化到 IndexedDB

### 阅读器页面 (ReaderPage)
- 深色护眼主题背景 (#1a1a1a)
- 点击左/右 1/3 区域翻页
- 目录面板 (EPUB)
- 阅读进度条
- 键盘方向键翻页

### EPUB 阅读器
- 使用自定义解析器直接读取 EPUB 结构
- 按 spine 顺序加载章节
- 支持目录跳转
- 滚动式阅读

### PDF 阅读器
- 使用 pdfjs-dist 渲染
- 缩放渲染页面
- 点击翻页

## 启动命令

```bash
npm install    # 安装依赖
npm run dev    # 开发模式
npm run build  # 生产构建
```

## 注意事项

- EPUB 使用自定义解析而非 iframe，避免跨域限制
- 书籍数据存储在浏览器 IndexedDB，刷新后保留
- PDF.js worker 从 CDN 加载
