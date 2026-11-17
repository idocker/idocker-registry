/* 运行时验证：在 Node 中用最小 DOM stub 实际执行 assets/app.js，
   验证语言切换往返、主题循环、控制台链接注入，而不是只做静态检查。
   用法：node web/.runtime-check.mjs                                        */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '.');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const code = readFileSync(resolve(root, 'assets/app.js'), 'utf8');

const fails = [];
const ok = (cond, msg) => (cond ? null : fails.push(msg));

/* ---------- 从真实 HTML 提取 data-i18n 节点与初值（按标签深度精确配对） ---------- */
const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'base']);

function extractI18nNodes(source) {
  const out = [];
  const openRe = /<([a-z0-9]+)([^>]*?)data-i18n="([^"]+)"([^>]*?)>/gi;
  let m;
  while ((m = openRe.exec(source))) {
    const contentStart = m.index + m[0].length;
    const tagRe = /<(\/?)([a-z0-9]+)([^>]*?)(\/?)>/gi;
    tagRe.lastIndex = contentStart;
    let depth = 1;
    let t;
    let end = source.length;
    while ((t = tagRe.exec(source))) {
      const isClose = t[1] === '/';
      const name = t[2].toLowerCase();
      const selfClosed = t[4] === '/' || VOID.has(name);
      if (isClose) {
        depth -= 1;
      } else if (!selfClosed) {
        depth += 1;
      }
      if (depth === 0) {
        end = t.index;
        break;
      }
    }
    out.push({ key: m[3], initial: source.slice(contentStart, end).trim() });
    openRe.lastIndex = end;
  }
  return out;
}

const nodes = extractI18nNodes(html);
const rawCount = (html.match(/data-i18n="/g) || []).length;
ok(
  nodes.length === rawCount,
  `节点提取数(${nodes.length})与 HTML 中 data-i18n 出现次数(${rawCount})不一致`
);
const enBlock = code.slice(code.indexOf('var EN = {'), code.indexOf('/* ---', code.indexOf('var EN = {')));
const enKeys = new Set([...enBlock.matchAll(/'([a-z0-9_.]+)':/gi)].map((m) => m[1]));
const nodeKeys = new Set(nodes.map((n) => n.key));
ok(
  nodeKeys.size === enKeys.size,
  `唯一键数(${nodeKeys.size})应与 EN 字典键数(${enKeys.size})一致`
);
const noEn = [...nodeKeys].filter((k) => !enKeys.has(k));
ok(noEn.length === 0, `缺少 EN 翻译的键: ${noEn.join(', ')}`);

/* ---------- 最小 DOM ---------- */
class ClassList {
  constructor() { this.set = new Set(); }
  toggle(name, force) {
    const want = force === undefined ? !this.set.has(name) : force;
    want ? this.set.add(name) : this.set.delete(name);
    return want;
  }
  add(n) { this.set.add(n); }
  contains(n) { return this.set.has(n); }
}

class El {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.classList = new ClassList();
    this.listeners = {};
    this._html = '';
    this._text = '';
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v); }
  get textContent() { return this._text; }
  set textContent(v) { this._text = String(v); }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  dispatch(t) { (this.listeners[t] || []).forEach((fn) => fn({ target: this })); }
  querySelector() { return null; }
  appendChild() {}
  removeChild() {}
  select() {}
}

const i18nEls = nodes.map(({ key, initial }) => {
  const el = new El('p');
  el.setAttribute('data-i18n', key);
  el._html = initial;
  return el;
});

const byId = {
  langToggle: new El('button'),
  themeToggle: new El('button'),
  menuToggle: new El('button'),
  siteNav: new El('nav'),
  consoleLink: new El('a'),
  consoleLinkBottom: new El('a'),
};
byId.siteNav.querySelectorAll = () => [];

const body = new El('body');
const documentElement = new El('html');

const document = {
  readyState: 'complete',
  body,
  documentElement,
  querySelectorAll: (sel) => {
    if (sel === '[data-i18n]') return i18nEls;
    if (sel === '.copy-btn') return [];
    return [];
  },
  getElementById: (id) => byId[id] || null,
  querySelector: () => null,
  createElement: (t) => new El(t),
  addEventListener: () => {},
  execCommand: () => true,
};

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const ctx = {
  document,
  localStorage,
  navigator: {},
  console,
  Map,
  Set,
  Array,
  Object,
  String,
  JSON,
  setTimeout: () => 0,
  window: {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
    setTimeout: () => 0,
  },
};
ctx.window.document = document;
ctx.window.localStorage = localStorage;

