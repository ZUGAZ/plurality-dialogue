import type { ProviderId } from "@domain/provider/provider-id"

export type ProviderToggleRow = {
  readonly id: ProviderId
  readonly label: string
  readonly isEnabled: boolean
  readonly isLastEnabled: boolean
}

export type ProviderToggleSource = {
  readonly id: ProviderId
  readonly displayName: string
}

export const loadSettingsErrorText = "Could not load settings."
export const saveSettingsErrorText = "Could not save."

export const toToggleRows = (
  providers: readonly ProviderToggleSource[],
  enabledIds: readonly ProviderId[],
): readonly ProviderToggleRow[] => {
  const enabled = new Set(enabledIds)
  const enabledCount = providers.filter((provider) =>
    enabled.has(provider.id),
  ).length
  return providers.map((provider) => {
    const isEnabled = enabled.has(provider.id)
    return {
      id: provider.id,
      label: provider.displayName,
      isEnabled,
      isLastEnabled: isEnabled && enabledCount === 1,
    }
  })
}
