export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <article className="panel rounded-2xl p-6 leading-7 text-white/75">
        <h1 className="mb-2 text-3xl font-bold text-white">服务条款</h1>
        <p className="mb-6 text-white/45">最后更新：2026年5月28日</p>
        <h2 className="mt-6 text-xl font-semibold text-white">1. 服务概述</h2>
        <p>SubBoost Local 是一个在线 Clash 订阅转换、生成与管理服务。本工具提供订阅内容解析、配置文件生成、模板管理等功能。</p>
        <h2 className="mt-6 text-xl font-semibold text-white">2. 数据处理与隐私</h2>
        <p>游客模式下，节点信息和配置选项主要存储在浏览器本地。导入订阅 URL 时，URL 会发送到本地部署的服务器进行解析，解析后的内容返回浏览器。</p>
        <p>如果后续启用订阅链接托管功能，应对订阅 URL、解析后的节点信息和配置选项进行 AES-256-GCM 加密存储。</p>
        <h2 className="mt-6 text-xl font-semibold text-white">3. 用户责任</h2>
        <p>你应确保使用本工具符合当地法律法规，不应上传或分享未经授权的订阅内容。</p>
        <h2 className="mt-6 text-xl font-semibold text-white">4. 免责声明</h2>
        <p>本项目仅用于学习与技术交流，不提供任何代理服务，不提供节点/订阅服务，不对第三方订阅内容的可用性与合法性作出保证。</p>
      </article>
    </div>
  );
}