vm.createContext(ctx);
try {
  vm.runInContext(code, ctx, { filename: 'app.js' });
} catch (err) {
  console.error('app.js 执行失败:', err.message);
  process.exit(1);
}

/* ---------- 1. 初始化状态 ---------- */
ok(byId.langToggle.textContent === 'EN', `初始语言按钮应为 EN，实际 ${byId.langToggle.textContent}`);
ok(documentElement.lang === 'zh-CN', `初始 <html lang> 应为 zh-CN，实际 ${documentElement.lang}`);
ok(documentElement.attributes['data-theme'] === 'auto', '初始 data-theme 应为 auto');
ok(byId.consoleLink.getAttribute('href') === 'https://idocker.vip', '控制台链接未注入');
ok(byId.consoleLinkBottom.getAttribute('href') === 'https://idocker.vip', '底部控制台链接未注入');

/* ---------- 2. 切到英文 ---------- */
byId.langToggle.dispatch('click');
const enTitle = i18nEls.find((e) => e.getAttribute('data-i18n') === 'hero.title').innerHTML;ok(
  enTitle === 'Enterprise Docker Registry Management Platform',
  `英文 hero.title 不正确: "${enTitle}"`
);
ok(documentElement.lang === 'en', `<html lang> 应更新为 en，实际 ${documentElement.lang}`);
ok(byId.langToggle.textContent === '中文', '英文态下按钮应显示「中文」');
ok(store.get('idocker-web-locale') === 'en', '语言偏好未持久化');

const stillChineseInEn = i18nEls.filter(
  (e) => /[\u4e00-\u9fa5]/.test(e.innerHTML) && e.getAttribute('data-i18n') !== 'nav.console'
);
ok(
  stillChineseInEn.length === 0,
  `切到英文后仍有 ${stillChineseInEn.length} 个节点残留中文: ` +
    stillChineseInEn.map((e) => e.getAttribute('data-i18n')).slice(0, 5).join(', ')
);

/* ---------- 3. 切回中文，必须逐字还原 ---------- */
byId.langToggle.dispatch('click');
const drifted = i18nEls.filter((e, i) => e.innerHTML !== nodes[i].initial);
ok(drifted.length === 0, `切回中文后有 ${drifted.length} 个节点未还原: ` +
  drifted.map((e) => e.getAttribute('data-i18n')).slice(0, 5).join(', '));
ok(documentElement.lang === 'zh-CN', '切回中文后 <html lang> 未还原');
ok(store.get('idocker-web-locale') === 'zh', '中文偏好未持久化');

/* ---------- 4. 主题三态循环 auto → light → dark → auto ---------- */
const themeSeq = [];
byId.themeToggle.dispatch('click');
themeSeq.push([documentElement.attributes['data-theme'], body.classList.contains('dark-theme')]);
byId.themeToggle.dispatch('click');
themeSeq.push([documentElement.attributes['data-theme'], body.classList.contains('dark-theme')]);
byId.themeToggle.dispatch('click');
themeSeq.push([documentElement.attributes['data-theme'], body.classList.contains('dark-theme')]);

const expected = [
  ['light', false],
  ['dark', true],
  ['auto', false],
];
expected.forEach((exp, i) => {
  ok(
    themeSeq[i][0] === exp[0] && themeSeq[i][1] === exp[1],
    `主题第 ${i + 1} 次点击应为 ${exp[0]}/dark=${exp[1]}，实际 ${themeSeq[i][0]}/dark=${themeSeq[i][1]}`
  );
});
ok(store.get('theme') === 'auto', '主题偏好未持久化到 localStorage.theme');
ok(byId.themeToggle.getAttribute('title').includes('跟随系统'), '主题按钮 title 未反映当前模式');

/* ---------- 5. 资源文件就位 ---------- */
for (const f of ['assets/logo.png', 'assets/idocker.png', 'assets/favicon.svg', 'assets/styles.css']) {
  ok(existsSync(resolve(root, f)), `缺少资源: ${f}`);
}

/* ---------- 结果 ---------- */
console.log(`已执行 app.js，检查 ${i18nEls.length} 个 i18n 节点 + 主题/链接行为`);
console.log('主题序列:', themeSeq.map(([t, d]) => `${t}${d ? '(dark)' : ''}`).join(' → '));
if (fails.length) {
  console.log('\n失败项:');
  fails.forEach((f) => console.log('  ✗', f));
  process.exit(1);
}
console.log('\n✓ 运行时行为全部通过');
