# iDocker Registry 产品网站 — 规划说明

> 本文件是 `web/` 产品站的规划底稿：写清信息架构、每一条事实的来源，
> 以及仍需决策的取舍。所有内容均取自仓库内的 `README.md`、`AGENTS.md`、
> `DEVELOPMENT_REFERENCE.md` 与源码，**没有引入外部事实**。

## 1. 目标与受众

- **目标**：给 iDocker Registry 一个对外/对内可用的产品介绍页，能直接部署为静态站点。
- **主要受众**：准备自建镜像仓库的研发/运维团队；以及内部同事（拿它当一页式速查）。
- **转化动作**：打开 Web 控制台；或按「快速开始」把 `docker login / pull / push` 跑通。
- **非目标**：不做登录态、不调 `/api`、不替代已有 SPA。这是**纯静态**介绍页。

## 2. 页面信息架构

单页锚点式结构，导航与区块一一对应：

1. **顶栏** — logo、6 个锚点导航、语言切换、主题切换、进入控制台
2. **Hero** — 一句话定位 + 三条 Docker 命令示例
3. **核心特性** — 8 张卡片
4. **三层架构** — 命名空间 / 项目 / 仓库 + 镜像路径规则 + default 项目保护说明
5. **角色与权限** — 4 角色对照表 + 仓库成员机制说明
6. **快速开始** — 登录 / 拉取 / 推送三步（可复制）+ 自托管部署 + 默认管理员提示
7. **技术栈** — 前后端技术标签 + REST API 端点表
8. **常见问题** — 6 条 FAQ（`<details>` 折叠）
9. **结语 CTA + 页脚** — 版本、许可证

## 3. 内容 → 事实来源对照

| 站点内容 | 来源 |
|---|---|
| 产品定位「企业级 Docker 镜像仓库管理平台」 | `README.md` 概述首段 |
| 三层架构（命名空间 → 项目 → 仓库） | `README.md` 核心特性表；`AGENTS.md` 第 4 节 |
| 命名空间「不参与镜像仓库路径」 | `AGENTS.md` 第 6 节「URL 中仓库名称格式」 |
| default 项目单段路径、全员可拉、推送限管理员/成员 | `AGENTS.md` 第 6 节；`README.md` 镜像拉取与推送 |
| default 不可删除/改名/停用 | `AGENTS.md` 第 6 节受保护资源说明 |
| 4 系统角色与 Docker 动作 | `README.md` 角色体系表；`AGENTS.md` 第 4 节 |
| 仓库成员是 Docker 权限唯一来源；角色枚举 | `AGENTS.md` 第 4 节「仓库级成员」 |
| push 即时同步、最新标签自动同步为 latest | `README.md` 镜像拉取与推送注记；`AGENTS.md` 第 6 节 |
| 审计日志（搜索 / 筛选 / 导出 / 清理） | `README.md` 核心特性表；路由清单 `/api/audit/*` |
| 中英双语、浅色/深色/跟随系统 | `README.md` 核心特性表；`AGENTS.md` 前端「主题系统」 |
| 技术栈标签 | `README.md` 技术栈表 |
| REST API 端点表 | `README.md` API 概览 |
| `docker login idocker.vip` 与镜像路径示例 | `README.md` 镜像拉取与推送 |
| 部署命令 `docker build -t idocker-registry:1.0.2 .` / `docker compose up -d` | `README.md` 生产环境；根 `docker-compose.yaml` |
| 默认命名空间 `default`、默认管理员账号 `admin` | `README.md` 默认账号；`AGENTS.md` 第 5 节 |
| 密码规则（≥6 位且至少 1 个特殊符号） | `AGENTS.md` 第 6 节 |
| 时区 Asia/Shanghai / UTC 存储 / 浏览器时区展示 | `AGENTS.md` 第 6 节 |
| 非 admin 不能靠 push 创建新仓库 | `AGENTS.md` 第 6 节 ⚠️ 条目 |
| 标签可删除（内部 registry 已开启 delete） | `AGENTS.md` 第 6 节内部 registry 配置 |
| 许可证 MIT | `README.md` 文末 |
| 版本号 v1.2.21 | `idocker-registry-ui/package.json` 的 `version`（UI 页脚同源） |
| 品牌色 / logo / 图标 | `idocker-registry-ui/src/styles/variables.scss`、`src/assets/{logo,idocker}.png` |
| 页脚官方链接：GitHub / Docker Hub / 官网 | 项目方提供（源码 <https://github.com/idocker/idocker-registry>、镜像 `idockervip/idocker-registry:2.0.4`、主页 <https://www.idocker.vip>） |

## 4. 刻意的取舍（需要你确认的点）

1. **不展示默认密码明文。**
   站点只写「默认管理员账号 `admin`」并提示立即改密，凭据指向部署文档。
   理由：`admin123` 出现在 `README.md` 里是内部文档语境，公网产品页展示等同于公布默认口令。
   若这是纯内网站点、希望图省事直接写出来，改 `web/index.html` 的 `qs.accountDesc` 即可。

2. **控制台地址按 `https://idocker.vip` 处理。**
   仓库里唯一出现的对外域名就是它（`docker login idocker.vip`），但**Web 控制台的实际端口**
   在源码区无法验证（`AGENTS.md` 记载线上映射 `7588:7518`，且注明该节未在源码区复现）。
   若控制台另有地址，只改 `web/assets/app.js` 顶部的 `CONSOLE_URL` 一处。

3. **版本号取 UI 的 `1.2.21`，不取镜像 tag `1.0.2`。**
   两者在仓库中本就不一致（`AGENTS.md` 已标注），页脚展示的是产品版本，
   与 UI 页脚保持同源。发布新前端版本时同步这个数字。

4. **零依赖静态实现，不引入第二套构建。**
   理由：站点是纯展示页，用 Vite/Vue 会带来第二条依赖与构建链；同时仓库里
   `docker-compose.dev.yaml` 缺失、多个 npm 脚本失效，新增构建面只会增加维护成本。
   代价：语言文案需要手写 `data-i18n`，不像 vue-i18n 那样集中。

5. **不引用任何 CDN。**
   字体走系统字体栈，图标用内联 SVG，logo/图标从 UI 资源目录复制而来。
   这样离线、内网、air-gapped 环境都能打开（项目构建环境本身网络受限）。

6. **不写「关于我们 / 定价 / 客户案例」等无据可依的内容。**
   规划里明确不虚构公司信息、团队规模、性能数字与客户 logo。

## 5. 未决 / 后续可做

- [ ] 控制台真实地址确认后填入 `CONSOLE_URL`
- [ ] 若需要英文版 SEO，可再拆 `index.en.html`（当前为同页 JS 切换，搜索引擎只索引中文）
- [ ] 截图：目前用命令行示例替代界面截图；如需真实截图，从运行中的实例导出
      （`README.md` 引用的 `idocker-registry-ui/src/assets/` 内暂无界面截图）
- [ ] 接入 CI 时把 `web/` 发布到静态托管或并入后端 `express.static`

## 6. 与仓库的关系

`web/` 已纳入版本库（早先被根目录 `.gitignore` 忽略，现已解除）：站点源码与本文档
都随仓库一起提交。它仍然是**独立于 SPA 的纯静态目录**，不进入前端构建链、不参与
Docker 镜像构建——发布时按上文第 5 节的方式单独托管或复制到后端 `public/`。
