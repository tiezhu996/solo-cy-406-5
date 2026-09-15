#!/usr/bin/env node
/**
 * 变量重命名 · 真实事务测试
 *
 * - 真实本地存储：Playwright 启动真实 Chromium，使用浏览器原生 IndexedDB（非内存替身）；
 *   被测代码为 esbuild 原样打包的 src/ 模块，现有源码零改动。
 * - 场景一（写入中途报错 → 整体回滚）：预建库时对 instances.updatedAt 注入唯一索引，
 *   同一事务内第 2 条实例写入触发真实 ConstraintError，验证模板与实例一起回滚，
 *   并通过 IDBObjectStore.put 探针指出失败阶段。
 * - 场景二（两页面同时提交）：两个真实页面（同源两个 tab，各自独立的 store 与连接）
 *   用 Promise.all 同时发起重命名，不做任何串行化；断言只有一个结果完整落库。
 * - 结束后删除测试数据库并验证清理完成。
 *
 * 运行：node tests/rename-transaction/run.mjs
 * 依赖：npm i --no-save playwright && npx playwright install chromium
 *       （Linux 缺系统库时先执行 tests/rename-transaction/setup-deps.sh）
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROUNDS = 3;

/* -------------------------------- 测试数据 -------------------------------- */

const TEMPLATE = {
  id: 'tpl_tx_test',
  title: '事务测试模板',
  category: 'service',
  tags: ['tx-test'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  variables: [
    { id: 'var_1', name: 'partyA', label: '甲方', type: 'text', defaultValue: '默认甲方', required: true },
    { id: 'var_2', name: 'partyB', label: '乙方', type: 'text', defaultValue: '默认乙方', required: true }
  ],
  contentHtml: '<p>甲方：{{partyA}}</p><p>乙方：{{partyB}}</p><p>重申甲方：{{ partyA }}</p>'
};

function makeInstance(id, status, updatedAt, partyA, partyB) {
  return {
    id,
    templateId: TEMPLATE.id,
    title: `实例_${id}`,
    variableValues: { partyA, partyB },
    finalHtml: `<p>甲方：${partyA}</p><p>乙方：${partyB}</p>`,
    status,
    versionIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt
  };
}

// 三条实例 updatedAt 互不相同：故障索引本身不干扰种子写入
const SEED_INSTANCES = [
  makeInstance('inst_draft_a', 'draft', '2026-01-01T00:00:01.000Z', '值A1', '值B1'),
  makeInstance('inst_draft_b', 'draft', '2026-01-01T00:00:02.000Z', '值A2', '值B2'),
  makeInstance('inst_final', 'finalized', '2026-01-01T00:00:03.000Z', '值A3', '值B3')
];
const DRAFT_IDS = ['inst_draft_a', 'inst_draft_b'];

/* -------------------------------- 断言工具 -------------------------------- */

let passed = 0;
let failed = 0;
function check(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? `\n    ${detail}` : ''}`);
  }
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const byId = (a, b) => a.id.localeCompare(b.id);

/** 计划与落库各自盖 updatedAt 时间戳，语义比较时归一化；其余字段（变量名/正文/键值/finalHtml）严格比较。 */
function normalizeRecord(record) {
  return { ...record, updatedAt: '<ts>' };
}

/* -------------------------------- 环境准备 -------------------------------- */

function findDepsLib() {
  // Debian usrmerge 布局下，库可能解压到 lib/usr/lib/<triplet> 或 lib/lib/<triplet>
  const roots = [join(TEST_DIR, '.deps', 'lib', 'usr', 'lib'), join(TEST_DIR, '.deps', 'lib', 'lib')];
  const dirs = [];
  for (const base of roots) {
    if (!existsSync(base)) {
      continue;
    }
    for (const entry of readdirSync(base)) {
      dirs.push(join(base, entry));
    }
  }
  return dirs.length ? dirs.join(':') : undefined;
}

async function bundleDriver(outdir) {
  const outfile = join(outdir, 'driver.js');
  await build({
    entryPoints: [join(TEST_DIR, 'driver.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"production"' },
    outfile,
    logLevel: 'silent'
  });
  return outfile;
}

function startServer(bundlePath) {
  const server = createServer((req, res) => {
    if (req.url === '/driver.js') {
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.end(readFileSync(bundlePath));
      return;
    }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html><head><meta charset="utf-8"><title>rename-tx</title></head><body></body></html>');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}/` }));
  });
}

