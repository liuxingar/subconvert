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
- `/sub/{token}` 动态输出订阅 YAML，并在请求时重新抓取订阅 URL。
- 订阅管理页：列表、复制链接、删除、退出登录。
- FAQ / 使用指南 / Bug反馈分类和搜索。
- 服务条款。
- SQLite 自动建表与 seed。
- 管理员登录接口与后台访问受限骨架。

## 暂未完整实现

- OAuth 登录。
- AI 辅助配置。
- 定时任务和主动预热刷新。
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
