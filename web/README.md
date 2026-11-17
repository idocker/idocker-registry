# web/ — iDocker Registry 产品网站

静态产品介绍页，零依赖、零构建：一个 HTML + 一个 CSS + 一个 JS，外加从 UI 复用的
logo / 图标位图。

> 规划底稿（信息架构、事实来源对照、取舍）见 [`PLAN.md`](./PLAN.md)。

## 本地预览

直接双击 `index.html` 即可（全部逻辑在本地，无需服务器）。
如需以 HTTP 方式预览：

```bash
cd web
python3 -m http.server 8080     # 然后打开 http://localhost:8080
# 或 npx serve .
```

## 文件结构

```
web/
├── index.html          # 单页站点：Hero / 特性 / 架构 / 权限 / 快速开始 / 技术栈 / FAQ
├── README.md           # 本文件
├── PLAN.md             # 规划：信息架构、内容来源对照、待决策项
├── .check.mjs          # 静态自检（i18n 键 / 锚点 / 资源 / 外链）
├── .runtime-check.mjs  # 运行时自检（用 DOM stub 实际执行 app.js）
└── assets/
    ├── styles.css      # 主题变量（浅色/深色）与响应式布局
    ├── app.js          # 语言切换、主题切换、复制命令、移动端导航
    ├── logo.png        # 复用 idocker-registry-ui/src/assets/logo.png
    ├── idocker.png     # 复用 idocker-registry-ui/src/assets/idocker.png
    └── favicon.svg     # 自绘品牌图标（仓库内 favicon.ico 是占位文件，未沿用）
```

## 常用改动位置

- **控制台地址**：`assets/app.js` 顶部的 `CONSOLE_URL`（默认 `https://idocker.vip`）
- **页脚官方链接**：`index.html` 页脚 `footer-official` 行（GitHub / Docker Hub / 官网），
  新增外链域名要同步加进 `.check.mjs` 的 `ALLOWED_HOSTS`
- **页脚版本号**：`index.html` 中 `web/index.html` 的 `v1.2.21`
- **中文文案**：直接写在 `index.html` 的 `data-i18n` 节点里（同时是中文源，无需另建字典）
- **英文文案**：`assets/app.js` 里的 `EN` 对象，键与 `data-i18n` 一一对应
- **配色**：`assets/styles.css` 顶部的 `:root`（浅色）与 `body.dark-theme`（深色），
  取值沿用产品 UI 的 `variables.scss`

## 主题与语言

- 主题三态：浅色 → 深色 → 跟随系统，点击顶栏图标循环切换，偏好存 `localStorage.theme`
  （与产品 UI 使用同一个键，通过 `body.dark-theme` 切换）。
- 语言：中文（默认）/ English，切换按钮在顶栏，偏好存 `localStorage['idocker-web-locale']`。
  切到英文时按 `data-i18n` 键替换节点；切回中文时还原 HTML 中缓存的原文。

## 自检

两个无依赖的 Node 脚本，改动页面后跑一遍即可：

```bash
cd /workspace/idocker-registry
git check-ignore -v web/index.html     # 确认仍在忽略范围内
node web/.check.mjs                    # 静态：i18n 键对齐、锚点、资源引用、标签配对、无外链
node web/.runtime-check.mjs            # 运行时：真实执行 app.js，验证语言往返/主题循环/链接注入
```

`.runtime-check.mjs` 用最小 DOM stub 在 Node 中执行 `assets/app.js`，覆盖：
112 个 `data-i18n` 节点切英文后无中文残留、切回中文逐字还原、主题
`auto → light → dark → auto` 循环、控制台链接注入。

> 未验证项：本环境无浏览器可用（`chromium`/`firefox` 均未安装，网络受限），
> 因此**未做真实渲染验证** —— 布局、CSS 主题切换后的视觉效果、移动端断点
> 均未在浏览器中看过。首次部署前请人工打开页面确认。

## 部署

站点是纯静态文件，任选一种：

```bash
# 1) 静态托管 / Nginx：把 web/ 整个目录作为站点根目录
# 2) 与后端同域：把 web/ 内容放进 server 的 public/ 目录（express.static 提供）
```

若要并入后端 `public/`，把 `web/` 内容复制过去即可（该目录已纳入版本库，直接从仓库取文件）。

## 注意

- 本目录**已纳入版本库**（早先被根 `.gitignore` 忽略，现已解除），改动随仓库一起提交。
- 页面不请求任何后端接口、不引用任何 CDN，离线环境可正常打开。
  页脚有三条纯导航外链（GitHub / Docker Hub / 官网），不加载任何远程资源；
  `.check.mjs` 对外链域名做白名单校验（`ALLOWED_HOSTS`）。
- 页面不含登录态与真实镜像数据，所有命令示例均可在产品 UI 与 README 中核对。
