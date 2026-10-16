import type {
  EmbeddableHost,
  OptionalHost,
} from "@domain/workspace/framing-policy"
import type { ProviderId } from "./provider-id"

export type ProviderDefinition = {
  readonly id: ProviderId
  readonly displayName: string
  readonly host: EmbeddableHost | OptionalHost
  readonly url: string
  readonly iconId: ProviderId
}

export type Provider = ProviderDefinition & {
  readonly enabled: boolean
}
