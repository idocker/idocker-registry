import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const js = readFileSync(resolve(root, 'assets/app.js'), 'utf8');

const problems = [];

// 1) data-i18n 键 vs EN 字典键
const htmlKeys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
const enBlock = js.slice(js.indexOf('var EN = {'), js.indexOf('/* ---', js.indexOf('var EN = {')));
const enKeys = [...enBlock.matchAll(/'([a-z0-9_.]+)':/gi)].map((m) => m[1]);

// 键可被多处复用（如 common.copy、nav.*），重复不算问题；只要求两边集合一致。
const missingInEn = [...new Set(htmlKeys)].filter((k) => !enKeys.includes(k));
const unusedInEn = [...new Set(enKeys)].filter((k) => !htmlKeys.includes(k));

if (missingInEn.length) problems.push('EN 字典缺少键: ' + missingInEn.join(', '));
if (unusedInEn.length) problems.push('EN 字典多余键: ' + unusedInEn.join(', '));

// 2) 锚点链接 vs id
const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const deadAnchors = [...new Set(hrefs)].filter((h) => !ids.includes(h));
if (deadAnchors.length) problems.push('无对应 id 的锚点: ' + deadAnchors.join(', '));

// 3) 引用的本地资源是否存在
const refs = [...html.matchAll(/(?:src|href)="((?!https?:|#)[^"]+)"/g)].map((m) => m[1]);
const missingFiles = refs.filter((r) => !existsSync(resolve(root, r)));
if (missingFiles.length) problems.push('缺失的资源文件: ' + missingFiles.join(', '));

// 4) 结构性检查
for (const pair of [
  ['<main', '</main>'],
  ['<header', '</header>'],
  ['<footer', '</footer>'],
  ['<body', '</body>'],
  ['<html', '</html>'],
]) {
  const open = (html.match(new RegExp(pair[0].replace('<', '<'), 'g')) || []).length;
  const close = (html.match(new RegExp(pair[1], 'g')) || []).length;
  if (open !== close) problems.push(`标签不配对: ${pair[0]} x${open} vs ${pair[1]} x${close}`);
}
const detailsOpen = (html.match(/<details>/g) || []).length;
const detailsClose = (html.match(/<\/details>/g) || []).length;
if (detailsOpen !== detailsClose) problems.push('details 标签不配对');

// 5) 语言切换必须覆盖 <html lang> 与按钮
if (!js.includes("document.documentElement.lang")) problems.push('app.js 未更新 <html lang>');
if (!/data-i18n/.test(js)) problems.push('app.js 未处理 data-i18n');
if (!/dark-theme/.test(js)) problems.push('app.js 未切换 dark-theme');

// 6) 不引用外部网络资源（脚本 / 样式 / 图片 / 内嵌页），
//    页面里出现的 https 链接必须落在白名单域名内（页脚官方链接）。
const ALLOWED_HOSTS = ['idocker.vip', 'www.idocker.vip', 'github.com', 'hub.docker.com'];
const externalAssets = [];
for (const m of html.matchAll(/<link[^>]*href="(https?:[^\"]+)"/g)) externalAssets.push(m[1]);
for (const m of html.matchAll(/<(?:script|img|iframe|source)[^>]*src="(https?:[^\"]+)"/g))
  externalAssets.push(m[1]);
if (externalAssets.length) problems.push('引用了外部资源: ' + externalAssets.join(', '));

const stripped = html.replace(/<!--[\s\S]*?-->/g, '');
const links = [...stripped.matchAll(/https?:\/\/[^"'\s)]+/g)].map((m) => m[0]);
const unknownLinks = [...new Set(links)].filter((u) => {
  try {
    return !ALLOWED_HOSTS.includes(new URL(u).host);
  } catch {
    return true;
  }
});
if (unknownLinks.length) problems.push('出现白名单外的外部链接: ' + unknownLinks.join(', '));

console.log('data-i18n 键数量:', new Set(htmlKeys).size);
console.log('EN 字典键数量:', new Set(enKeys).size);
console.log('锚点数量:', new Set(hrefs).size, '| id 数量:', ids.length);

// 7) CSS：括号配对 + 变量引用必须有定义
const css = readFileSync(resolve(root, 'assets/styles.css'), 'utf8');
const openBraces = (css.match(/{/g) || []).length;
const closeBraces = (css.match(/}/g) || []).length;
if (openBraces !== closeBraces) {
  problems.push(`styles.css 花括号不配对: { x${openBraces} vs } x${closeBraces}`);
}
const defined = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]));
const undefinedVars = [...used].filter((v) => !defined.has(v));
if (undefinedVars.length) {
  problems.push('styles.css 引用了未定义的 CSS 变量: ' + undefinedVars.join(', '));
}
console.log('CSS 变量: 定义', defined.size, '| 引用', used.size);

if (problems.length) {
  console.log('\n发现问题:');
  problems.forEach((p) => console.log('  ✗', p));
  process.exit(1);
}
console.log('\n✓ 全部检查通过');
