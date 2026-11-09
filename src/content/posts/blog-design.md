---
slug: blog-design
title: 博客搭建笔记：让项目与随笔连接起来
published: 2026-11-09
description: 示例开发笔记：项目页负责展示成果，随笔记录过程，通过项目标识自动关联。
tags: [Astro, Fuwari, GitHub Pages]
category: 项目笔记
projects: [personal-blog]
draft: false
---

这是一篇**示例项目笔记**，用于演示文章与项目之间的关联。

## 为什么分开管理

项目介绍适合集中展示目标、功能与下载，随笔则适合持续记录开发中的问题和经验。

## 如何关联

在文章头部填写项目标识即可：

```yaml
projects: [personal-blog]
```

文章会出现在对应项目的“相关随笔”中，读者也可以从本文回到项目页。
