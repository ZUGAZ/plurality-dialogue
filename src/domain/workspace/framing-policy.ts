export const embeddableHosts: readonly [
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "grok.com",
  "chat.deepseek.com",
  "www.kimi.com",
  "www.doubao.com",
  "www.google.com",
] = [
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
  "grok.com",
  "chat.deepseek.com",
  "www.kimi.com",
  "www.doubao.com",
  "www.google.com",
]

export type EmbeddableHost = (typeof embeddableHosts)[number]

export const optionalHosts: readonly [
  "www.qianwen.com",
  "chat.qwen.ai",
  "chatglm.cn",
  "chat.z.ai",
] = ["www.qianwen.com", "chat.qwen.ai", "chatglm.cn", "chat.z.ai"]

export type OptionalHost = (typeof optionalHosts)[number]

export const framingHeaderNames: readonly [
  "X-Frame-Options",
  "Content-Security-Policy",
] = ["X-Frame-Options", "Content-Security-Policy"]

export const framingResourceTypes: readonly ["sub_frame"] = ["sub_frame"]

export const framingRuleLifetime = "workspace-tab-session"

export const hostPermissionPattern = <Host extends string>(
  host: Host,
): `https://${Host}/*` => `https://${host}/*`

export const hostPermissionPatterns = embeddableHosts.map(hostPermissionPattern)

export const optionalHostPermissionPatterns = optionalHosts.map(
  hostPermissionPattern,
)

// Match patterns are for host_permissions. DNR urlFilter is a different
// language; `||host/` is the domain anchor Chrome accepts.
export const dnrUrlFilter = <Host extends string>(
  host: Host,
): `||${Host}/` => `||${host}/`

export const dnrUrlFilters = embeddableHosts.map(dnrUrlFilter)

export const optionalDnrUrlFilters = optionalHosts.map(dnrUrlFilter)