async function loadDriver(page, baseUrl) {
  await page.goto(baseUrl);
  await page.addScriptTag({ url: '/driver.js' });
  await page.waitForFunction(() => Boolean(window.__renameTest));
}

async function deleteDatabase(page, dbName) {
  await page.evaluate(
    (name) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error(`deleteDatabase(${name}) 被打开的连接阻塞`));
      }),
    dbName
  );
}

/* ------------------------------ 场景一：回滚 ------------------------------ */

async function scenarioRollback(browser, baseUrl) {
  console.log('\n场景一：写入中途报错 → 模板与实例一起回滚');
  const page = await browser.newPage();
  await loadDriver(page, baseUrl);
  const DB_NAME = await page.evaluate(() => window.__renameTest.DB_NAME);

  // 故障注入：先于应用任何连接，预建 v1 库（与应用同 schema）并对
  // instances.updatedAt 加唯一索引。应用 openDB(1) 版本相等不触发 upgrade，直接复用该 schema。
  await page.evaluate((name) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of ['templates', 'clauses', 'instances', 'versions']) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
        request.transaction.objectStore('instances').createIndex('qa_unique_updatedAt', 'updatedAt', { unique: true });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);

  // 探针先于任何写入安装；种子数据（模板 + 2 草稿 + 1 定稿）经应用真实连接落库
  await page.evaluate(() => window.__renameTest.installPutTap());
  await page.evaluate(
    ({ template, instances }) => {
      window.__renameTest.resetStores(template);
      return window.__renameTest.seedTemplate(template).then(() => window.__renameTest.seedInstances(instances));
    },
    { template: TEMPLATE, instances: SEED_INSTANCES }
  );
  const logStart = (await page.evaluate(() => window.__renameTest.getPutLog())).length;

  // 重命名计划会把两条草稿的 updatedAt 改成同一时间戳 → 第 2 条实例写入触发唯一索引冲突
  const result = await page.evaluate(() => window.__renameTest.rename('tpl_tx_test', 'var_1', 'employer'));
  check('重命名返回失败', result.ok === false, JSON.stringify(result));

  // 失败阶段定位：本事务的 put 探针序列 = 日志尾部
  const stageLog = (await page.evaluate(() => window.__renameTest.getPutLog())).slice(logStart);
  console.log('  写入阶段追踪（真实 IDBObjectStore.put 探针）：');
  for (const entry of stageLog) {
    const mark = entry.phase === 'success' ? '✓ 事务内成功（未提交）' : entry.phase === 'error' ? `✗ ${entry.error}` : '…';
    console.log(`    #${entry.seq} ${entry.store}/${entry.key} ${mark}`);
  }
  const failureEntry = stageLog.find((entry) => entry.phase === 'error');
  check(
    '失败阶段可定位：第 2 条实例写入触发 ConstraintError',
    Boolean(failureEntry) && failureEntry.store === 'instances' && failureEntry.key === 'inst_draft_b' && failureEntry.error === 'ConstraintError',
    JSON.stringify(failureEntry)
  );
  const succeededBefore = stageLog.filter((entry) => entry.phase === 'success');
  check(
    '失败前已有 templates 与 1 条实例在事务内写入成功（用于验证回滚）',
    succeededBefore.length === 2 && succeededBefore[0].store === 'templates' && succeededBefore[1].store === 'instances',
    JSON.stringify(succeededBefore)
  );
  console.log(`  → 失败阶段：${failureEntry?.store}/${failureEntry?.key}（${failureEntry?.error}），此前 ${succeededBefore.length} 条写入随事务回滚`);

  // 回读最终结果：模板与全部实例必须保持种子原样
  const readBack = await page.evaluate(() => window.__renameTest.readBack());
  const templateAfter = readBack.templates.find((item) => item.id === TEMPLATE.id);
  check(
    '回读：模板完全未变（正文占位符与变量定义均回滚）',
    stableStringify(templateAfter) === stableStringify(TEMPLATE),
    templateAfter && templateAfter.contentHtml
  );
  const instancesAfter = [...readBack.instances].sort(byId);
  check(
    '回读：两条草稿与定稿实例完全未变（含已在事务内写入成功的第 1 条草稿）',
    stableStringify(instancesAfter) === stableStringify([...SEED_INSTANCES].sort(byId)),
    JSON.stringify(instancesAfter.map((item) => [item.id, item.updatedAt, Object.keys(item.variableValues)]))
  );

  await page.close();
  return DB_NAME;
}

