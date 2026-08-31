import type { EmbeddableHost } from "@domain/workspace/framing-policy"
import type { ProviderId } from "./provider-id"

export type ProviderDefinition = {
  readonly id: ProviderId
  readonly displayName: string
  readonly host: EmbeddableHost
  readonly url: string
  readonly iconId: ProviderId
}

export type Provider = ProviderDefinition & {
  readonly enabled: boolean
}
