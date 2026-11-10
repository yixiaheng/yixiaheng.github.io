---
slug: welcome-start
title: 旅途——从这里开始
published: 2026-11-09T14:57:00+08:00
updated: ""
draft: false
description: 本博客基于 Astro 与 Fuwari 开源主题搭建，使用 GitHub 管理代码与内容，通过 GitHub Actions
  自动构建并部署至 GitHub Pages。接入 Decap CMS 网页后台，结合 Cloudflare Worker 与 GitHub OAuth
  完成登录认证，实现无需自行维护服务器的文章编辑、资源上传和网站配置管理。
image: /images/uploads/image_1793290331601_168.jpg
tags:
  - 博客
  - 记录
category: 随笔
---
## 博客介绍

本博客基于 **Astro** 静态站点框架与 **Fuwari** 开源主题搭建，面向个人随笔、学习记录与项目展示。通过 GitHub 管理代码和内容，结合网页编辑后台与自动化部署，实现无需自行维护服务器的博客发布流程。

### 技术架构

| 技术 | 主要用途 |
| --- | --- |
| Astro + Fuwari | 网站构建、博客主题与页面布局 |
| TypeScript + Svelte | 前端交互逻辑与组件开发 |
| Tailwind CSS | 响应式布局、主题样式与视觉效果 |
| Decap CMS | 网页端文章编辑、资源上传与网站设置 |
| GitHub OAuth + Cloudflare Worker | 后台身份认证与授权流程 |
| GitHub Actions + GitHub Pages | 自动检查、构建与部署 |
| Swup + Pagefind | 平滑页面切换与静态站内搜索 |

### 内容管理

随笔和项目介绍使用 **Markdown** 编写，标题、日期、标签、分类及封面等信息通过文章顶部的 **Frontmatter** 保存，网站名称、个人简介和多媒体设置则由 **JSON** 配置管理。

通过 Decap CMS 网页后台，可以直接完成文章编辑、封面上传、项目维护和外观调整。所有修改提交至 GitHub 仓库，便于追踪历史版本和恢复内容。

### 自动发布

网站采用自动化发布流程：

**网页后台编辑 → 提交到 GitHub → GitHub Actions 检查与构建 → 部署至 GitHub Pages**

Astro 在构建阶段将文章、配置和页面组件生成静态文件，访客访问时直接加载页面，无需应用服务器实时查询数据库或生成内容。

### 界面与交互

在 Fuwari 原有主题基础上，博客加入了独立全页背景、MP4 视频横幅和首页艺术字，并提供下滑隐藏、上滑显示的导航栏，以及卡片光晕、封面缩放和正文入场等细节动效。

网站支持移动端适配、深浅色主题切换与站内搜索；装饰动画遵循后台开关和系统的“减少动态效果”设置，兼顾视觉体验与阅读舒适度。