/* ------------------------------ 场景二：并发 ------------------------------ */

async function scenarioConcurrency(browser, baseUrl, dbName) {
  console.log('\n场景二：两个页面同时提交重命名 → 只有一个结果完整落库');

  // 干净库（无故障索引）：删掉场景一的库，由应用连接按自身 schema 重建
  const wiper = await browser.newPage();
  await wiper.goto(baseUrl);
  await deleteDatabase(wiper, dbName);
  await wiper.close();

  const page1 = await browser.newPage();
  const page2 = await browser.newPage();
  await loadDriver(page1, baseUrl);
  await loadDriver(page2, baseUrl);

  // 共享时钟：两个页面都从 node 进程取同一时间源的微秒级时间戳，
  // 避免页面各自 Date.now() 的毫秒精度把真实重叠误判成串行。
  await page1.exposeFunction('__sharedNow', () => performance.now());
  await page2.exposeFunction('__sharedNow', () => performance.now());

  // 预算两个完整计划（纯函数，不写库），作为「完整落库」的判定基准
  const planA = await page1.evaluate(
    ({ template, instances }) => window.__renameTest.plan(template, instances, 'var_1', 'employer'),
    { template: TEMPLATE, instances: SEED_INSTANCES }
  );
  const planB = await page2.evaluate(
    ({ template, instances }) => window.__renameTest.plan(template, instances, 'var_2', 'employee'),
    { template: TEMPLATE, instances: SEED_INSTANCES }
  );
  check('两个重命名计划各自合法', planA.ok === true && planB.ok === true);

  const bundleOf = (template, instances) =>
    stableStringify({
      template: normalizeRecord(template),
      drafts: instances.filter((item) => DRAFT_IDS.includes(item.id)).map(normalizeRecord).sort(byId)
    });
  const bundleA = bundleOf(planA.template, planA.instances);
  const bundleB = bundleOf(planB.template, planB.instances);

  for (let round = 1; round <= ROUNDS; round += 1) {
    // 每轮重置为同一种子：库内记录与两个页面的内存态都回到原样
    await page1.evaluate(
      ({ template, instances }) => {
        window.__renameTest.resetStores(template);
        return window.__renameTest.seedTemplate(template).then(() => window.__renameTest.seedInstances(instances));
      },
      { template: TEMPLATE, instances: SEED_INSTANCES }
    );
    await page2.evaluate(({ template }) => window.__renameTest.resetStores(template), { template: TEMPLATE });

    // 同时提交：Promise.all 并发派发，不做任何串行化；时间戳取自 node 共享时钟
    const [resA, resB] = await Promise.all([
      page1.evaluate(async () => {
        const t0 = await window.__sharedNow();
        const outcome = await window.__renameTest.rename('tpl_tx_test', 'var_1', 'employer');
        const t1 = await window.__sharedNow();
        return { outcome, t0, t1 };
      }),
      page2.evaluate(async () => {
        const t0 = await window.__sharedNow();
        const outcome = await window.__renameTest.rename('tpl_tx_test', 'var_2', 'employee');
        const t1 = await window.__sharedNow();
        return { outcome, t0, t1 };
      })
    ]);

    const overlap = resA.t0 < resB.t1 && resB.t0 < resA.t1;
    check(`第 ${round} 轮：两次提交时间窗真实重叠（非串行）`, overlap, `A[${resA.t0},${resA.t1}] B[${resB.t0},${resB.t1}]`);
    check(`第 ${round} 轮：两个事务各自提交成功`, resA.outcome.ok === true && resB.outcome.ok === true, JSON.stringify([resA.outcome, resB.outcome]));

    // 回读最终结果：必须完整等于其中一个计划，且另一个计划不留任何痕迹
    const final = await page1.evaluate(() => window.__renameTest.readBack());
    const finalTemplate = final.templates.find((item) => item.id === TEMPLATE.id);
    const finalBundle = bundleOf(finalTemplate, final.instances);
    const matchA = finalBundle === bundleA;
    const matchB = finalBundle === bundleB;
    check(
      `第 ${round} 轮：落库结果完整等于且仅等于一个计划`,
      matchA !== matchB,
      `matchA=${matchA} matchB=${matchB}；实际变量名=[${finalTemplate.variables.map((v) => v.name)}]，草稿键=${JSON.stringify(
        final.instances.filter((item) => DRAFT_IDS.includes(item.id)).map((d) => Object.keys(d.variableValues))
      )}`
    );

    const loserName = matchA ? 'employee' : 'employer';
    const winnerName = matchA ? 'employer' : 'employee';
    const finalJson = JSON.stringify(final);
    check(
      `第 ${round} 轮：败者（${loserName}）在模板与实例中无任何残留，胜者（${winnerName}）完整可见`,
      !finalJson.includes(loserName) && finalJson.includes(winnerName)
    );

    const finalInstance = final.instances.find((item) => item.id === 'inst_final');
    check(
      `第 ${round} 轮：定稿实例保持原样`,
      stableStringify(finalInstance) === stableStringify(SEED_INSTANCES.find((item) => item.id === 'inst_final'))
    );
  }

  // 清理：关闭两个页面各自的应用连接后删除数据库
  await page1.evaluate(() => window.__renameTest.closeDb());
  await page2.evaluate(() => window.__renameTest.closeDb());
  await deleteDatabase(page1, dbName);
  const remaining = await page1.evaluate(() => indexedDB.databases());
  check('清理：测试数据库已删除', !remaining.some((db) => db.name === dbName), JSON.stringify(remaining));

  await page1.close();
  await page2.close();
}

/* --------------------------------- 主流程 --------------------------------- */

async function main() {
  const workdir = mkdtempSync(join(tmpdir(), 'rename-tx-test-'));
  let browser;
  let server;

  try {
    const bundlePath = await bundleDriver(workdir);
    const started = await startServer(bundlePath);
    server = started.server;

    const env = { ...process.env };
    const depsLib = findDepsLib();
    if (depsLib) {
      env.LD_LIBRARY_PATH = [depsLib, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
    }
    browser = await chromium.launch({ env });

    // 预清理：保证套件可重复运行（上次异常退出不留残骸）
    const preClean = await browser.newPage();
    await preClean.goto(started.baseUrl);
    await deleteDatabase(preClean, 'contract-template-editor').catch(() => {});
    await preClean.close();

    const dbName = await scenarioRollback(browser, started.baseUrl);
    await scenarioConcurrency(browser, started.baseUrl, dbName);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.close();
    }
    rmSync(workdir, { recursive: true, force: true });
  }

  console.log(`\n结果：${passed} 通过，${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('测试执行异常：', error);
  process.exit(1);
});
