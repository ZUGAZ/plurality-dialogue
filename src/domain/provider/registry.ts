import { Array, Data, Effect, type Option } from "effect"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "../settings/workspace-settings-storage"
import { builtInProviders } from "./built-in-providers"
import type { Provider, ProviderDefinition } from "./provider"
import { isProviderId, providerIds, type ProviderId } from "./provider-id"

export class LastProviderDisabled extends Data.TaggedError(
  "LastProviderDisabled",
)<{
  readonly providerId: ProviderId
}> {}

const enabledMembership = (
  enabledProviders: readonly ProviderId[],
): ReadonlySet<ProviderId> => new Set(enabledProviders.filter(isProviderId))

const uniqueCatalogEnabledIds = (
  enabledProviders: readonly ProviderId[],
  id: ProviderId,
  enabled: boolean,
): readonly ProviderId[] => {
  const membership = new Set(enabledMembership(enabledProviders))
  if (enabled) {
    membership.add(id)
  } else {
    membership.delete(id)
  }
  return providerIds.filter((providerId) => membership.has(providerId))
}

export const listProviders = Effect.fn("listProviders")(function* () {
  const settings = yield* loadWorkspaceSettings()
  const enabledSet = enabledMembership(settings.enabledProviders)
  return builtInProviders.map(
    (definition): Provider => ({
      ...definition,
      enabled: enabledSet.has(definition.id),
    }),
  )
})

export const listEnabledProviders = Effect.fn("listEnabledProviders")(
  function* () {
    const providers = yield* listProviders()
    return providers.filter((provider) => provider.enabled)
  },
)

export const getProvider = Effect.fn("getProvider")(function* (id: ProviderId) {
  const providers = yield* listProviders()
  return Array.findFirst(providers, (provider) => provider.id === id)
})

export const getBuiltInProvider = (
  id: ProviderId,
): Option.Option<ProviderDefinition> =>
  Array.findFirst(builtInProviders, (provider) => provider.id === id)

export const setProviderEnabled = Effect.fn("setProviderEnabled")(
  function* (id: ProviderId, enabled: boolean) {
    const settings = yield* loadWorkspaceSettings()
    const next = uniqueCatalogEnabledIds(
      settings.enabledProviders,
      id,
      enabled,
    )
    if (!enabled && next.length === 0) {
      return yield* Effect.fail(new LastProviderDisabled({ providerId: id }))
    }
    yield* persistWorkspaceSettings({
      ...settings,
      enabledProviders: next,
    })
    return next
  },
)
