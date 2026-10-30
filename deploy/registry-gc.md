# Registry 垃圾回收（GC）

> ⚠️ 本文档描述的是**运维动作**，不是应用功能。执行前请读完整篇。
> 文中 `docker-registry garbage-collect` 子命令**未在本源码工作区验证**（registry 二进制只存在于生产容器内），
> 上线前请先在容器里跑 `docker-registry --help` 确认该子命令存在。

## 为什么需要 GC

删除镜像走的是 registry 的 manifest 删除 API（`DELETE /v2/<name>/manifests/<digest>`），
它**只解除引用，不删除 blob 文件**。因此：

- 删掉 tag 或整个仓库后，镜像立刻不可再被拉取，但**磁盘空间不会释放**
- 只有 registry 自带的垃圾回收器会扫描所有 manifest 的引用关系，把**没有被任何 manifest 引用**的 blob 真正删掉

两者的分工要分清：**删除 API 负责安全（不碰共享数据），GC 负责省空间**。

## 为什么共享层不会被误删

镜像的 manifest 引用 config 与若干 layer，blob 按内容寻址（digest），
**同一个 blob 可以被多个镜像、甚至多个仓库同时引用**（相同基础层就是同一个 blob）。

GC 按引用关系判定：只要还有任何一个 manifest 引用某个 blob，该 blob 就会保留。
所以 GC 不会破坏其他镜像。**真正危险的是绕过 registry 直接删 `/var/lib/registry` 下的文件**——那才会
同时破坏所有引用该层的镜像，本文档的任何步骤都不要那么做。

## 什么时候不能跑 GC

distribution 官方要求 GC 期间 registry **只读或停机**运行。原因是并发写入的竞争：
一次 push 可能刚上传完 blob 但 manifest 尚未写入，此时 GC 会把它判为"无引用"并删除，导致镜像损坏。

本项目当前配置（`deploy/config.yaml`）**没有** 开启 `maintenance.readonly`，所以只能走**停机窗口**，
或者先给配置加上只读开关再走只读窗口。

## 本项目的部署形态

| 项 | 值 |
|----|----|
| registry 与 iDocker 后端 | **同一个容器**（见 `deploy/docker-entrypoint.sh`） |
| registry 启动方式 | `docker-registry serve /etc/docker/registry/config.yml &`（由 entrypoint 注入 `REGISTRY_HTTP_SECRET`，见下） |
| 配置文件 | 仓库内 `deploy/config.yaml` → 容器内 `/etc/docker/registry/config.yml` |
| 存储目录 | `/var/lib/registry`（compose 挂载到宿主，见 `docker-compose.yaml` / 生产 compose） |
| 删除能力 | `storage.delete.enabled: true`（manifest 删除 API 已启用） |

因为 registry 与 Web 后端同容器，**停止 registry 进程期间 `/v2` 全部不可用**（push/pull 都会失败）。

## 操作步骤（停机窗口）

以生产环境为例（生产 compose 目录见 `AGENTS.md` 的「线上运行位置」一节）：

1. **确认没有进行中的 push/pull**，并通知使用者维护窗口开始。
2. 进入容器：
   ```bash
   docker exec -it <容器名> sh
   ```
3. 停止 registry 进程（后端可继续跑，但 `/v2` 会不可用）：
   ```bash
   pkill -f "docker-registry serve"
   ```
4. 执行垃圾回收（`--dry-run` 先看将要删除什么，强烈建议先跑一次）：
   ```bash
   docker-registry garbage-collect --dry-run /etc/docker/registry/config.yml
   docker-registry garbage-collect /etc/docker/registry/config.yml
   ```
5. 重新启动 registry：
   ```bash
   REGISTRY_HTTP_SECRET="$(/usr/local/bin/registry-http-secret.sh)" \
     docker-registry serve /etc/docker/registry/config.yml &
   ```
   > 必须带上 `REGISTRY_HTTP_SECRET`：`deploy/config.yaml` 里**没有** `http.secret`，
   > 它由启动脚本解析（环境变量 → `<数据目录>/.registry_http_secret` → 生成并持久化）。
   > distribution 2.8 缺它只是警告，3.x 起会直接拒绝启动。
   > 上面这行取自持久化文件，与容器正常启动时用的是同一个值。

   然后确认 `/v2/` 可访问、能正常 pull 一个已知镜像。
6. 维护窗口结束，通知使用者。

> 若 `pkill` 后进程未退出，或重启后 registry 起不来，直接重启整个容器：
> `docker restart <容器名>`（会一并重启后端）。

## 风险清单

- **不可逆**：GC 删除的 blob 无法恢复，只能重新 push。
- **停机期间服务不可用**：`/v2` 全部请求失败。
- **耗时**：仓库越大越慢，期间保持 registry 停机。
- **`--dry-run` 只是预览**：不会删除任何东西，正式执行前务必先看一遍。
- **不要手工删文件**：见上文「为什么共享层不会被误删」。

## 什么时候该跑

- 回收站里做过「彻底删除镜像」之后（删掉的 manifest 已解除引用，但空间还没释放）
- 定期维护窗口
