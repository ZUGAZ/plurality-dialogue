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
