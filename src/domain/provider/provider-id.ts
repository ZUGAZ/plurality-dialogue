import { Schema } from "effect"

export const ProviderId = Schema.Literal(
  "chatgpt",
  "claude",
  "gemini",
  "grok",
)

export type ProviderId = typeof ProviderId.Type

export const isProviderId = Schema.is(ProviderId)

export const providerIds: readonly ProviderId[] = [
  "chatgpt",
  "claude",
  "gemini",
  "grok",
]
