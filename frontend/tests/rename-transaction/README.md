# 变量重命名 · 真实事务测试

针对 `renameVariable`（模板变量重命名）的真实事务测试，**不改动 `src/` 任何源码**：

- 真实本地存储：Playwright 启动真实 Chromium，使用浏览器原生 IndexedDB（非内存替身）；
  被测代码为 esbuild 原样打包的 `src/` 模块。
- 场景一（写入中途报错 → 整体回滚）：预建库时对 `instances.updatedAt` 注入唯一索引，
  同一事务内第 2 条实例写入触发真实 `ConstraintError`，验证模板与实例一起回滚，
  并通过 `IDBObjectStore.put` 探针指出失败阶段。
- 场景二（两页面同时提交）：两个真实页面（同源两个 tab，各自独立的 store 与连接）
  用 `Promise.all` 同时发起重命名，不做任何串行化；断言只有一个结果完整落库。
- 结束后删除测试数据库并验证清理完成。

## 运行

```bash
cd frontend
npm install            # playwright 已声明在 devDependencies
npm run test:rename    # 自动准备浏览器环境并执行全部用例
```

环境准备（`ensure-ready.mjs`，由测试入口自动调用，失败即退出非零）：

1. 校验 playwright 依赖存在（`npm install` 提供）；
2. 浏览器缺失时自动执行 `playwright install chromium`；
3. Linux 无 root 环境缺系统库时，自动用 apt 下载 deb 并解压到
   `node_modules/.cache/rename-transaction-deps/`（node_modules 不入提交）；
4. 真实启动一次浏览器作为验收，任何一步失败都抛出带修复指引的错误。

也可单独执行准备流程（如 CI 预热缓存）：

```bash
npm run test:rename:setup
```
