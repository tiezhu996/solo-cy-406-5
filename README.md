# 合同模板在线编辑器

面向法律从业者和企业法务的本地化合同起草工作台，支持模板管理、变量替换、条款复用、版本保存与差异对比。

## 功能列表

- 模板库：按合同分类、标签和关键词检索，支持创建、编辑、复制、删除模板。
- 模板编辑器：使用 TipTap 富文本编辑合同正文，右侧维护变量，底部条款库可插入复用条款。
- 合同实例：基于模板创建实例，填写变量后实时预览最终合同 HTML。
- 版本历史：为合同实例保存版本，左右双栏高亮对比内容差异。
- 条款库：按分类管理违约、争议解决、付款、知识产权等常用条款。
- 本地持久化：通过 IndexedDB 保存全部数据，并支持 JSON 导入导出。
- Undo/Redo：模板编辑器集成 Ctrl+Z / Ctrl+Y，并在状态管理中维护模板历史栈。

## 快速启动

```bash
cd frontend
npm install
npm run dev
```

开发服务器端口为 `28312`，访问 `http://localhost:28312`。

构建与预览：

```bash
npm run build
npm run preview
```

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| UI 组件 | Arco Design |
| 状态管理 | Zustand |
| 富文本编辑 | TipTap |
| 本地数据库 | IndexedDB + idb |
| 差异对比 | diff |
| 路由 | React Router |

## 目录结构

```text
frontend/src/
├── api/           # IndexedDB 数据访问入口
├── stores/        # template.ts, clause.ts, instance.ts, version.ts
├── types/         # Template / Clause / ContractInstance / Version / enums
├── components/
│   ├── common/    # TemplateCard, RichEditor, VariableForm, CategoryFilter, VersionDiff
│   ├── editor/    # 变量面板、条款抽屉、条款编辑器、编辑器工具栏
│   └── preview/   # 合同预览组件
├── hooks/         # useIndexedDB, useHistory, useVariableReplace
├── pages/         # TemplateList, TemplateEditor, InstanceEditor, VersionCompare, ClauseList
├── router/        # 路由和应用布局
├── styles/        # 全局样式
└── utils/         # db, diff, export, seed
```

## License

MIT
