#!/usr/bin/env node
/**
 * 测试环境准备：保证真实 Chromium 可用，不可用时直接失败。
 *
 * - playwright 由 frontend/package.json 的 devDependencies 声明（npm install 即得）；
 * - 浏览器缺失时自动执行 `playwright install chromium`；
 * - Linux 无 root 环境缺系统库时，自动用 apt 下载 deb 并解压到
 *   node_modules/.cache/rename-transaction-deps/（node_modules 不入提交）；
 * - 最终以真实启动一次浏览器作为验收，任何一步失败都抛出带修复指引的错误。
 *
 * 既可被 run.mjs 引用，也可单独执行：node tests/rename-transaction/ensure-ready.mjs
 */
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = resolve(TEST_DIR, '..', '..');

/** 环境文件统一放在 node_modules/.cache 下，随 node_modules 一起被忽略、不进入提交。 */
export const DEPS_CACHE_DIR = join(FRONTEND_DIR, 'node_modules', '.cache', 'rename-transaction-deps');

const require = createRequire(import.meta.url);

/** Debian bookworm 下 Chromium 常见缺失库 → 包名（含 libcups2 的传递依赖族）。 */
const LIB_PACKAGE_MAP = {
  'libnspr4.so': 'libnspr4',
  'libnss3.so': 'libnss3',
  'libnssutil3.so': 'libnss3',
  'libsmime3.so': 'libnss3',
  'libatk-1.0.so.0': 'libatk1.0-0',
  'libatk-bridge-2.0.so.0': 'libatk-bridge2.0-0',
  'libatspi.so.0': 'libatspi2.0-0',
  'libXcomposite.so.1': 'libxcomposite1',
  'libXdamage.so.1': 'libxdamage1',
  'libXfixes.so.3': 'libxfixes3',
  'libXrandr.so.2': 'libxrandr2',
  'libXi.so.6': 'libxi6',
  'libasound.so.2': 'libasound2',
  'libgbm.so.1': 'libgbm1',
  'libxkbcommon.so.0': 'libxkbcommon0',
  'libdbus-1.so.3': 'libdbus-1-3',
  'libdrm.so.2': 'libdrm2',
  'libwayland-server.so.0': 'libwayland-server0',
  'libxcb.so.1': 'libxcb1',
  'libX11.so.6': 'libx11-6',
  'libXext.so.6': 'libxext6',
  'libXtst.so.6': 'libxtst6',
  'libexpat.so.1': 'libexpat1',
  'libglib-2.0.so.0': 'libglib2.0-0',
  'libcups.so.2': 'libcups2',
  'libavahi-client.so.3': 'libavahi-client3',
  'libavahi-common.so.3': 'libavahi-common3',
  'libgnutls.so.30': 'libgnutls30',
  'libz.so.1': 'zlib1g',
  'libp11-kit.so.0': 'libp11-kit0',
  'libtasn1.so.6': 'libtasn1-6',
  'libhogweed.so.6': 'libhogweed6',
  'libnettle.so.8': 'libnettle8',
  'libgmp.so.10': 'libgmp10',
  'libffi.so.8': 'libffi8',
  'libpcre2-8.so.0': 'libpcre2-8-0',
  'libselinux.so.1': 'libselinux1',
  'libgcrypt.so.20': 'libgcrypt20',
  'libgpg-error.so.0': 'libgpg-error0',
  'libsystemd.so.0': 'libsystemd0',
  'liblzma.so.5': 'liblzma5',
  'libzstd.so.1': 'libzstd1',
  'liblz4.so.1': 'liblz4-1',
  'libcap.so.2': 'libcap2'
};

function log(message) {
  console.log(`[ensure-ready] ${message}`);
}

function fail(message) {
  throw new Error(`[ensure-ready] ${message}`);
}

/** 依赖库缓存目录下所有 <triplet> 库目录，拼成 LD_LIBRARY_PATH 用的冒号串。 */
export function depsLibraryPath() {
  const roots = [join(DEPS_CACHE_DIR, 'lib', 'usr', 'lib'), join(DEPS_CACHE_DIR, 'lib', 'lib')];
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

/** 启动浏览器用的环境变量：存在本地依赖库时注入 LD_LIBRARY_PATH。 */
export function chromiumEnv() {
  const env = { ...process.env };
  const deps = depsLibraryPath();
  if (deps) {
    env.LD_LIBRARY_PATH = [deps, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  }
  return env;
}

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    fail('未找到 playwright 依赖，请先在 frontend/ 执行 npm install（playwright 已声明在 devDependencies）');
  }
}

function playwrightCliPath() {
  try {
    return require.resolve('playwright/cli');
  } catch {
    return join(dirname(require.resolve('playwright/package.json')), 'cli.js');
  }
}

async function tryLaunch(chromium) {
  const browser = await chromium.launch({ env: chromiumEnv() });
  await browser.close();
}

function isMissingBrowser(error) {
  return /Executable doesn't exist|browser has not been downloaded/i.test(String(error?.message ?? error));
}

function isMissingSharedLibs(error) {
  return /error while loading shared libraries/i.test(String(error?.message ?? error));
}

