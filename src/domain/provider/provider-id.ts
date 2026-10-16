import { Schema } from "effect"

export const ProviderId = Schema.Literal(
  "chatgpt",
  "claude",
  "gemini",
  "grok",
  "deepseek",
  "kimi",
  "doubao",
  "google",
  "qwen-china",
  "qwen-global",
  "zhipu",
  "zai",
)

export type ProviderId = typeof ProviderId.Type

export const isProviderId = Schema.is(ProviderId)

export const providerIds: readonly ProviderId[] = [
  "chatgpt",
  "claude",
  "gemini",
  "grok",
  "deepseek",
  "kimi",
  "doubao",
  "google",
  "qwen-china",
  "qwen-global",
  "zhipu",
  "zai",
]

export const optionalProviderIds: readonly ProviderId[] = [
  "qwen-china",
  "qwen-global",
  "zhipu",
  "zai",
]

const optionalProviderIdSet: ReadonlySet<ProviderId> = new Set(
  optionalProviderIds,
)

export const isOptionalProviderId = (id: ProviderId): boolean =>
  optionalProviderIdSet.has(id)
