export const embeddableHosts: readonly [
  "chatgpt.com",
  "claude.ai",
  "gemini.google.com",
] = ["chatgpt.com", "claude.ai", "gemini.google.com"]

export type EmbeddableHost = (typeof embeddableHosts)[number]

export const framingHeaderNames: readonly [
  "X-Frame-Options",
  "Content-Security-Policy",
] = ["X-Frame-Options", "Content-Security-Policy"]

export const framingResourceTypes: readonly ["sub_frame"] = ["sub_frame"]

export const framingRuleLifetime = "workspace-tab-session"

export const hostPermissionPattern = (
  host: EmbeddableHost,
): `https://${EmbeddableHost}/*` => `https://${host}/*`

export const hostPermissionPatterns = embeddableHosts.map(hostPermissionPattern)

// Match patterns are for host_permissions. DNR urlFilter is a different
// language; `||host/` is the domain anchor Chrome accepts.
export const dnrUrlFilter = (
  host: EmbeddableHost,
): `||${EmbeddableHost}/` => `||${host}/`

export const dnrUrlFilters = embeddableHosts.map(dnrUrlFilter)
