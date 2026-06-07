import type { Article } from "@/lib/types";

export const articles: Article[] = [
  {
    id: "faq-what",
    title: "SubBoost 是什么？",
    category: "faq",
    order: 0,
    content:
      "[SubBoost](https://subboost.org/) 是一个在线 **Clash 订阅转换和管理** 服务。可以将机场订阅或自建节点转换为优化、统一的 Clash 订阅，并自动更新。通过 UI 可视化，一键实现 **链式代理、精确分流和多订阅聚合** 等高级功能。\n\nBug 反馈邮箱：`admin@subboost.org`\n\n# 更新日志\n\n## 20260504\n\n- 增加预设规则集的调整功能：支持移动、移除和恢复预设规则集。\n- 优化自定义规则功能区 UI。\n- 增强节点解析和配置生成兼容性，优化 Reality / Vision、ECH、WireGuard、SSH 等参数保留和 Mihomo 规范清理。"
  },
  {
    id: "faq-security",
    title: "我的数据安全吗？",
    category: "faq",
    order: 100,
    content:
      "游客模式下，配置主要在浏览器本地处理。导入订阅 URL 时，服务器只负责抓取和解析，不持久保存明文 URL。\n\n登录后生成订阅链接时，需要将配置加密保存到服务器，建议使用 AES-256-GCM。"
  },
  {
    id: "faq-formats",
    title: "支持哪些订阅格式？",
    category: "faq",
    order: 200,
    content:
      "支持 Base64 编码订阅、Clash YAML 配置文件、单个节点链接，例如 `ss://`、`vmess://`、`vless://`、`trojan://`、`hysteria2://`、`tuic://` 等。私有加密格式暂不支持。"
  },
  {
    id: "faq-link-vs-download",
    title: "订阅链接和下载配置有什么区别？",
    category: "faq",
    order: 300,
    content:
      "**下载配置** 是一次性生成静态 YAML 文件。\n\n**订阅链接** 是登录后托管在服务器上的 URL，客户端每次拉取时获取最新配置，适合自动更新。"
  },
  {
    id: "faq-login",
    title: "为什么需要登录？",
    category: "faq",
    order: 400,
    content:
      "如果只需要下载配置文件，则无需登录。登录后可以生成订阅链接、管理多份配置、保存和分享自定义模板、使用 AI 辅助配置。"
  },
  {
    id: "faq-ai",
    title: "AI 助手怎么使用？",
    category: "faq",
    order: 600,
    content:
      "AI 助手可以通过自然语言修改配置。请求应直接从浏览器发送到用户自己的 OpenAI 兼容 API，服务端不保存 API Key。"
  },
  {
    id: "faq-import",
    title: "为什么我导入订阅 / 节点失败，或者生成出来的配置还是空的？",
    category: "faq",
    order: 700,
    content:
      "请确认点击了每个输入框旁边的“导入此源”按钮，并看到“已导入 X 节点”。部分机场订阅可能限制 CN IP 或采用特殊格式，建议先在浏览器中打开订阅 URL 检查是否能获得内容。"
  },
  {
    id: "faq-chain",
    title: "怎么判断链式代理是否生效？为什么链式代理不生效？",
    category: "faq",
    order: 800,
    content:
      "链式代理需要同时选择线路节点和落地节点。生成配置中应出现中转代理组。如果订阅更新后节点名变化，需要重新绑定。"
  },
  {
    id: "faq-dns",
    title: "什么是 DNS 泄露？",
    category: "faq",
    order: 900,
    content:
      "访问需要代理的网站时，如果 DNS 查询没有从代理节点发出，而是从本地网络发出，就可能发生 DNS 泄露。建议开启 TUN、关闭本地 DNS 覆写、必要时关闭 IPv6。"
  },
  {
    id: "faq-port",
    title: "监听端口是是什么？",
    category: "faq",
    order: 1100,
    content:
      "监听端口可将任意协议节点通过本地 socks5/http 端口暴露给本地应用。请确保设备处于受信任网络，避免端口暴露到公网。"
  },
  {
    id: "guide-quick-start",
    title: "快速生成一份 Clash/Mihomo 配置",
    category: "guide",
    order: 100,
    content:
      "1. 在首页选择导入源类型。\n2. 如果是订阅链接，先填写 URL 并点击“导入此源”。如果是 YAML 或节点链接，直接粘贴内容即可。\n3. 按需设置 Tag 和节点命名模板，例如 `[{tag}]{name}`。\n4. 选择精简版、标准版或完整版模板。\n5. 点击“生成配置”，确认预览无误后下载 YAML。"
  },
  {
    id: "guide-subscription-link",
    title: "如何创建可自动更新的订阅链接",
    category: "guide",
    order: 200,
    content:
      "订阅链接需要登录后使用。\n\n1. 进入登录页，勾选服务条款，使用本地用户登录。\n2. 回到首页导入订阅源并生成配置。\n3. 点击“生成订阅链接”，系统会把当前模板、导入源和配置选项保存到 SQLite。\n4. 客户端访问 `/sub/{token}` 时，服务端会重新抓取订阅 URL 并即时生成最新 YAML。"
  },
  {
    id: "guide-dashboard",
    title: "如何管理已保存订阅",
    category: "guide",
    order: 300,
    content:
      "登录后进入“订阅”页面，可以查看已保存的订阅链接、复制完整 URL、打开生成后的 YAML，或删除不再使用的订阅。删除只影响本地 SQLite 中的记录，不会修改原始机场订阅。"
  },
  {
    id: "bug-report",
    title: "如何反馈解析或生成异常",
    category: "bug",
    order: 100,
    content:
      "反馈问题时建议提供：订阅源类型、错误提示、生成前的节点数量、期望客户端类型，以及脱敏后的最小复现样例。不要公开真实订阅 Token、密码、UUID 或私钥。"
  },
  {
    id: "bug-known-limits",
    title: "当前本地版已知限制",
    category: "bug",
    order: 200,
    content:
      "本地版优先复刻普通用户侧流程。OAuth、AI 配置助手、模板发布审核、完整管理后台和定时任务暂未完整实现。部分私有订阅格式或强绑定客户端请求头的订阅可能无法解析。"
  }
];
