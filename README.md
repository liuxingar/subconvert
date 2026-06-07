# SubBoost Local

一个根据 SubBoost 功能分析复刻的本地化配置生成与订阅管理工具。当前版本优先补齐普通用户侧流程：导入源、生成配置、模板库、帮助中心、本地登录、订阅链接托管和订阅管理。管理后台只保留访问骨架。

## 快速启动

```bash
docker compose up --build
```

打开：

```text
http://localhost:3000
```

默认本地用户登录：

```text
用户名：local
密码：local
```

默认管理员登录：

```text
账号：admin
密码：change-me
```

建议启动前在 `docker-compose.yml` 或 `.env` 中修改 `LOCAL_USER_PASSWORD` 和 `ADMIN_PASSWORD`。

## 已实现

- 三类导入源：订阅链接、YAML 配置、节点链接。
- 导入源新增、删除、排序、Tag 和节点命名模板。
- 订阅链接服务端抓取，带基础 SSRF 防护。
- YAML / Base64 / 常见节点链接解析。
- 模板选择：精简版、标准版、完整版。
- 模板库和模板广场展示，支持从模板页回到首页套用模板。
- 生成 Mihomo/Clash YAML。
- YAML 与可视化预览。
- 下载配置文件。
- 本地用户登录。
- 登录后生成持久订阅链接。
- `/sub/{token}` 输出订阅 YAML，优先使用预热缓存；缓存过期时会重新抓取订阅 URL 并刷新缓存。
- 后台定时任务：对开启自动更新的订阅按 `updateIntervalHours` 主动刷新。
- 主动预热刷新：应用启动后自动扫描到期订阅，生成并写入 `cached_yaml/cached_at`。
- 订阅管理页：列表、复制链接、删除、退出登录。
- FAQ / 使用指南 / Bug反馈分类和搜索。
- 服务条款。
- SQLite 自动建表与 seed。
- 管理员登录接口与后台访问受限骨架。

## 暂未完整实现

- OAuth 登录。
- AI 辅助配置。
- 自定义模板上传、审核、点赞和收藏。
- 完整管理后台 CRUD。

## 订阅链接使用流程

1. 进入 `/login`，勾选服务条款，使用本地用户登录。
2. 回到首页，填写导入源。
3. 如果导入源是订阅 URL，先点击“导入此源”。
4. 点击“生成配置”确认预览。
5. 点击“生成订阅链接”保存到 SQLite。
6. 进入 `/dashboard` 复制订阅链接，或直接访问 `/sub/{token}` 获取 YAML。

## 数据目录

SQLite 数据库默认存储在：

```text
./data/subboost.db
```

Docker Compose 会把本地 `./data` 挂载到容器内 `/app/data`。

## 定时刷新与预热

订阅创建或编辑后，当前生成的 YAML 会立即写入缓存。应用启动后会启动后台调度器，默认每 300 秒扫描一次 SQLite 中的订阅：

- 只有开启“自动更新”的订阅会进入后台刷新。
- 每条订阅按自身的 `updateIntervalHours` 判断是否到期，最小间隔为 1 小时。
- 到期后服务端会主动抓取原始订阅源、重新生成 YAML，并更新 `cached_yaml` 和 `cached_at`。
- 刷新失败会记录错误和最后尝试时间，避免一直高频重试；下一个更新周期会再次尝试。
- 客户端访问 `/sub/{token}` 时，如果缓存仍在有效期内，会直接返回缓存；如果缓存过期，则会同步刷新一次。

可通过环境变量调整：

```text
SUBBOOST_SCHEDULER_ENABLED=true
SUBBOOST_REFRESH_SCAN_SECONDS=300
SUBBOOST_REFRESH_ON_STARTUP=true
SUBBOOST_REFRESH_STARTUP_DELAY_SECONDS=5
```

## 本地测试说明

项目使用 Node 内置的 `node:sqlite`，不需要安装 Visual Studio Build Tools 来编译 SQLite native npm 模块。

推荐验证命令：

```bash
npm install
npm run typecheck
npm run build
docker compose up --build
```

Dockerfile 默认使用 `mcr.microsoft.com/devcontainers/javascript-node:22-bookworm`，避免在 Docker Hub 访问不稳定时卡在基础镜像拉取。

## GitHub Actions 自动构建

仓库已内置 `.github/workflows/build-and-publish.yml`：

- 推送到 `main` 分支时自动执行类型检查、Next.js 构建和 Docker 镜像构建。
- Pull Request 到 `main` 时执行类型检查和构建校验，但不发布镜像。
- 在 GitHub Actions 页面可以手动点击 `Run workflow` 触发一次构建。
- `main` 分支构建成功后会发布镜像到 GitHub Container Registry：

```text
ghcr.io/liuxingar/subconvert:latest
```

镜像发布后可用 `docker run` 本地启动：

```bash
docker run -d --name subboost-local \
  -p 3000:3000 \
  -v subboost-data:/app/data \
  -e ADMIN_PASSWORD=change-me \
  -e LOCAL_USER_PASSWORD=local \
  -e SUBBOOST_SCHEDULER_ENABLED=true \
  -e SUBBOOST_REFRESH_SCAN_SECONDS=300 \
  ghcr.io/liuxingar/subconvert:latest
```