function installChromium() {
  log('未检测到浏览器，执行 playwright install chromium ...');
  try {
    execFileSync(process.execPath, [playwrightCliPath(), 'install', 'chromium'], { stdio: 'inherit' });
  } catch (error) {
    fail(`浏览器下载失败：${error.message}\n可手动执行：npx playwright install chromium`);
  }
}

function missingSharedLibs(executable) {
  let output;
  try {
    output = execFileSync('ldd', [executable], { env: chromiumEnv(), encoding: 'utf8' });
  } catch {
    return [];
  }
  return [...new Set([...output.matchAll(/^\s*(\S+) => not found/gm)].map((match) => match[1]))];
}

/**
 * 无 root 的 Debian/Ubuntu 环境：apt 下载 deb 包并本地解压到 DEPS_CACHE_DIR。
 * 有 root 或已装齐系统库的环境不会走到这里（启动校验已通过）。
 */
function setupLinuxDeps(executable) {
  if (process.platform !== 'linux') {
    fail('浏览器因缺少系统库无法启动，请按 playwright 提示安装系统依赖（npx playwright install --with-deps chromium）');
  }
  for (const tool of ['apt-get', 'dpkg-deb']) {
    try {
      execFileSync(tool, ['--version'], { stdio: 'ignore' });
    } catch {
      fail(`缺少 ${tool}，无法自动补齐系统库；请手动安装 Chromium 系统依赖（参考 npx playwright install --with-deps chromium）`);
    }
  }

  const aptState = join(DEPS_CACHE_DIR, 'apt');
  const debsDir = join(DEPS_CACHE_DIR, 'debs');
  const libDir = join(DEPS_CACHE_DIR, 'lib');
  for (const dir of [join(aptState, 'lists', 'partial'), join(aptState, 'cache', 'archives', 'partial'), debsDir, libDir]) {
    mkdirSync(dir, { recursive: true });
  }
  const aptOpts = [
    `-o`,
    `Dir::State::Lists=${join(aptState, 'lists')}`,
    `-o`,
    `Dir::Cache=${join(aptState, 'cache')}`,
    `-o`,
    `Dir::Cache::archives=${join(aptState, 'cache', 'archives')}`
  ];

  log('更新 apt 索引（用户态目录，无需 root）...');
  execFileSync('apt-get', [...aptOpts, `-o`, `Dir::State::status=/var/lib/dpkg/status`, 'update'], { stdio: 'inherit' });

  // 依赖的依赖可能继续缺，最多补 3 轮
  for (let round = 1; round <= 3; round += 1) {
    const missing = missingSharedLibs(executable);
    if (!missing.length) {
      return;
    }
    const unknown = missing.filter((lib) => !LIB_PACKAGE_MAP[lib]);
    if (unknown.length) {
      fail(`以下系统库缺失且未内置映射，无法自动补齐：${unknown.join(', ')}\n请手动安装对应系统包后重试`);
    }
    const packages = [...new Set(missing.map((lib) => LIB_PACKAGE_MAP[lib]))];
    log(`第 ${round} 轮补齐系统库：${packages.join(' ')}`);
    execFileSync('apt-get', [...aptOpts, 'download', ...packages], { cwd: debsDir, stdio: 'inherit' });
    for (const deb of readdirSync(debsDir).filter((file) => file.endsWith('.deb'))) {
      execFileSync('dpkg-deb', ['-x', join(debsDir, deb), libDir]);
    }
    rmSync(debsDir, { recursive: true, force: true });
    mkdirSync(debsDir, { recursive: true });
  }

  const remaining = missingSharedLibs(executable);
  if (remaining.length) {
    fail(`系统库仍缺失：${remaining.join(', ')}，请手动安装后重试`);
  }
}

/**
 * 环境就绪则返回 playwright 的 chromium；任何准备步骤失败都抛错（测试随之直接失败）。
 */
export async function ensureReady() {
  const { chromium } = loadPlaywright();

  try {
    await tryLaunch(chromium);
    return chromium;
  } catch (firstError) {
    if (isMissingBrowser(firstError)) {
      installChromium();
    } else if (!isMissingSharedLibs(firstError)) {
      throw firstError;
    }
  }

  try {
    await tryLaunch(chromium);
    return chromium;
  } catch (secondError) {
    if (!isMissingSharedLibs(secondError)) {
      throw secondError;
    }
    log('浏览器缺系统库，尝试自动补齐 ...');
    setupLinuxDeps(chromium.executablePath());
  }

  try {
    await tryLaunch(chromium);
    return chromium;
  } catch (thirdError) {
    fail(
      `浏览器仍无法启动：${thirdError.message}\n` +
        '请检查环境后重试；准备工作已自动尝试过：安装浏览器、补齐系统库。'
    );
  }
}

/* ------------------------------ 命令行入口 ------------------------------ */

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  ensureReady()
    .then(() => console.log('[ensure-ready] 环境就绪：playwright + Chromium 可用'))
    .catch((error) => {
      console.error(error.message ?? error);
      process.exit(1);
    });
}
