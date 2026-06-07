# SubBoost Local 功能覆盖对照

## 覆盖状态

| 功能模块 | 子功能 | 当前状态 | 对应实现 |
| --- | --- | --- | --- |
| 全局框架 | Header / Footer / 移动端导航 | 已覆盖 | `src/app/layout.tsx` |
| 全局框架 | 版本接口 | 已覆盖 | `src/app/api/app-version/route.ts` |
| 首页配置生成器 | 快捷模式 | 已覆盖 | `src/components/ConfigBuilder.tsx` |
| 首页配置生成器 | 高级源编辑 | 已覆盖 | 支持 Tag / 命名模板 / 源内容编辑 |
| 首页配置生成器 | 高级 YAML 模式 | 已覆盖 | textarea 内容可生成预览、下载，并可保存为订阅链接 |
| 导入源 | 订阅 URL | 已覆盖 | `src/app/api/fetch-subscription/route.ts` |
| 导入源 | YAML 配置 | 已覆盖 | `src/lib/parser.ts` |
| 导入源 | 节点链接 | 已覆盖 | `src/lib/parser.ts` |
| 节点处理 | Base64 订阅解析 | 已覆盖 | `src/lib/parser.ts` |
| 节点处理 | 常见协议解析 | 部分覆盖 | 已覆盖 ss / vmess / vless / trojan / hysteria2 / tuic 等常见协议，私有格式未覆盖 |
| 模板 | 内置模板 | 已覆盖 | `src/data/templates.ts` |
| 模板 | 模板库 / 模板广场 | 已覆盖 | `src/app/templates/page.tsx` |
| 模板 | 从模板页套用模板 | 已覆盖 | 首页支持 `?template=` |
| 配置输出 | YAML 生成 | 已覆盖 | `src/lib/generator.ts` |
| 配置输出 | 可视化预览 | 已覆盖 | `src/components/ConfigBuilder.tsx` |
| 配置输出 | 下载配置 | 已覆盖 | `src/components/ConfigBuilder.tsx` |
| 订阅托管 | 登录后生成订阅链接 | 已覆盖 | `src/app/api/subscription/route.ts` |
| 订阅托管 | `/sub/{token}` 动态输出 YAML | 已覆盖 | `src/app/sub/[token]/route.ts` |
| 订阅托管 | 请求时刷新原始订阅 URL | 已覆盖 | `src/lib/subscriptionService.ts` |
| 订阅管理 | 列表 / 复制 / 删除 | 已覆盖 | `src/app/dashboard/page.tsx`, `src/components/DashboardClient.tsx` |
| 登录 | 本地用户登录 | 已覆盖 | `src/app/api/auth/local-login/route.ts` |
| 登录 | 退出登录 | 已覆盖 | `src/app/api/auth/logout/route.ts` |
| 登录 | OAuth 登录 | 未覆盖 | 保留登录按钮展示，未接入 OAuth Provider |
| FAQ / 帮助 | FAQ 搜索 | 已覆盖 | `src/components/FaqClient.tsx` |
| FAQ / 帮助 | 常见问题 / 使用指南 / Bug反馈分类 | 已覆盖 | `src/data/articles.ts` |
| 服务条款 | 条款页面 | 已覆盖 | `src/app/terms/page.tsx` |
| 数据存储 | SQLite 自动建表与 seed | 已覆盖 | `src/lib/db.ts` |
| 安全 | SSRF 基础防护 | 已覆盖 | `src/lib/safeFetch.ts` |
| AI 助手 | 自然语言配置修改 | 未覆盖 | 非本轮优先级 |
| 管理后台 | 后台 CRUD | 暂缓 | 用户要求管理后台先不管 |

## 本轮补齐点

- 订阅 URL 源需要先导入，生成配置时使用已解析内容。
- 登录用户可以保存订阅链接，并在 `/dashboard` 管理。
- `/sub/{token}` 支持动态输出 YAML。
- 帮助中心补齐使用指南和 Bug反馈分类内容。
- 移动端底部导航修正为 4 列。
- 增加本地用户登出能力。
