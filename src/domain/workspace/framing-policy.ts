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

// Chrome drops SameSite=Lax/Strict cookies from a WebSocket handshake when
// the frame sits under a chrome-extension:// page, while plain HTTP from the
// same frame keeps them. These hosts need that socket to stream, so the
// workspace copies the user's own cookie line onto it with a session rule.
export const websocketCookieHosts: readonly ["grok.com"] = ["grok.com"]

export type WebsocketCookieHost = (typeof websocketCookieHosts)[number]

export const websocketResourceTypes: readonly ["websocket"] = ["websocket"]

// A DNR rule only reaches a wss: handshake when the extension holds a wss:
// host permission; https://host/* does not cover it.
export const websocketHostPermissionPattern = <Host extends string>(
  host: Host,
): `wss://${Host}/*` => `wss://${host}/*`

export const websocketHostPermissionPatterns = websocketCookieHosts.map(
  websocketHostPermissionPattern,
)

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
