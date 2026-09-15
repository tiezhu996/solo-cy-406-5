# 变量重命名 · 真实事务测试

针对 `renameVariable`（模板变量重命名）的真实事务测试，**不改动 `src/` 任何源码**：

- 被测代码由 esbuild 从 `src/` 原样打包（`tests/rename-transaction/driver.ts` 只做转发）；
- 存储使用真实 Chromium 的原生 IndexedDB（Playwright 启动真实浏览器，非内存替身）；
- 测试数据与库在结束后自动清理。

## 覆盖场景

**场景一：写入中途报错 → 整体回滚**
预建库时对 `instances.updatedAt` 注入唯一索引（存储层故障注入，应用 `openDB(1)` 版本相等直接复用该 schema）。重命名计划会把多条草稿的 `updatedAt` 改为同一时间戳，于是同一事务内第 2 条实例写入触发真实 `ConstraintError`。通过 `IDBObjectStore.prototype.put` 探针（`addEventListener`，只观察不干预）输出写入阶段追踪，定位失败阶段，并回读验证模板与全部实例（含事务内已写入成功的第 1 条）一起回滚。

**场景二：两个页面同时提交 → 只有一个结果完整落库**
两个真实页面（同源两个 tab，各自独立的 zustand store 与 IDB 连接）用 `Promise.all` 同时发起两个不同的重命名，不做任何串行化（断言两次提交的时间窗真实重叠）。每轮回读后断言：落库结果完整等于且仅等于其中一个计划，败者不留任何痕迹，定稿实例保持原样。默认执行 3 轮。

## 运行

```bash
cd frontend
npm install --no-save playwright   # 不写入 package.json
npx playwright install chromium
node tests/rename-transaction/run.mjs
```

无 root 的精简 Linux 环境若缺 Chromium 系统库（`libnss3` 等），先执行一次：

```bash
bash tests/rename-transaction/setup-deps.sh
```

脚本会把 deb 包下载解压到 `tests/rename-transaction/.deps/`，运行时通过 `LD_LIBRARY_PATH` 加载。
